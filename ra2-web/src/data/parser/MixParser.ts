/**
 * MIX 文件解析器
 * Westwood 的资源包格式
 * 
 * MIX 文件结构:
 * - 文件头 (6-10 bytes)
 * - 索引表 (每个文件一项)
 * - 数据块
 */

// MIX 文件标志
const MIX_FLAG_CHECKSUM = 0x00010000
const MIX_FLAG_ENCRYPTED = 0x00020000

// 标准 ID 计算 (CRC32 变体)
function calculateId(name: string): number {
  let id = 0
  for (let i = 0; i < name.length; i++) {
    let c = name.charCodeAt(i)
    if (c >= 97 && c <= 122) {
      c -= 32 // 转大写
    }
    id = (id >>> 1) | ((id & 1) << 31)
    id ^= c
  }
  return id >>> 0 // 转为无符号
}

// MIX 索引项
export interface MixEntry {
  id: number
  offset: number
  size: number
  name?: string
}

// MIX 文件信息
export interface MixFileInfo {
  version: 'classic' | 'ts'
  entryCount: number
  dataSize: number
  entries: MixEntry[]
  hasChecksum: boolean
  isEncrypted: boolean
}

/**
 * MIX 文件解析器
 */
export class MixParser {
  private data: Uint8Array
  private view: DataView
  private position: number = 0

  constructor(data: Uint8Array) {
    this.data = data
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  /**
   * 解析 MIX 文件
   */
  parse(): MixFileInfo {
    // 读取标志或数量
    const firstWord = this.readUint32()

    let entryCount: number
    let dataSize: number
    let version: 'classic' | 'ts'
    let hasChecksum = false
    let isEncrypted = false

    // 检查标志
    if (firstWord & MIX_FLAG_CHECKSUM) {
      // TS 格式 (RA2 使用)
      hasChecksum = true
      isEncrypted = (firstWord & MIX_FLAG_ENCRYPTED) !== 0
      entryCount = firstWord & 0xFFFF
      dataSize = this.readUint32()
      version = 'ts'
    } else {
      // 经典格式
      entryCount = firstWord
      dataSize = this.readUint32()
      version = 'classic'
    }

    // 读取索引表
    const entries: MixEntry[] = []
    for (let i = 0; i < entryCount; i++) {
      const id = this.readUint32()
      const offset = this.readUint32()
      const size = this.readUint32()
      
      entries.push({
        id,
        offset,
        size,
      })
    }

    return {
      version,
      entryCount,
      dataSize,
      entries,
      hasChecksum,
      isEncrypted,
    }
  }

  /**
   * 提取所有文件
   */
  extractAll(): Map<number, Uint8Array> {
    const info = this.parse()
    const files = new Map<number, Uint8Array>()

    for (const entry of info.entries) {
      const data = this.extractFile(entry)
      if (data) {
        files.set(entry.id, data)
      }
    }

    return files
  }

  /**
   * 提取单个文件
   */
  extractFile(entry: MixEntry): Uint8Array | null {
    if (entry.offset + entry.size > this.data.length) {
      console.warn(`文件数据超出范围: ID=${entry.id.toString(16)}`)
      return null
    }

    return this.data.slice(entry.offset, entry.offset + entry.size)
  }

  /**
   * 通过名称查找文件
   */
  findFileByName(info: MixFileInfo, name: string): MixEntry | undefined {
    const id = calculateId(name)
    return info.entries.find(e => e.id === id)
  }

  /**
   * 读取 32 位无符号整数
   */
  private readUint32(): number {
    const value = this.view.getUint32(this.position, true)
    this.position += 4
    return value
  }

  /**
   * 计算文件名称的 ID
   */
  static calculateId(name: string): number {
    return calculateId(name)
  }
}

export default MixParser
