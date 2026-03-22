/**
 * 测试资源生成器
 * 生成简单的 SHP 图形并打包为 MIX 文件
 */

import { MixParser } from '../src/data/parser/MixParser'

/**
 * 创建简单的 SHP 文件 (单帧 64x64 图标)
 */
function createTestShp(filename: string, color: number): Uint8Array {
  // SHP 文件结构:
  // Header (14 bytes): width(2) + height(2) + frames(2) + animStart(2) + animEnd(2) + flags(2) + pad(2)
  // Frame header (8 bytes per frame): offset(4) + length(4)
  // Frame data: LCW 压缩的图像数据

  const width = 64
  const height = 64
  const frames = 1

  // 创建未压缩的帧数据 (64x64 = 4096 bytes)
  const frameData = new Uint8Array(width * height)
  for (let i = 0; i < frameData.length; i++) {
    // 创建一个简单的图案
    const x = i % width
    const y = Math.floor(i / width)
    const centerX = width / 2
    const centerY = height / 2
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
    
    if (dist < 20) {
      frameData[i] = color // 中心圆
    } else if (dist < 28) {
      frameData[i] = 0 // 边框
    } else {
      frameData[i] = 255 // 透明
    }
  }

  // LCW 压缩 (简化版 - 直接返回未压缩数据)
  const compressedFrame = lcwCompress(frameData)

  // 构建 SHP 文件
  const headerSize = 14 + frames * 8
  const fileSize = headerSize + compressedFrame.length
  const file = new Uint8Array(fileSize)
  const view = new DataView(file.buffer)

  // 写入头部
  view.setUint16(0, width, true)
  view.setUint16(2, height, true)
  view.setUint16(4, frames, true)
  view.setUint16(6, 0, true) // animStart
  view.setUint16(8, 0, true) // animEnd
  view.setUint16(10, 0, true) // flags
  view.setUint16(12, 0, true) // pad

  // 写入帧头部
  view.setUint32(14, headerSize, true) // offset
  view.setUint32(18, compressedFrame.length, true) // length

  // 写入帧数据
  file.set(compressedFrame, headerSize)

  return file
}

/**
 * 简化版 LCW 压缩 (仅用于测试)
 * 实际游戏中使用 Westwood 的 LCW 算法
 */
function lcwCompress(data: Uint8Array): Uint8Array {
  // 简化处理：直接返回原始数据，前面加上 0x80 标志表示未压缩
  const result = new Uint8Array(data.length + 1)
  result[0] = 0x80 // 未压缩标志
  result.set(data, 1)
  return result
}

/**
 * 计算文件名 ID (CRC32 变体)
 */
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
  return id >>> 0
}

/**
 * 创建 MIX 文件
 */
function createMixFile(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const entryCount = entries.length
  const headerSize = 8 + entryCount * 12

  // 计算数据偏移
  let dataOffset = headerSize
  const entryOffsets: number[] = []
  const entrySizes: number[] = []

  for (const entry of entries) {
    entryOffsets.push(dataOffset)
    entrySizes.push(entry.data.length)
    dataOffset += entry.data.length
  }

  // 创建 MIX 文件
  const file = new Uint8Array(dataOffset)
  const view = new DataView(file.buffer)

  // 写入头部 (TS 格式)
  view.setUint32(0, 0x00010000 | entryCount, true) // flags + count
  view.setUint32(4, dataOffset - headerSize, true) // data size

  // 写入索引
  for (let i = 0; i < entryCount; i++) {
    const offset = 8 + i * 12
    view.setUint32(offset, calculateId(entries[i].name), true)
    view.setUint32(offset + 4, entryOffsets[i], true)
    view.setUint32(offset + 8, entrySizes[i], true)
  }

  // 写入文件数据
  for (let i = 0; i < entryCount; i++) {
    file.set(entries[i].data, entryOffsets[i])
  }

  return file
}

/**
 * 生成测试 MIX 文件
 */
function generateTestMix(): void {
  console.log('生成测试 MIX 文件...')

  // 创建测试 SHP 文件
  const units = [
    { name: 'gi.shp', color: 16 },      // 美国大兵 - 蓝色
    { name: 'e1.shp', color: 80 },      // 动员兵 - 红色
    { name: 'htnk.shp', color: 48 },    // 灰熊坦克 - 浅蓝
    { name: 'htnk2.shp', color: 112 },  // 犀牛坦克 - 深红
  ]

  const entries = units.map(u => ({
    name: u.name,
    data: createTestShp(u.name, u.color)
  }))

  // 创建 MIX 文件
  const mixData = createMixFile(entries)

  // 保存到文件
  const fs = require('fs')
  const path = require('path')
  const outputPath = path.join(__dirname, '../public/assets/test.mix')
  fs.writeFileSync(outputPath, mixData)

  console.log(`✓ 生成成功: ${outputPath} (${mixData.length} bytes)`)

  // 验证 MIX 文件
  console.log('\n验证 MIX 文件...')
  const parser = new MixParser(mixData)
  const info = parser.parse()

  console.log(`  版本: ${info.version}`)
  console.log(`  文件数: ${info.entryCount}`)
  console.log(`  数据大小: ${info.dataSize}`)
  console.log(`  加密: ${info.isEncrypted}`)
  console.log(`  校验和: ${info.hasChecksum}`)

  console.log('\n文件列表:')
  info.entries.forEach((entry, i) => {
    console.log(`  [${i}] ID: 0x${entry.id.toString(16).padStart(8, '0')}, Offset: ${entry.offset}, Size: ${entry.size}`)
  })
}

// 运行生成器
generateTestMix()
