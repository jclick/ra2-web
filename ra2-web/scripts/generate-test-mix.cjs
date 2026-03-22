/**
 * 测试 MIX 文件生成器 (Node.js 版本)
 * 不依赖 TypeScript 导入
 */

const fs = require('fs')
const path = require('path')

/**
 * 计算文件名 ID (CRC32 变体)
 */
function calculateId(name) {
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
 * 创建简单的 SHP 文件 (单帧 32x32 图标)
 */
function createTestShp(filename, colorIndex) {
  const width = 32
  const height = 32
  const frames = 1

  // 创建帧数据
  const frameData = Buffer.alloc(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const centerX = width / 2
      const centerY = height / 2
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      
      if (dist < 10) {
        frameData[i] = colorIndex // 中心圆
      } else if (dist < 14) {
        frameData[i] = 1 // 边框
      } else {
        frameData[i] = 0 // 背景
      }
    }
  }

  // 简单的 SHP 头部
  const header = Buffer.alloc(14 + 8) // 头部 + 1个帧索引
  header.writeUInt16LE(width, 0)
  header.writeUInt16LE(height, 2)
  header.writeUInt16LE(frames, 4)
  header.writeUInt16LE(0, 6)  // animStart
  header.writeUInt16LE(0, 8)  // animEnd
  header.writeUInt16LE(0, 10) // flags
  header.writeUInt16LE(0, 12) // pad

  // 帧索引
  const frameOffset = 14 + 8
  header.writeUInt32LE(frameOffset, 14)
  header.writeUInt32LE(frameData.length, 18)

  return Buffer.concat([header, frameData])
}

/**
 * 创建 MIX 文件
 */
function createMixFile(entries) {
  const entryCount = entries.length
  const headerSize = 8 + entryCount * 12

  // 计算数据偏移
  let dataOffset = headerSize
  const entryOffsets = []
  const entrySizes = []

  for (const entry of entries) {
    entryOffsets.push(dataOffset)
    entrySizes.push(entry.data.length)
    dataOffset += entry.data.length
  }

  // 创建 MIX 文件
  const file = Buffer.alloc(dataOffset)

  // 写入头部 (TS 格式: flags=0x00010000)
  file.writeUInt32LE(0x00010000 | entryCount, 0)
  file.writeUInt32LE(dataOffset - headerSize, 4)

  // 写入索引
  for (let i = 0; i < entryCount; i++) {
    const offset = 8 + i * 12
    file.writeUInt32LE(calculateId(entries[i].name), offset)
    file.writeUInt32LE(entryOffsets[i], offset + 4)
    file.writeUInt32LE(entrySizes[i], offset + 8)
  }

  // 写入文件数据
  for (let i = 0; i < entryCount; i++) {
    entries[i].data.copy(file, entryOffsets[i])
  }

  return file
}

/**
 * 验证 MIX 文件
 */
function verifyMixFile(data) {
  const firstWord = data.readUInt32LE(0)
  const secondWord = data.readUInt32LE(4)

  console.log(`  头部: 0x${firstWord.toString(16).padStart(8, '0')} (flags) + ${secondWord} (dataSize)`)

  const MIX_FLAG_CHECKSUM = 0x00010000
  const MIX_FLAG_ENCRYPTED = 0x00020000

  const hasChecksum = (firstWord & MIX_FLAG_CHECKSUM) !== 0
  const isEncrypted = (firstWord & MIX_FLAG_ENCRYPTED) !== 0
  const entryCount = firstWord & 0xFFFF

  console.log(`  TS格式: ${hasChecksum}`)
  console.log(`  加密: ${isEncrypted}`)
  console.log(`  文件数: ${entryCount}`)

  // 读取索引
  console.log('\n  文件列表:')
  for (let i = 0; i < entryCount; i++) {
    const offset = 8 + i * 12
    const id = data.readUInt32LE(offset)
    const fileOffset = data.readUInt32LE(offset + 4)
    const fileSize = data.readUInt32LE(offset + 8)
    console.log(`    [${i}] ID: 0x${id.toString(16).padStart(8, '0')}, Offset: ${fileOffset}, Size: ${fileSize}`)
  }

  return { hasChecksum, isEncrypted, entryCount }
}

/**
 * 主函数
 */
function main() {
  console.log('=== RA2 Web 测试资源生成器 ===\n')

  // 创建测试单位
  const units = [
    { name: 'gi.shp', color: 16, desc: '美国大兵 (盟军)' },
    { name: 'e1.shp', color: 80, desc: '动员兵 (苏军)' },
    { name: 'htnk.shp', color: 48, desc: '灰熊坦克' },
    { name: 'htnk2.shp', color: 112, desc: '犀牛坦克' },
    { name: 'mcv.shp', color: 144, desc: '基地车' },
  ]

  console.log('创建测试 SHP 文件:')
  const entries = units.map(u => {
    console.log(`  ${u.name} - ${u.desc} (颜色: ${u.color})`)
    return {
      name: u.name,
      data: createTestShp(u.name, u.color)
    }
  })

  // 创建 MIX 文件
  console.log('\n打包为 MIX 文件...')
  const mixData = createMixFile(entries)

  // 保存
  const outputDir = path.join(__dirname, '../public/assets')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, 'test.mix')
  fs.writeFileSync(outputPath, mixData)

  console.log(`\n✓ 生成成功: ${outputPath}`)
  console.log(`  文件大小: ${mixData.length} bytes`)

  // 验证
  console.log('\n验证 MIX 文件:')
  const info = verifyMixFile(mixData)

  console.log('\n=== 完成 ===')
  console.log(`测试 MIX 文件已保存到: public/assets/test.mix`)
  console.log('可在游戏导入界面选择此文件进行测试')
}

main()
