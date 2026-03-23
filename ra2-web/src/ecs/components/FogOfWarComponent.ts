/**
 * FogOfWar 组件
 * 
 * 管理战争迷雾状态
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const FOG_OF_WAR_TYPE: ComponentType = 'fog_of_war'

// 迷雾状态
export enum FogCellState {
  HIDDEN = 0,      // 未探索（黑色）
  REVEALED = 1,    // 已探索但当前不可见（灰色）
  VISIBLE = 2      // 当前可见
}

// 迷雾层
export interface FogLayer {
  // 地图尺寸
  width: number
  height: number
  
  // 迷雾数据（二维数组）
  data: FogCellState[]
  
  // 版本号（用于增量更新）
  version: number
}

export class FogOfWarComponent extends Component {
  readonly type = FOG_OF_WAR_TYPE

  // 迷雾层（按玩家ID）
  layers: Map<string, FogLayer>

  // 当前实体可探索的迷雾（用于探测单位）
  revealRadius: number

  // 是否提供永久视野（如防御塔）
  providesPermanentVision: boolean

  // 是否反隐形
  detectsStealth: boolean

  // 反隐形范围
  detectionRadius: number

  constructor(
    revealRadius: number = 5,
    providesPermanentVision: boolean = false,
    detectsStealth: boolean = false
  ) {
    super()
    this.layers = new Map()
    this.revealRadius = revealRadius
    this.providesPermanentVision = providesPermanentVision
    this.detectsStealth = detectsStealth
    this.detectionRadius = detectsStealth ? revealRadius : 0
  }

  /**
   * 初始化玩家的迷雾层
   */
  initLayer(playerId: string, width: number, height: number): void {
    const layer: FogLayer = {
      width,
      height,
      data: new Array(width * height).fill(FogCellState.HIDDEN),
      version: 0
    }
    this.layers.set(playerId, layer)
  }

  /**
   * 获取指定位置的迷雾状态
   */
  getCellState(playerId: string, x: number, y: number): FogCellState {
    const layer = this.layers.get(playerId)
    if (!layer) return FogCellState.HIDDEN

    if (x < 0 || x >= layer.width || y < 0 || y >= layer.height) {
      return FogCellState.HIDDEN
    }

    return layer.data[y * layer.width + x]
  }

  /**
   * 设置指定位置的迷雾状态
   */
  setCellState(playerId: string, x: number, y: number, state: FogCellState): void {
    const layer = this.layers.get(playerId)
    if (!layer) return

    if (x < 0 || x >= layer.width || y < 0 || y >= layer.height) {
      return
    }

    const index = y * layer.width + x
    if (layer.data[index] !== state) {
      layer.data[index] = state
      layer.version++
    }
  }

  /**
   * 揭示区域
   */
  revealArea(playerId: string, centerX: number, centerY: number, radius: number): void {
    const layer = this.layers.get(playerId)
    if (!layer) return

    const radiusSq = radius * radius

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radiusSq) {
          const x = Math.floor(centerX + dx)
          const y = Math.floor(centerY + dy)
          
          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
            const index = y * layer.width + x
            if (layer.data[index] === FogCellState.HIDDEN) {
              layer.data[index] = FogCellState.REVEALED
            }
          }
        }
      }
    }
  }

  /**
   * 使区域可见
   */
  makeVisible(playerId: string, centerX: number, centerY: number, radius: number): void {
    const layer = this.layers.get(playerId)
    if (!layer) return

    const radiusSq = radius * radius

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radiusSq) {
          const x = Math.floor(centerX + dx)
          const y = Math.floor(centerY + dy)
          
          if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
            const index = y * layer.width + x
            if (layer.data[index] !== FogCellState.VISIBLE) {
              layer.data[index] = FogCellState.VISIBLE
              layer.version++
            }
          }
        }
      }
    }
  }

  /**
   * 将所有可见区域重置为已探索（每帧开始时调用）
   */
  resetVisibleToRevealed(playerId: string): void {
    const layer = this.layers.get(playerId)
    if (!layer) return

    let changed = false
    for (let i = 0; i < layer.data.length; i++) {
      if (layer.data[i] === FogCellState.VISIBLE) {
        layer.data[i] = FogCellState.REVEALED
        changed = true
      }
    }

    if (changed) {
      layer.version++
    }
  }

  /**
   * 检查位置是否可见
   */
  isVisible(playerId: string, x: number, y: number): boolean {
    return this.getCellState(playerId, x, y) === FogCellState.VISIBLE
  }

  /**
   * 检查位置是否已探索（曾经可见）
   */
  isRevealed(playerId: string, x: number, y: number): boolean {
    const state = this.getCellState(playerId, x, y)
    return state === FogCellState.VISIBLE || state === FogCellState.REVEALED
  }

  /**
   * 获取迷雾层版本
   */
  getLayerVersion(playerId: string): number {
    return this.layers.get(playerId)?.version || 0
  }

  /**
   * 序列化迷雾数据（用于存档/同步）
   */
  serializeLayer(playerId: string): Uint8Array | null {
    const layer = this.layers.get(playerId)
    if (!layer) return null

    // 每个单元格用2个bit存储
    const buffer = new Uint8Array(Math.ceil(layer.data.length / 4))
    
    for (let i = 0; i < layer.data.length; i++) {
      const byteIndex = Math.floor(i / 4)
      const bitOffset = (i % 4) * 2
      buffer[byteIndex] |= layer.data[i] << bitOffset
    }

    return buffer
  }

  /**
   * 反序列化迷雾数据
   */
  deserializeLayer(playerId: string, data: Uint8Array, width: number, height: number): void {
    const layer: FogLayer = {
      width,
      height,
      data: new Array(width * height),
      version: 0
    }

    for (let i = 0; i < layer.data.length; i++) {
      const byteIndex = Math.floor(i / 4)
      const bitOffset = (i % 4) * 2
      layer.data[i] = (data[byteIndex] >> bitOffset) & 0x03
    }

    this.layers.set(playerId, layer)
  }

  clone(): FogOfWarComponent {
    const clone = new FogOfWarComponent(
      this.revealRadius,
      this.providesPermanentVision,
      this.detectsStealth
    )
    clone.detectionRadius = this.detectionRadius
    
    // 复制迷雾层
    for (const [playerId, layer] of this.layers) {
      clone.initLayer(playerId, layer.width, layer.height)
      const newLayer = clone.layers.get(playerId)!
      newLayer.data = [...layer.data]
      newLayer.version = layer.version
    }
    
    return clone
  }

  serialize(): Record<string, unknown> {
    const layers: Record<string, { width: number; height: number; data: number[]; version: number }> = {}
    
    for (const [playerId, layer] of this.layers) {
      layers[playerId] = {
        width: layer.width,
        height: layer.height,
        data: layer.data,
        version: layer.version
      }
    }

    return {
      layers,
      revealRadius: this.revealRadius,
      providesPermanentVision: this.providesPermanentVision,
      detectsStealth: this.detectsStealth,
      detectionRadius: this.detectionRadius
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.revealRadius !== undefined) this.revealRadius = data.revealRadius as number
    if (data.providesPermanentVision !== undefined) this.providesPermanentVision = data.providesPermanentVision as boolean
    if (data.detectsStealth !== undefined) this.detectsStealth = data.detectsStealth as boolean
    if (data.detectionRadius !== undefined) this.detectionRadius = data.detectionRadius as number

    if (data.layers) {
      const layersData = data.layers as Record<string, { width: number; height: number; data: number[]; version: number }>
      for (const [playerId, layerData] of Object.entries(layersData)) {
        const layer: FogLayer = {
          width: layerData.width,
          height: layerData.height,
          data: [...layerData.data],
          version: layerData.version
        }
        this.layers.set(playerId, layer)
      }
    }
  }
}

// 注册组件类型
registerComponentType(FOG_OF_WAR_TYPE, FogOfWarComponent)
