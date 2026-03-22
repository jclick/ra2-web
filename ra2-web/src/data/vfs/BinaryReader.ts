// import { VFSFile, vfs } from './VirtualFileSystem'

/**
 * 二进制数据读取器
 * 支持小端序读取
 */
export class BinaryReader {
  private data: Uint8Array
  private view: DataView
  private position: number = 0

  constructor(data: Uint8Array | ArrayBuffer) {
    if (data instanceof ArrayBuffer) {
      this.data = new Uint8Array(data)
    } else {
      this.data = data
    }
    this.view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength)
  }

  /**
   * 获取当前位置
   */
  getPosition(): number {
    return this.position
  }

  /**
   * 设置当前位置
   */
  seek(position: number): void {
    this.position = Math.max(0, Math.min(position, this.data.length))
  }

  /**
   * 跳过指定字节
   */
  skip(bytes: number): void {
    this.position += bytes
  }

  /**
   * 检查是否到达末尾
   */
  isEOF(): boolean {
    return this.position >= this.data.length
  }

  /**
   * 获取剩余字节数
   */
  remaining(): number {
    return this.data.length - this.position
  }

  /**
   * 读取1字节
   */
  readByte(): number {
    return this.data[this.position++]
  }

  /**
   * 读取有符号8位整数
   */
  readInt8(): number {
    return this.view.getInt8(this.position++)
  }

  /**
   * 读取无符号8位整数
   */
  readUInt8(): number {
    return this.view.getUint8(this.position++)
  }

  /**
   * 读取有符号16位整数（小端序）
   */
  readInt16(): number {
    const value = this.view.getInt16(this.position, true)
    this.position += 2
    return value
  }

  /**
   * 读取无符号16位整数（小端序）
   */
  readUInt16(): number {
    const value = this.view.getUint16(this.position, true)
    this.position += 2
    return value
  }

  /**
   * 读取有符号32位整数（小端序）
   */
  readInt32(): number {
    const value = this.view.getInt32(this.position, true)
    this.position += 4
    return value
  }

  /**
   * 读取无符号32位整数（小端序）
   */
  readUInt32(): number {
    const value = this.view.getUint32(this.position, true)
    this.position += 4
    return value
  }

  /**
   * 读取字符串（指定长度）
   */
  readString(length: number, encoding: 'ascii' | 'utf8' = 'ascii'): string {
    const bytes = this.readBytes(length)
    const decoder = new TextDecoder(encoding === 'ascii' ? 'windows-1252' : 'utf-8')
    return decoder.decode(bytes).replace(/\0/g, '')
  }

  /**
   * 读取以null结尾的字符串
   */
  readNullTerminatedString(maxLength?: number): string {
    const bytes: number[] = []
    const limit = maxLength ?? this.remaining()
    
    for (let i = 0; i < limit && !this.isEOF(); i++) {
      const byte = this.readByte()
      if (byte === 0) break
      bytes.push(byte)
    }
    
    const decoder = new TextDecoder('windows-1252')
    return decoder.decode(new Uint8Array(bytes))
  }

  /**
   * 读取指定长度的字节数组
   */
  readBytes(length: number): Uint8Array {
    const end = Math.min(this.position + length, this.data.length)
    const result = this.data.slice(this.position, end)
    this.position = end
    return result
  }

  /**
   * 查看指定长度的字节（不移动位置）
   */
  peekBytes(length: number): Uint8Array {
    const end = Math.min(this.position + length, this.data.length)
    return this.data.slice(this.position, end)
  }

  /**
   * 读取到末尾的所有字节
   */
  readToEnd(): Uint8Array {
    return this.readBytes(this.remaining())
  }

  /**
   * 创建子读取器（从当前位置开始）
   */
  createSubReader(length: number): BinaryReader {
    const data = this.readBytes(length)
    return new BinaryReader(data)
  }

  /**
   * 计算CRC32校验和
   */
  static calculateCRC32(data: Uint8Array): number {
    const table = BinaryReader.crc32Table
    let crc = 0xFFFFFFFF
    
    for (const byte of data) {
      crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  private static crc32Table: Uint32Array = BinaryReader.generateCRC32Table()

  private static generateCRC32Table(): Uint32Array {
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[i] = c
    }
    return table
  }
}

/**
 * 从VFS文件创建二进制读取器
 */
/*
export function createReader(file: VFSFile): BinaryReader {
  return new BinaryReader(file.data)
}
*/
