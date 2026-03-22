/**
 * MIX 文件解析器 (内存优化版)
 * 支持大文件流式解析，避免内存溢出
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
 * MIX 文件解析器 (内存优化版)
 * 
 * 设计变更:
 * - 不缓存所有提取的文件
 * - 按需提取单个文件
 * - 支持流式处理大文件
 */
export class MixParser {
  private data: Uint8Array
  private view: DataView
  private position: number = 0
  private _info: MixFileInfo | null = null

  constructor(data: Uint8Array) {
    this.data = data
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  /**
   * 解析 MIX 文件头 (只读取索引，不提取内容)
   */
  parse(): MixFileInfo {
    if (this._info) return this._info

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

    // 读取索引表 (只保存元数据，不提取文件内容)
    const entries: MixEntry[] = []
    
    // 检查是否有足够的数据读取所有 entries
    const requiredBytes = 8 + entryCount * 12  // 8字节头 + 每个entry 12字节
    if (this.data.length < requiredBytes) {
      console.warn(`MIX 数据不足: 需要 ${requiredBytes} 字节，实际只有 ${this.data.length} 字节`)
      console.warn(`将只读取 ${Math.floor((this.data.length - 8) / 12)} 个 entries`)
      entryCount = Math.floor((this.data.length - 8) / 12)
    }
    
    for (let i = 0; i < entryCount; i++) {
      try {
        const id = this.readUint32()
        const offset = this.readUint32()
        const size = this.readUint32()
        entries.push({ id, offset, size })
      } catch (e) {
        console.warn(`读取 entry ${i}/${entryCount} 失败:`, e)
        break
      }
    }

    this._info = {
      version,
      entryCount,
      dataSize,
      entries,
      hasChecksum,
      isEncrypted,
    }

    return this._info
  }

  /**
   * 获取文件信息 (不包含数据)
   */
  getInfo(): MixFileInfo {
    return this.parse()
  }

  /**
   * 提取单个文件 (按需调用，避免一次性加载所有文件)
   */
  extractFile(entry: MixEntry): Uint8Array | null {
    if (entry.offset + entry.size > this.data.length) {
      console.warn(`文件数据超出范围: ID=${entry.id.toString(16)}`)
      return null
    }

    // 只提取请求的文件，不缓存
    return this.data.slice(entry.offset, entry.offset + entry.size)
  }

  /**
   * 通过ID提取文件
   */
  extractById(id: number): Uint8Array | null {
    const info = this.parse()
    const entry = info.entries.find(e => e.id === id)
    if (!entry) return null
    return this.extractFile(entry)
  }

  /**
   * 通过名称提取文件
   */
  extractByName(name: string): Uint8Array | null {
    const info = this.parse()
    const id = calculateId(name)
    const entry = info.entries.find(e => e.id === id)
    if (!entry) {
      console.warn(`文件未找到: ${name} (ID=${id.toString(16)})`)
      return null
    }
    return this.extractFile(entry)
  }

  /**
   * 查找文件条目 (不提取数据)
   */
  findEntry(name: string): MixEntry | undefined {
    const info = this.parse()
    const id = calculateId(name)
    return info.entries.find(e => e.id === id)
  }

  /**
   * 查找文件条目By ID
   */
  findEntryById(id: number): MixEntry | undefined {
    const info = this.parse()
    return info.entries.find(e => e.id === id)
  }

  /**
   * 遍历所有文件条目 (回调方式，避免一次性创建大量数组)
   */
  forEachEntry(callback: (entry: MixEntry, index: number) => void): void {
    const info = this.parse()
    info.entries.forEach((entry, index) => callback(entry, index))
  }

  /**
   * 提取所有文件 (⚠️ 警告: 大文件可能导致内存溢出，建议使用按需提取)
   * @deprecated 建议使用 extractById 或 extractByName
   */
  extractAll(): Map<number, Uint8Array> {
    console.warn('extractAll() may cause memory issues with large MIX files. Consider using extractById() or extractByName() instead.')
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
   * 获取文件列表 (只返回元数据，不包含文件内容)
   */
  getFileList(): Array<{ id: number; size: number; name?: string }> {
    const info = this.parse()
    return info.entries.map(e => ({
      id: e.id,
      size: e.size,
    }))
  }

  /**
   * 读取 32 位无符号整数
   */
  private readUint32(): number {
    if (this.position + 4 > this.view.byteLength) {
      throw new Error(`尝试读取超出数据范围: position=${this.position}, length=${this.view.byteLength}`)
    }
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
