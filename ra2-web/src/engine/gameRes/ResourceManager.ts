/**
 * 资源管理器 (完整版)
 * 负责加载和管理所有游戏资源
 */

import { MixParser, MixFileInfo } from '../../data/parser/MixParser'
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
 * MIX 文件容器 (内存优化版)
 * 不缓存所有文件，只保存原始数据和解析器
 */
export interface MixContainer {
  name: string
  info: MixFileInfo
  data: Uint8Array
  parser: MixParser
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
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    
    const ext = this.getExtension(file.name).toLowerCase()
    
    switch (ext) {
      case 'mix':
        await this.importMixFile(file.name, data)
        break
      case 'shp':
        await this.importShpFile(file.name, data)
        break
      case 'pal':
        this.importPaletteFile(file.name, data)
        break
      case 'ini':
        this.importIniFile(file.name, data)
        break
      case 'map':
        this.importMapFile(file.name, data)
        break
      default:
        // 普通文件
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
   * 导入 MIX 文件 (内存优化版)
   * 只解析索引，不一次性提取所有文件
   */
  private async importMixFile(name: string, data: Uint8Array): Promise<void> {
    this.notifyLoading(0, `正在解析 ${name}...`)

    const parser = new MixParser(data)
    const info = parser.parse()

    // 保存容器 (只保存解析器，不提取所有文件)
    const container: MixContainer = {
      name,
      info,
      data,
      parser,
    }

    this.mixFiles.set(name, container)

    // 只提取并解析SHP文件（通常较小且需要预解析）
    // 限制处理的文件数量，避免大文件导致内存问题
    const maxShpToProcess = 100 // 最多处理100个SHP文件
    let processedShpCount = 0

    for (const entry of info.entries) {
      // 只处理小文件（< 500KB），避免大文件导致内存问题
      if (entry.size > 500 * 1024) continue

      // 按需提取文件
      const fileData = parser.extractFile(entry)
      if (!fileData) continue

      // 检查是否是 SHP 文件
      if (this.isShpFile(fileData)) {
        try {
          const shpParser = new ShpParser(fileData)
          const shpInfo = shpParser.parse()
          this.shpCache.set(`${name}:${entry.id.toString(16)}`, shpInfo)
          processedShpCount++

          if (processedShpCount >= maxShpToProcess) {
            console.warn(`${name}: 已达到SHP处理上限(${maxShpToProcess})，跳过剩余文件`)
            break
          }
        } catch (e) {
          // 不是有效的 SHP 文件，忽略
        }
      }

      // 每处理10个文件更新一次进度
      if (processedShpCount % 10 === 0) {
        const progress = Math.min((processedShpCount / Math.min(info.entryCount, maxShpToProcess)) * 100, 100)
        this.notifyLoading(progress, `${name}: 已处理 ${processedShpCount} 个文件...`)
      }
    }

    this.notifyLoading(100, `${name} 解析完成，包含 ${info.entryCount} 个文件，已缓存 ${processedShpCount} 个SHP`)
  }

  /**
   * 导入 SHP 文件
   */
  private async importShpFile(name: string, data: Uint8Array): Promise<void> {
    try {
      const parser = new ShpParser(data)
      const info = parser.parse()
      this.shpCache.set(name, info)
      
      this.resources.set(name, {
        id: name,
        name,
        type: ResourceType.SHP,
        data: info,
        rawData: data,
      })
    } catch (e) {
      console.error(`解析 SHP 文件失败: ${name}`, e)
    }
  }

  /**
   * 导入调色板文件
   */
  private importPaletteFile(name: string, data: Uint8Array): void {
    // PAL 文件: 768 字节 = 256 色 * 3 (RGB)
    if (data.length === 768) {
      this.paletteCache.set(name, data)
      
      this.resources.set(name, {
        id: name,
        name,
        type: ResourceType.PALETTE,
        data,
        rawData: data,
      })
    }
  }

  /**
   * 导入 INI 文件
   */
  private importIniFile(name: string, data: Uint8Array): void {
    const text = new TextDecoder().decode(data)
    // 解析INI数据
    const iniData = IniParser.parse(text)
    
    this.resources.set(name, {
      id: name,
      name,
      type: ResourceType.INI,
      data: iniData,  // 存储解析后的数据
      rawData: data,
    })
  }

  /**
   * 导入地图文件
   */
  private importMapFile(name: string, data: Uint8Array): void {
    this.resources.set(name, {
      id: name,
      name,
      type: ResourceType.MAP,
      data,
      rawData: data,
    })
  }

  /**
   * 检查是否是 SHP 文件
   */
  private isShpFile(data: Uint8Array): boolean {
    if (data.length < 8) return false
    // 检查文件头
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
   * 从 MIX 文件中获取 SHP
   */
  getShpFromMix(mixName: string, fileId: number): ShpFileInfo | undefined {
    return this.shpCache.get(`${mixName}:${fileId.toString(16)}`)
  }

  /**
   * 从 MIX 容器中按需提取文件 (内存优化)
   * @param mixName MIX文件名
   * @param fileId 文件ID
   * @returns 文件数据或null
   */
  extractFromMix(mixName: string, fileId: number): Uint8Array | null {
    const container = this.mixFiles.get(mixName)
    if (!container) return null
    return container.parser.extractById(fileId)
  }

  /**
   * 从 MIX 容器中按名称提取文件
   * @param mixName MIX文件名
   * @param fileName 文件名
   * @returns 文件数据或null
   */
  extractFromMixByName(mixName: string, fileName: string): Uint8Array | null {
    const container = this.mixFiles.get(mixName)
    if (!container) return null
    return container.parser.extractByName(fileName)
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
