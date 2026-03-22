/**
 * SHP 文件解析器 (改进版)
 * Westwood 的精灵图格式
 */

// SHP 文件头
export interface ShpHeader {
  zero: number
  width: number
  height: number
  numFrames: number
}

// SHP 帧头
export interface ShpFrameHeader {
  x: number
  y: number
  width: number
  height: number
  compressedSize: number
  flags: number
  colorIndex: number
  align: number
}

// SHP 帧
export interface ShpFrame {
  header: ShpFrameHeader
  data: Uint8Array  // 解压后的像素数据 (索引色)
}

// SHP 文件信息
export interface ShpFileInfo {
  header: ShpHeader
  frames: ShpFrame[]
}

/**
 * SHP 文件解析器
 */
export class ShpParser {
  private data: Uint8Array
  private view: DataView
  private position: number = 0

  constructor(data: Uint8Array) {
    this.data = data
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  /**
   * 解析 SHP 文件
   */
  parse(): ShpFileInfo {
    // 读取文件头
    const header: ShpHeader = {
      zero: this.readUint16(),
      width: this.readUint16(),
      height: this.readUint16(),
      numFrames: this.readUint16(),
    }

    // 验证文件头
    if (header.zero !== 0) {
      throw new Error('无效的 SHP 文件头')
    }

    // 读取帧头和数据
    const frames: ShpFrame[] = []
    const frameOffsets: number[] = []

    // 先读取所有帧偏移
    for (let i = 0; i < header.numFrames; i++) {
      frameOffsets.push(this.readUint32())
    }

    // 读取每帧数据
    for (let i = 0; i < header.numFrames; i++) {
      this.position = frameOffsets[i]
      
      const frameHeader: ShpFrameHeader = {
        x: this.readUint16(),
        y: this.readUint16(),
        width: this.readUint16(),
        height: this.readUint16(),
        compressedSize: this.readUint32(),
        flags: this.readUint8(),
        colorIndex: this.readUint8(),
        align: this.readUint16(),
      }

      // 读取压缩数据
      const compressedData = this.data.slice(
        this.position,
        this.position + frameHeader.compressedSize
      )

      // 解压数据
      const frameData = this.decompressFrame(
        compressedData,
        frameHeader.width,
        frameHeader.height,
        frameHeader.flags
      )

      frames.push({
        header: frameHeader,
        data: frameData,
      })
    }

    return {
      header,
      frames,
    }
  }

  /**
   * 解压帧数据
   */
  private decompressFrame(
    compressed: Uint8Array,
    width: number,
    height: number,
    flags: number
  ): Uint8Array {
    // 检查压缩类型
    if ((flags & 0x01) !== 0) {
      // Format40压缩 (LCW)
      return this.decompressLCW(compressed, width * height)
    } else if ((flags & 0x02) !== 0) {
      // Format20压缩
      return this.decompressFormat20(compressed, width * height)
    } else {
      // 未压缩
      return compressed.slice(0, Math.min(compressed.length, width * height))
    }
  }

  /**
   * LCW (Format40) 解压算法
   * Westwood的专有压缩算法
   */
  private decompressLCW(input: Uint8Array, outputSize: number): Uint8Array {
    const output = new Uint8Array(outputSize)
    let outPos = 0
    let inPos = 0

    while (inPos < input.length && outPos < outputSize) {
      const cmd = input[inPos++]

      if (cmd === 0x80) {
        // 结束标记
        break
      } else if (cmd === 0x00) {
        // 长复制
        const count = input[inPos++] | (input[inPos++] << 8)
        const src = input[inPos++] | (input[inPos++] << 8)
        for (let i = 0; i < count; i++) {
          output[outPos++] = output[src + i]
        }
      } else if (cmd & 0x80) {
        // 短复制
        const count = cmd & 0x7F
        const src = input[inPos++]
        for (let i = 0; i < count; i++) {
          output[outPos++] = output[outPos - src - 1]
        }
      } else {
        // 直接复制
        const count = cmd
        for (let i = 0; i < count; i++) {
          output[outPos++] = input[inPos++]
        }
      }
    }

    return output
  }

  /**
   * Format20 解压算法
   */
  private decompressFormat20(input: Uint8Array, outputSize: number): Uint8Array {
    // 简化的 Format20 解压
    // 实际实现需要更复杂的逻辑
    const output = new Uint8Array(outputSize)
    let outPos = 0
    let inPos = 0

    while (inPos < input.length && outPos < outputSize) {
      const cmd = input[inPos++]

      if (cmd & 0x80) {
        // 复制命令
        const count = ((cmd & 0x70) >> 4) + 1
        const src = outPos - ((cmd & 0x0F) << 8) - input[inPos++] - 1
        for (let i = 0; i < count; i++) {
          output[outPos++] = output[src + i]
        }
      } else {
        // 直接复制
        const count = cmd + 1
        for (let i = 0; i < count && inPos < input.length; i++) {
          output[outPos++] = input[inPos++]
        }
      }
    }

    return output
  }

  /**
   * 读取 16 位无符号整数
   */
  private readUint16(): number {
    const value = this.view.getUint16(this.position, true)
    this.position += 2
    return value
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
   * 读取 8 位无符号整数
   */
  private readUint8(): number {
    return this.data[this.position++]
  }

  /**
   * 将 SHP 帧转换为 Canvas 图像
   */
  static toCanvas(
    frame: ShpFrame,
    palette: Uint8Array,
    width: number = frame.header.width,
    height: number = frame.header.height
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    // 转换索引色到 RGBA
    for (let i = 0; i < frame.data.length; i++) {
      const colorIndex = frame.data[i]
      const r = palette[colorIndex * 3]
      const g = palette[colorIndex * 3 + 1]
      const b = palette[colorIndex * 3 + 2]
      
      // 透明色处理 (索引 0 通常是透明)
      const alpha = colorIndex === 0 ? 0 : 255

      data[i * 4] = r
      data[i * 4 + 1] = g
      data[i * 4 + 2] = b
      data[i * 4 + 3] = alpha
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }
}

export default ShpParser
