// VXL/HVA 解析器（体素模型）
// VXL是Westwood的3D体素模型格式

import { BinaryReader } from '../vfs/BinaryReader'

export interface VxlSection {
  name: string
  sectionIndex: number
  unknown: number
  dataSize: number
  data: Uint8Array
}

export interface VxlModel {
  numSections: number
  numTailers: number
  unknown1: number
  unknown2: number
  sections: VxlSection[]
}

/**
 * VXL文件解析器
 */
export class VxlParser {
  private reader: BinaryReader

  constructor(data: Uint8Array) {
    this.reader = new BinaryReader(data)
  }

  /**
   * 解析VXL文件
   */
  parse(): VxlModel {
    // VXL文件头部
    const header = this.reader.readString(16) // "Voxel Animation"
    
    if (!header.startsWith('Voxel Animation')) {
      throw new Error('Invalid VXL file format')
    }

    const numSections = this.reader.readUInt32()
    const numTailers = this.reader.readUInt32()
    const unknown1 = this.reader.readUInt32()
    const unknown2 = this.reader.readUInt32()

    const sections: VxlSection[] = []

    // 读取每个section的头部信息
    for (let i = 0; i < numSections; i++) {
      const name = this.reader.readString(16).replace(/\0/g, '')
      const sectionIndex = this.reader.readUInt32()
      const unknown = this.reader.readUInt32()
      const dataSize = this.reader.readUInt32()

      sections.push({
        name,
        sectionIndex,
        unknown,
        dataSize,
        data: new Uint8Array(), // 稍后填充
      })
    }

    // 读取section数据
    for (const section of sections) {
      section.data = this.reader.readBytes(section.dataSize)
    }

    return {
      numSections,
      numTailers,
      unknown1,
      unknown2,
      sections,
    }
  }
}

// HVA文件解析器（动画数据）
export interface HvaFrame {
  matrices: Float32Array[] // 每个section的变换矩阵
}

export interface HvaAnimation {
  name: string
  numFrames: number
  numSections: number
  frames: HvaFrame[]
}

/**
 * HVA文件解析器
 */
export class HvaParser {
  private reader: BinaryReader

  constructor(data: Uint8Array) {
    this.reader = new BinaryReader(data)
  }

  /**
   * 解析HVA文件
   */
  parse(): HvaAnimation {
    const name = this.reader.readString(16).replace(/\0/g, '')
    const numFrames = this.reader.readUInt32()
    const numSections = this.reader.readUInt32()

    const frames: HvaFrame[] = []

    for (let i = 0; i < numFrames; i++) {
      const matrices: Float32Array[] = []

      for (let j = 0; j < numSections; j++) {
        // 读取4x3变换矩阵（Westwood格式）
        const matrix = new Float32Array(12)
        for (let k = 0; k < 12; k++) {
          matrix[k] = this.reader.readUInt32() / 65536.0 // 定点数转换
        }
        matrices.push(matrix)
      }

      frames.push({ matrices })
    }

    return {
      name,
      numFrames,
      numSections,
      frames,
    }
  }
}

/**
 * 异步解析VXL文件
 */
export async function parseVxlFile(data: Uint8Array): Promise<VxlModel> {
  const parser = new VxlParser(data)
  return parser.parse()
}

/**
 * 异步解析HVA文件
 */
export async function parseHvaFile(data: Uint8Array): Promise<HvaAnimation> {
  const parser = new HvaParser(data)
  return parser.parse()
}
