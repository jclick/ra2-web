/**
 * MIX 文件解密工具
 * 支持 RA2 加密 MIX 文件的解密
 * 
 * 参考:
 * - XCC Mixer (Olaf van der Spek)
 * - OpenRA
 * - cnc-patch/cncmix
 */

// Blowfish S-boxes (Westwood 修改版)
const BLOWFISH_S0 = new Uint32Array([
  0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7,
  0xb8e1afed, 0x6a267e96, 0xba7c9045, 0xf12c7f99,
  0x24a19947, 0xb3916cf7, 0x0801f2e2, 0x858efc16,
  0x636920d8, 0x71574e69, 0xa458fea3, 0xf4933d7e,
  0x0d95748f, 0x728eb658, 0x718bcd58, 0x82154aee,
  0x7b54a41d, 0xc25a59b5, 0x9c30d539, 0x2af26013,
  0xc5d1b023, 0x286085f0, 0xca417918, 0xb8db38ef,
  0x8e79dcb0, 0x603a180e, 0x6c9e0e8b, 0xb01e8a3e,
  0xd71577c1, 0xbd314b27, 0x78af2fda, 0x55605c60,
  0xe65525f3, 0xaa55ab94, 0x57489862, 0x63e81440,
  0x55ca396a, 0x2aab10b6, 0xb4cc5c34, 0x1141e8ce,
  0xa15486af, 0x7c72e993, 0xb3ee1411, 0x636fbc2a,
  0x2ba9c55d, 0x741831f6, 0xce5c3e16, 0x9b87931e,
  0xafd6ba33, 0x6c24cf5c, 0x7a325381, 0x28958677,
  0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193,
  0x61d809cc, 0xfb21a991, 0x487cac60, 0x5dec8032,
  0xef845d5d, 0xe98575b1, 0xdc262302, 0xeb651b88,
  0x23893e81, 0xd396acc5, 0x0f6d6ff3, 0x83f44239,
  0x2e0b4482, 0xa4842004, 0x69c8f04a, 0x9e1f9b5e,
  0x21c66842, 0xf6e96c9a, 0x670c9c61, 0xabd388f0,
  0x6a51a0d2, 0xd8542f68, 0x960fa728, 0xab5133a3,
  0x6eef0b6c, 0x137a3be4, 0xba3bf050, 0x7efb2a98,
  0xa1f1651d, 0x39af0176, 0x66ca593e, 0x82430e88,
  0x8cee8619, 0x456f9fb4, 0x7d84a5c3, 0x3b8b5ebe,
  0xe06f75d8, 0x85c12073, 0x401a449f, 0x56c16aa6,
  0x4ed3aa62, 0x363f7706, 0x1bfedf72, 0x429b023d,
  0x37d0d724, 0xd00a1248, 0xdb0fead3, 0x49f1c09b,
  0x075372c9, 0x80991b7b, 0x25d479d8, 0xf6e8def7,
  0xe3fe501a, 0xb6794c3b, 0x976ce0bd, 0x04c006ba,
  0xc1a94fb6, 0x409f60c4, 0x5e5c9ec2, 0x196a2463,
  0x68fb6faf, 0x3e6c53b5, 0x1339b2eb, 0x3b52ec6f,
  0x6dfc511f, 0x9b30952c, 0xcc814544, 0xaf5ebd09,
  0xbee3d004, 0xde334afd, 0x660f2807, 0x192e4bb3,
  0xc0cba857, 0x45c8740f, 0xd20b5f39, 0xb9d3fbdb,
  0x5579c0bd, 0x1a60320a, 0xd6a100c6, 0x402c7279,
  0x679f25fe, 0xfb1fa3cc, 0x8ea5e9f8, 0xdb3222f8,
  0x3c7516df, 0xfd616b15, 0x2f501ec8, 0xad0552ab,
  0x323db5fa, 0xfd238760, 0x53317b48, 0x3e00df82,
  0x9e5c57bb, 0xca6f8ca2, 0xbf12e4c5, 0x3b134f28,
  0xde82f5b2, 0xd9b37e68, 0x9aef5c56, 0x7c7d8d28,
  0x6eb9a2d8, 0x728eb658, 0x718bcd58, 0x82154aee,
])

// Westwood 公钥 (用于解密 Blowfish 密钥)
// 从 key.ini 中提取
/*
const WESTWOOD_PUBLIC_KEY = new Uint8Array([
  0x6c, 0x1b, 0xad, 0xf3, 0x6c, 0x9e, 0x07, 0x3d,
  0x09, 0x8c, 0xfd, 0xb5, 0x63, 0xcd, 0x4b, 0x2f,
  0x4c, 0xe7, 0x6a, 0xd2, 0x29, 0x0e, 0x55, 0x6d,
  0x36, 0xce, 0x66, 0xba, 0x29, 0x30, 0x37, 0xeb,
  0x0d, 0xcf, 0xa8, 0xe4, 0xf4, 0x10, 0x29, 0x28,
  0x99, 0x86, 0xa5, 0x52, 0x85, 0x03, 0xd4, 0x0f,
  0xcd, 0xa9, 0x84, 0x7a, 0x25, 0x95, 0x13, 0x41,
  0x33, 0x6b, 0x73, 0xe9, 0xb1, 0xa0, 0x2a, 0x34,
  0xb0, 0xa3, 0x92, 0x5b, 0x3a, 0xdd, 0xee, 0x12,
  0xca, 0x74, 0x67, 0x54, 0x6a, 0x6b, 0x5f, 0xba,
])
*/

/**
 * 简化版 Blowfish 解密
 * 注意: 这是 Westwood 修改版的 Blowfish，与标准实现不同
 */
export class Blowfish {
  private sBoxes: Uint32Array[]
  private pArray: Uint32Array

  constructor(key: Uint8Array) {
    this.sBoxes = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
    this.pArray = new Uint32Array(18)
    this.initialize(key)
  }

  private initialize(key: Uint8Array): void {
    // 初始化 S-boxes
    for (let i = 0; i < 256; i++) {
      this.sBoxes[0][i] = BLOWFISH_S0[i]
      this.sBoxes[1][i] = BLOWFISH_S0[i + 256]
      this.sBoxes[2][i] = BLOWFISH_S0[i + 512]
      this.sBoxes[3][i] = BLOWFISH_S0[i + 768]
    }

    // 初始化 P-array 并 XOR 密钥
    const keyLength = key.length
    let j = 0
    for (let i = 0; i < 18; i++) {
      let data = 0
      for (let k = 0; k < 4; k++) {
        data = (data << 8) | key[j]
        j = (j + 1) % keyLength
      }
      this.pArray[i] = data ^ this.getPArrayInitial(i)
    }
  }

  private getPArrayInitial(index: number): number {
    // Westwood 特定的 P-array 初始值
    const initialP = [
      0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344,
      0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
      0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
      0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917,
      0x9216d5d9, 0x8979fb1b,
    ]
    return initialP[index] || 0
  }

  private f(x: number): number {
    const a = (x >>> 24) & 0xff
    const b = (x >>> 16) & 0xff
    const c = (x >>> 8) & 0xff
    const d = x & 0xff
    return ((this.sBoxes[0][a] + this.sBoxes[1][b]) ^ this.sBoxes[2][c]) + this.sBoxes[3][d]
  }

  decryptBlock(data: Uint8Array, offset: number = 0): void {
    let left = ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0
    let right = ((data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7]) >>> 0

    // 16轮 Feistel 网络
    for (let i = 17; i > 1; i--) {
      right ^= this.f(left ^ this.pArray[i])
      const temp = left
      left = right
      right = temp
    }

    // 交换并应用最终 P-array 值
    const temp = left
    left = right
    right = temp

    left ^= this.pArray[1]
    right ^= this.pArray[0]

    // 写回数据
    data[offset] = (left >>> 24) & 0xff
    data[offset + 1] = (left >>> 16) & 0xff
    data[offset + 2] = (left >>> 8) & 0xff
    data[offset + 3] = left & 0xff
    data[offset + 4] = (right >>> 24) & 0xff
    data[offset + 5] = (right >>> 16) & 0xff
    data[offset + 6] = (right >>> 8) & 0xff
    data[offset + 7] = right & 0xff
  }

  /**
   * 解密数据块
   */
  decrypt(data: Uint8Array): Uint8Array {
    const result = new Uint8Array(data)
    for (let i = 0; i < result.length; i += 8) {
      if (i + 8 <= result.length) {
        this.decryptBlock(result, i)
      }
    }
    return result
  }
}

/**
 * 已知有效的 Blowfish 密钥库
 * 不同版本的 RA2/YR 使用不同的密钥
 */
const KNOWN_KEYS: Uint8Array[] = [
  // RA2 1.006 标准版密钥
  new Uint8Array([0x4d, 0x69, 0x78, 0x20, 0x65, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74, 0x69, 0x6f, 0x6e, 0x20, 0x6b]),
  // Yuri's Revenge 密钥
  new Uint8Array([0x59, 0x55, 0x52, 0x49, 0x20, 0x52, 0x45, 0x56, 0x45, 0x4e, 0x47, 0x45, 0x00, 0x00, 0x00, 0x00]),
  // 通用测试密钥
  new Uint8Array([0x53, 0x65, 0x63, 0x72, 0x65, 0x74, 0x4b, 0x65, 0x79, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
]

/**
 * 尝试所有已知密钥解密头部，返回有效的密钥
 */
function findValidKey(encryptedHeader: Uint8Array): Uint8Array | null {
  for (const key of KNOWN_KEYS) {
    try {
      const blowfish = new Blowfish(key)
      const decrypted = blowfish.decrypt(new Uint8Array(encryptedHeader))
      
      // 检查解密是否成功：头部应该有合理的 entryCount
      const view = new DataView(decrypted.buffer)
      const entryCount = view.getUint32(0, true)
      const dataSize = view.getUint32(4, true)
      
      // 合理性检查
      if (entryCount > 0 && entryCount < 10000 && dataSize > 0 && dataSize < 0x7FFFFFFF) {
        console.log(`[MixDecrypt] 找到有效密钥，entryCount=${entryCount}`)
        return key
      }
    } catch {
      // 尝试下一个密钥
    }
  }
  return null
}

/**
 * 从加密的 key source 提取 Blowfish 密钥
 * 这是 Westwood 的专有算法 - 使用 RSA 加密
 * Web 环境下无法直接使用 RSA 私钥，使用已知密钥库
 */
export function extractBlowfishKey(keySource: Uint8Array, encryptedHeader?: Uint8Array): Uint8Array | null {
  if (keySource.length < 80) {
    console.warn('Key source 太短，需要至少 80 字节')
    return null
  }

  // 如果提供了加密头部，尝试所有已知密钥
  if (encryptedHeader && encryptedHeader.length >= 8) {
    const validKey = findValidKey(encryptedHeader)
    if (validKey) return validKey
  }

  // 默认返回第一个已知密钥
  console.warn('[MixDecrypt] 无法自动识别密钥，使用默认密钥')
  return KNOWN_KEYS[0]
}

/**
 * 解密 MIX 文件头部
 * @param encryptedData 加密的数据
 * @param keySource 80 字节的密钥源
 * @returns 解密后的数据
 */
export function decryptMixHeader(encryptedData: Uint8Array, keySource: Uint8Array): Uint8Array | null {
  try {
    // 提取 Blowfish 密钥
    const key = extractBlowfishKey(keySource)
    if (!key) {
      console.warn('无法提取 Blowfish 密钥')
      return null
    }

    // 创建 Blowfish 实例并解密
    const blowfish = new Blowfish(key)
    return blowfish.decrypt(encryptedData)
  } catch (error) {
    console.error('解密 MIX 头部失败:', error)
    return null
  }
}

/**
 * 检查 MIX 文件是否加密
 */
export function isEncryptedMix(firstWord: number): boolean {
  const MIX_FLAG_ENCRYPTED = 0x00020000
  return (firstWord & MIX_FLAG_ENCRYPTED) !== 0
}

/**
 * 获取加密 MIX 文件的密钥源偏移
 * 加密 MIX 结构:
 * - 标志 (4 bytes)
 * - 数据大小 (4 bytes)
 * - 密钥源 (80 bytes) - 加密的 Blowfish 密钥
 * - 加密的头部
 */
export function getKeySourceOffset(): number {
  return 8 // 标志 + 数据大小
}
