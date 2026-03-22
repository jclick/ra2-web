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
 * MIX 文件容器
 */
export interface MixContainer {
  name: string
  info: MixFileInfo
  data: Uint8Array
  files: Map<number, Uint8Array>
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
   * 导入 MIX 文件
   */
  private async importMixFile(name: string, data: Uint8Array): Promise<void> {
    this.notifyLoading(0, `正在解析 ${name}...`)
    
    const parser = new MixParser(data)
    const info = parser.parse()
    
    // 提取所有文件
    const files = parser.extractAll()
    
    const container: MixContainer = {
      name,
      info,
      data,
      files,
    }
    
    this.mixFiles.set(name, container)
    
    // 自动解析内部的 SHP 文件
    for (const [id, fileData] of files) {
      // 检查是否是 SHP 文件
      if (this.isShpFile(fileData)) {
        try {
          const shpParser = new ShpParser(fileData)
          const shpInfo = shpParser.parse()
          this.shpCache.set(`${name}:${id.toString(16)}`, shpInfo)
        } catch (e) {
          // 不是有效的 SHP 文件
        }
      }
    }
    
    this.notifyLoading(100, `${name} 解析完成，包含 ${info.entryCount} 个文件`)
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
