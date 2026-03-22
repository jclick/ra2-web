/**
 * 资源管理器 (完整版 - 大文件优化)
 * 负责加载和管理所有游戏资源
 * 针对大MIX文件优化：使用Blob切片而非完整加载
 */

import { MixParser, MixFileInfo, MixEntry } from '../../data/parser/MixParser'
import { ShpParser, ShpFileInfo } from '../../data/parser/ShpParser'
import { IniParser } from '../../data/parser/IniParser'

/**
 * 资源类型
 */
export enum ResourceType {
  MIX = 'mix',
  SHP = 'shp',
  VXL = 'vxl',
  HVA = 'hva',
  TMP = 'tmp',
  PCX = 'pcx',
  WAV = 'wav',
  INI = 'ini',
  MAP = 'map',
  PALETTE = 'pal',
  UNKNOWN = 'unknown',
}

/**
 * 游戏资源
 */
export interface GameResource {
  id: string
  name: string
  type: ResourceType
  data: any
  rawData?: Uint8Array
}

/**
 * MIX 文件容器 (大文件优化版)
 * 保存File引用和索引信息，按需读取内容
 */
export interface MixContainer {
  name: string
  info: MixFileInfo
  file: File  // 保存File引用，使用slice按需读取
  entries: Map<number, MixEntry>  // ID -> Entry 映射
}

/**
 * 资源管理器
 */
export class ResourceManager {
  private resources: Map<string, GameResource> = new Map()
  private mixFiles: Map<string, MixContainer> = new Map()
  private shpCache: Map<string, ShpFileInfo> = new Map()
  private paletteCache: Map<string, Uint8Array> = new Map()
  private loadingCallbacks: ((progress: number, text: string) => void)[] = []

  /**
   * 导入文件
   */
  async importFile(file: File): Promise<void> {
    const ext = this.getExtension(file.name).toLowerCase()
    
    switch (ext) {
      case 'mix':
        await this.importMixFile(file)
        break
      case 'shp':
        await this.importShpFile(file)
        break
      case 'pal':
        await this.importPaletteFile(file)
        break
      case 'ini':
        await this.importIniFile(file)
        break
      case 'map':
        await this.importMapFile(file)
        break
      default:
        // 普通文件 - 限制大小
        if (file.size > 10 * 1024 * 1024) { // 10MB
          console.warn(`文件过大，跳过: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`)
          return
        }
        const data = await this.readFileAsArrayBuffer(file)
        this.resources.set(file.name, {
          id: file.name,
          name: file.name,
          type: ResourceType.UNKNOWN,
          data,
          rawData: data,
        })
    }
  }

  /**
   * 读取文件为 ArrayBuffer (带大小限制)
   */
  private async readFileAsArrayBuffer(file: File, maxSize = 50 * 1024 * 1024): Promise<Uint8Array> {
    if (file.size > maxSize) {
      throw new Error(`文件过大: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB > ${maxSize/1024/1024}MB)`)
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 读取文件的指定范围 (用于大文件按需读取)
   */
  private async readFileSlice(file: File, start: number, end: number): Promise<Uint8Array> {
    const slice = file.slice(start, end)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(slice)
    })
  }

  /**
   * 导入 MIX 文件 (大文件优化版)
   * 只读取文件头解析索引，不加载整个文件内容
   */
  private async importMixFile(file: File): Promise<void> {
    this.notifyLoading(0, `正在解析 ${file.name}...`)
    
    try {
      // 步骤1: 读取文件头 (前16字节判断格式)
      const headerData = await this.readFileSlice(file, 0, 16)
      
      // 步骤2: 解析文件头获取入口数量
      const view = new DataView(headerData.buffer)
      const firstWord = view.getUint32(0, true)
      
      const MIX_FLAG_CHECKSUM = 0x00010000
      let entryCount: number
      let headerSize: number
      
      if (firstWord & MIX_FLAG_CHECKSUM) {
        // TS 格式: flags(4) + datasize(4) + entries...
        entryCount = firstWord & 0xFFFF
        headerSize = 8 + entryCount * 12  // 8字节头 + 每个entry 12字节
      } else {
        // 经典格式: count(4) + datasize(4) + entries...
        entryCount = firstWord
        headerSize = 8 + entryCount * 12
      }
      
      // 步骤3: 读取完整的索引表
      const indexData = await this.readFileSlice(file, 0, headerSize)
      
      // 步骤4: 解析索引
      const parser = new MixParser(indexData)
      const info = parser.parse()
      
      // 步骤5: 构建ID->Entry映射
      const entries = new Map<number, MixEntry>()
      for (const entry of info.entries) {
        entries.set(entry.id, entry)
      }
      
      // 步骤6: 保存容器（只保存File引用和索引，不保存文件内容）
      const container: MixContainer = {
        name: file.name,
        info,
        file,  // 保存File对象，后续用slice读取
        entries,
      }
      
      this.mixFiles.set(file.name, container)
      
      // 步骤7: 选择性预加载小文件（可选）
      await this.preloadSmallShpFiles(container)
      
      this.notifyLoading(100, `${file.name} 解析完成，包含 ${info.entryCount} 个文件`)
      
    } catch (error) {
      console.error(`解析 MIX 文件失败: ${file.name}`, error)
      throw error
    }
  }

  /**
   * 预加载小的SHP文件（<100KB）
   */
  private async preloadSmallShpFiles(container: MixContainer): Promise<void> {
    const maxShpToLoad = 50 // 最多预加载50个
    let loadedCount = 0
    
    for (const [id, entry] of container.entries) {
      // 只预加载小的SHP文件
      if (entry.size > 100 * 1024) continue
      if (loadedCount >= maxShpToLoad) break
      
      try {
        const data = await this.readFileSlice(container.file, entry.offset, entry.offset + entry.size)
        
        if (this.isShpFile(data)) {
          const shpParser = new ShpParser(data)
          const shpInfo = shpParser.parse()
          this.shpCache.set(`${container.name}:${id.toString(16)}`, shpInfo)
          loadedCount++
        }
      } catch (e) {
        // 忽略解析失败的文件
      }
    }
    
    if (loadedCount > 0) {
      console.log(`预加载了 ${loadedCount} 个SHP文件`)
    }
  }

  /**
   * 从MIX容器中按需提取文件
   */
  async extractFromMix(mixName: string, fileId: number): Promise<Uint8Array | null> {
    const container = this.mixFiles.get(mixName)
    if (!container) return null
    
    const entry = container.entries.get(fileId)
    if (!entry) return null
    
    try {
      return await this.readFileSlice(container.file, entry.offset, entry.offset + entry.size)
    } catch (e) {
      console.error(`提取文件失败: ${mixName}:${fileId.toString(16)}`, e)
      return null
    }
  }

  /**
   * 导入 SHP 文件
   */
  private async importShpFile(file: File): Promise<void> {
    try {
      const data = await this.readFileAsArrayBuffer(file, 10 * 1024 * 1024) // 10MB限制
      const parser = new ShpParser(data)
      const info = parser.parse()
      this.shpCache.set(file.name, info)
      
      this.resources.set(file.name, {
        id: file.name,
        name: file.name,
        type: ResourceType.SHP,
        data: info,
        rawData: data,
      })
    } catch (e) {
      console.error(`解析 SHP 文件失败: ${file.name}`, e)
    }
  }

  /**
   * 导入调色板文件
   */
  private async importPaletteFile(file: File): Promise<void> {
    try {
      const data = await this.readFileAsArrayBuffer(file, 1024) // PAL文件很小
      
      // PAL 文件: 768 字节 = 256 色 * 3 (RGB)
      if (data.length === 768) {
        this.paletteCache.set(file.name, data)
        
        this.resources.set(file.name, {
          id: file.name,
          name: file.name,
          type: ResourceType.PALETTE,
          data,
          rawData: data,
        })
      }
    } catch (e) {
      console.error(`导入调色板失败: ${file.name}`, e)
    }
  }

  /**
   * 导入 INI 文件
   */
  private async importIniFile(file: File): Promise<void> {
    try {
      const data = await this.readFileAsArrayBuffer(file, 5 * 1024 * 1024) // 5MB限制
      const text = new TextDecoder().decode(data)
      // 解析INI数据
      const iniData = IniParser.parse(text)
      
      this.resources.set(file.name, {
        id: file.name,
        name: file.name,
        type: ResourceType.INI,
        data: iniData,
        rawData: data,
      })
    } catch (e) {
      console.error(`导入INI失败: ${file.name}`, e)
    }
  }

  /**
   * 导入地图文件
   */
  private async importMapFile(file: File): Promise<void> {
    try {
      const data = await this.readFileAsArrayBuffer(file)
      this.resources.set(file.name, {
        id: file.name,
        name: file.name,
        type: ResourceType.MAP,
        data,
        rawData: data,
      })
    } catch (e) {
      console.error(`导入地图失败: ${file.name}`, e)
    }
  }

  /**
   * 检查是否是 SHP 文件
   */
  private isShpFile(data: Uint8Array): boolean {
    if (data.length < 8) return false
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    const zero = view.getUint16(0, true)
    return zero === 0
  }

  /**
   * 获取 SHP 文件
   */
  getShp(name: string): ShpFileInfo | undefined {
    return this.shpCache.get(name)
  }

  /**
   * 从 MIX 文件中获取 SHP (支持按需加载)
   */
  async getShpFromMix(mixName: string, fileId: number): Promise<ShpFileInfo | undefined> {
    const cacheKey = `${mixName}:${fileId.toString(16)}`
    
    // 检查缓存
    if (this.shpCache.has(cacheKey)) {
      return this.shpCache.get(cacheKey)
    }
    
    // 按需从MIX加载
    const data = await this.extractFromMix(mixName, fileId)
    if (!data || !this.isShpFile(data)) return undefined
    
    try {
      const parser = new ShpParser(data)
      const info = parser.parse()
      this.shpCache.set(cacheKey, info)
      return info
    } catch (e) {
      console.error(`解析SHP失败: ${cacheKey}`, e)
      return undefined
    }
  }

  /**
   * 获取调色板
   */
  getPalette(name: string): Uint8Array | undefined {
    return this.paletteCache.get(name)
  }

  /**
   * 获取资源
   */
  getResource(id: string): GameResource | undefined {
    return this.resources.get(id)
  }

  /**
   * 获取所有资源
   */
  getAllResources(): GameResource[] {
    return Array.from(this.resources.values())
  }

  /**
   * 获取所有 MIX 文件
   */
  getAllMixFiles(): MixContainer[] {
    return Array.from(this.mixFiles.values())
  }

  /**
   * 获取 MIX 文件信息
   */
  getMixInfo(name: string): MixFileInfo | undefined {
    return this.mixFiles.get(name)?.info
  }

  /**
   * 清除所有资源
   */
  clear(): void {
    this.resources.clear()
    this.mixFiles.clear()
    this.shpCache.clear()
    this.paletteCache.clear()
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.')
    return dot >= 0 ? filename.slice(dot + 1) : ''
  }

  /**
   * 注册加载回调
   */
  onLoading(callback: (progress: number, text: string) => void): void {
    this.loadingCallbacks.push(callback)
  }

  /**
   * 通知加载进度
   */
  private notifyLoading(progress: number, text: string): void {
    for (const callback of this.loadingCallbacks) {
      callback(progress, text)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    resources: number
    mixFiles: number
    shpFiles: number
    palettes: number
  } {
    return {
      resources: this.resources.size,
      mixFiles: this.mixFiles.size,
      shpFiles: this.shpCache.size,
      palettes: this.paletteCache.size,
    }
  }
}

export default ResourceManager
