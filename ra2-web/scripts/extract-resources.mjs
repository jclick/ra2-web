#!/usr/bin/env node

/**
 * 资源提取工具脚本
 * 帮助用户提取红警2游戏资源
 */

import { promises as fs } from 'fs'
import path from 'path'

interface ResourceInfo {
  name: string
  description: string
  required: boolean
  sources: string[]
}

const REQUIRED_RESOURCES: ResourceInfo[] = [
  {
    name: 'ra2.mix',
    description: '红警2主资源包（原版）',
    required: true,
    sources: ['Origin', 'Steam', 'CD版'],
  },
  {
    name: 'ra2md.mix',
    description: '尤里的复仇资源包（资料片）',
    required: false,
    sources: ['Origin', 'Steam', 'CD版'],
  },
  {
    name: 'language.mix',
    description: '本地化资源',
    required: true,
    sources: ['Origin', 'Steam', 'CD版'],
  },
  {
    name: 'rules.ini',
    description: '游戏规则配置',
    required: true,
    sources: ['游戏目录'],
  },
  {
    name: 'art.ini',
    description: '美术资源配置',
    required: true,
    sources: ['游戏目录'],
  },
  {
    name: '*.map',
    description: '地图文件',
    required: false,
    sources: ['游戏目录/Maps'],
  },
]

async function main() {
  console.log('========================================')
  console.log('   红色警戒2 Web版 - 资源提取工具')
  console.log('========================================')
  console.log()

  // 检查命令行参数
  const gameDir = process.argv[2]
  const outputDir = process.argv[3] || './public/assets'

  if (!gameDir) {
    console.log('用法: node extract-resources.mjs <游戏目录> [输出目录]')
    console.log()
    console.log('示例:')
    console.log('  node extract-resources.mjs "/mnt/c/Program Files/Red Alert 2"')
    console.log('  node extract-resources.mjs "C:\\Games\\RA2" ./assets')
    console.log()
    console.log('需要的资源文件:')
    for (const res of REQUIRED_RESOURCES) {
      const status = res.required ? '[必需]' : '[可选]'
      console.log(`  ${status} ${res.name} - ${res.description}`)
    }
    console.log()
    console.log('游戏安装位置:')
    console.log('  - Origin: C:\\Program Files (x86)\\Origin Games\\Command and Conquer Red Alert II')
    console.log('  - Steam: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Command and Conquer Red Alert II')
    process.exit(1)
  }

  console.log(`游戏目录: ${gameDir}`)
  console.log(`输出目录: ${outputDir}`)
  console.log()

  // 检查游戏目录是否存在
  try {
    const stats = await fs.stat(gameDir)
    if (!stats.isDirectory()) {
      console.error('错误: 指定的路径不是目录')
      process.exit(1)
    }
  } catch {
    console.error('错误: 无法访问游戏目录')
    process.exit(1)
  }

  // 创建输出目录
  await fs.mkdir(outputDir, { recursive: true })

  // 扫描游戏目录
  console.log('扫描游戏目录...')
  const files = await fs.readdir(gameDir)
  const foundResources: string[] = []

  for (const file of files) {
    const lowerFile = file.toLowerCase()
    for (const res of REQUIRED_RESOURCES) {
      if (lowerFile === res.name.toLowerCase() || 
          lowerFile.match(res.name.toLowerCase().replace('*', '.*'))) {
        foundResources.push(file)
      }
    }
  }

  console.log(`找到 ${foundResources.length} 个资源文件:`)
  for (const file of foundResources) {
    console.log(`  ✓ ${file}`)
  }
  console.log()

  // 复制文件
  console.log('复制资源文件...')
  for (const file of foundResources) {
    const srcPath = path.join(gameDir, file)
    const destPath = path.join(outputDir, file.toLowerCase())
    
    try {
      await fs.copyFile(srcPath, destPath)
      console.log(`  ✓ ${file}`)
    } catch (err) {
      console.error(`  ✗ ${file}: ${err}`)
    }
  }

  console.log()
  console.log('========================================')
  console.log('资源提取完成！')
  console.log(`输出目录: ${outputDir}`)
  console.log('========================================')
  console.log()
  console.log('下一步:')
  console.log('  1. 运行 npm install 安装依赖')
  console.log('  2. 运行 npm run dev 启动开发服务器')
  console.log('  3. 在浏览器中导入提取的资源文件')
}

main().catch(console.error)
