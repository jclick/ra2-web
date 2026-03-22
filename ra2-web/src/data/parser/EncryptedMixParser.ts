/**
 * 加密 MIX 文件解析器
 * 支持解密 Westwood 加密格式的 MIX 文件
 */

import { MixParser, MixFileInfo, MixEntry } from './MixParser'
import { Blowfish, extractBlowfishKey, getKeySourceOffset } from './MixDecrypt'

/**
 * 加密 MIX 解析器
 * 处理加密 MIX 文件的特殊格式
 */
export class EncryptedMixParser {
  private file: File
  private _info: MixFileInfo | null = null
  private keySource: Uint8Array | null = null
  private blowfish: Blowfish | null = null

  constructor(file: File) {
    this.file = file
  }

  /**
   * 读取文件片段
   */
  private async readSlice(start: number, end: number): Promise<Uint8Array> {
    const slice = this.file.slice(start, end)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(slice)
    })
  }

  /**
   * 初始化解密
   * 读取密钥源并创建 Blowfish 实例
   */
  private async initializeDecryption(): Promise<boolean> {
    try {
      // 读取密钥源 (文件头后 80 字节)
      const offset = getKeySourceOffset()
      this.keySource = await this.readSlice(offset, offset + 80)

      // 提取 Blowfish 密钥
      const key = extractBlowfishKey(this.keySource)
      if (!key) {
        console.warn('无法从 key source 提取密钥')
        return false
      }

      // 创建 Blowfish 实例
      this.blowfish = new Blowfish(key)
      return true
    } catch (error) {
      console.error('初始化解密失败:', error)
      return false
    }
  }

  /**
   * 解析加密 MIX 文件
   */
  async parse(): Promise<MixFileInfo | null> {
    if (this._info) return this._info

    try {
      // 初始化解密
      const initialized = await this.initializeDecryption()
      if (!initialized) {
        console.warn('解密初始化失败，尝试作为未加密文件解析')
        return null
      }

      // 读取并解密头部
      const headerOffset = getKeySourceOffset() + 80 // 8 + 80 = 88
      const encryptedHeader = await this.readSlice(headerOffset, headerOffset + 1024) // 读取前 1KB

      if (!this.blowfish) {
        return null
      }

      const decryptedHeader = this.blowfish.decrypt(encryptedHeader)

      // 使用解密后的数据创建 MixParser
      const parser = new MixParser(decryptedHeader)
      this._info = parser.parse()

      // 标记为加密
      if (this._info) {
        this._info.isEncrypted = true
      }

      return this._info
    } catch (error) {
      console.error('解析加密 MIX 失败:', error)
      return null
    }
  }

  /**
   * 提取文件
   * @param entry 文件条目
   * @returns 文件数据
   */
  async extractFile(entry: MixEntry): Promise<Uint8Array | null> {
    if (!this.blowfish) {
      console.warn('Blowfish 未初始化')
      return null
    }

    try {
      // 计算实际偏移 (需要加上密钥源和头部的偏移)
      const baseOffset = getKeySourceOffset() + 80
      const actualOffset = baseOffset + entry.offset

      // 读取加密数据
      const encryptedData = await this.readSlice(actualOffset, actualOffset + entry.size)

      // 解密数据
      return this.blowfish.decrypt(encryptedData)
    } catch (error) {
      console.error(`提取文件失败: ID=${entry.id.toString(16)}`, error)
      return null
    }
  }

  /**
   * 获取文件信息
   */
  getInfo(): MixFileInfo | null {
    return this._info
  }
}

export default EncryptedMixParser
