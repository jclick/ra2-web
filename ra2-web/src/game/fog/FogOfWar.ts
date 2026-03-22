import { GameMap } from '../map/GameMap'
import { Unit } from '../objects/Unit'
import { MapCell } from '../types'

/**
 * 战争迷雾系统
 * 
 * 每个地图单元格有三种状态：
 * - Unexplored: 未探索（黑色）
 * - Explored: 已探索但当前不可见（灰色/半透明）
 * - Visible: 当前可见（正常显示）
 */

export enum FogCellState {
  UNEXPLORED = 0,
  EXPLORED = 1,
  VISIBLE = 2,
}

export interface FogCell {
  x: number
  y: number
  state: FogCellState
  lastVisibleTime: number
}

/**
 * 战争迷雾管理器
 */
export class FogOfWar {
  private map: GameMap
  private width: number
  private height: number
  
  // 迷雾状态网格
  private fogGrid: FogCellState[][]
  
  // 每个玩家的迷雾（用于多人游戏）
  private playerFog: Map<string, FogCellState[][]> = new Map()
  
  // 配置
  // private shroudDelay: number = 5000 // 5秒后变为已探索但未显示
  // private revealRadiusSmoothness: number = 0.5
  
  // 回调
  private onFogUpdated?: () => void
  
  constructor(map: GameMap, _usePerPlayerFog: boolean = false) {
    this.map = map
    this.width = map.getWidth()
    this.height = map.getHeight()
    
    // 初始化迷雾网格
    this.fogGrid = []
    for (let x = 0; x < this.width; x++) {
      this.fogGrid[x] = []
      for (let y = 0; y < this.height; y++) {
        this.fogGrid[x][y] = FogCellState.UNEXPLORED
      }
    }
  }
  
  /**
   * 为玩家初始化迷雾
   */
  initializeForPlayer(playerId: string): void {
    const grid: FogCellState[][] = []
    for (let x = 0; x < this.width; x++) {
      grid[x] = []
      for (let y = 0; y < this.height; y++) {
        grid[x][y] = FogCellState.UNEXPLORED
      }
    }
    this.playerFog.set(playerId, grid)
  }
  
  /**
   * 更新迷雾（基于单位视野）
   */
  update(units: Unit[], playerId?: string): void {
    const grid = playerId ? this.playerFog.get(playerId) : this.fogGrid
    if (!grid) return
    
    // 1. 将所有可见单元格降级为已探索
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (grid[x][y] === FogCellState.VISIBLE) {
          grid[x][y] = FogCellState.EXPLORED
        }
      }
    }
    
    // 2. 根据单位视野揭示区域
    for (const unit of units) {
      // 只处理指定玩家的单位，或处理所有单位
      if (playerId && (unit as any).owner?.id !== playerId) continue
      
      const sight = unit.stats.sight
      const centerX = Math.floor(unit.position.x)
      const centerY = Math.floor(unit.position.z)
      
      this.revealArea(centerX, centerY, sight, grid)
    }
    
    this.onFogUpdated?.()
  }
  
  /**
   * 揭示圆形区域
   */
  private revealArea(
    centerX: number,
    centerY: number,
    radius: number,
    grid: FogCellState[][]
  ): void {
    const radiusSq = radius * radius
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx
        const y = centerY + dy
        
        // 检查是否在圆形范围内
        if (dx * dx + dy * dy > radiusSq) continue
        
        // 检查是否在地图范围内
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue
        
        // 检查视线（简单实现：检查是否有障碍物阻挡）
        if (!this.hasLineOfSight(centerX, centerY, x, y)) continue
        
        grid[x][y] = FogCellState.VISIBLE
      }
    }
  }
  
  /**
   * 检查两点之间是否有视线
   * 使用Bresenham算法
   */
  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    
    let x = x0
    let y = y0
    
    const xStep = x0 < x1 ? 1 : -1
    const yStep = y0 < y1 ? 1 : -1
    
    let err = dx - dy
    
    while (x !== x1 || y !== y1) {
      const e2 = 2 * err
      
      if (e2 > -dy) {
        err -= dy
        x += xStep
      }
      if (e2 < dx) {
        err += dx
        y += yStep
      }
      
      // 检查当前格子是否阻挡视线
      if (x !== x0 || y !== y0) {
        const cell = this.map.getCell(x, y)
        if (cell && this.blocksSight(cell)) {
          return false
        }
      }
    }
    
    return true
  }
  
  /**
   * 检查单元格是否阻挡视线
   */
  private blocksSight(cell: MapCell): boolean {
    // 高地、建筑物等会阻挡视线
    // 简化实现：只有高墙会阻挡
    return cell.terrainType === 'Rock' || cell.object !== undefined
  }
  
  /**
   * 获取单元格迷雾状态
   */
  getCellState(x: number, y: number, playerId?: string): FogCellState {
    const grid = playerId ? this.playerFog.get(playerId) : this.fogGrid
    if (!grid || x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return FogCellState.UNEXPLORED
    }
    return grid[x][y]
  }
  
  /**
   * 检查单元格是否可见
   */
  isVisible(x: number, y: number, playerId?: string): boolean {
    return this.getCellState(x, y, playerId) === FogCellState.VISIBLE
  }
  
  /**
   * 检查单元格是否已探索
   */
  isExplored(x: number, y: number, playerId?: string): boolean {
    const state = this.getCellState(x, y, playerId)
    return state === FogCellState.EXPLORED || state === FogCellState.VISIBLE
  }
  
  /**
   * 立即揭示整个地图（用于调试）
   */
  revealAll(playerId?: string): void {
    const grid = playerId ? this.playerFog.get(playerId) : this.fogGrid
    if (!grid) return
    
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        grid[x][y] = FogCellState.VISIBLE
      }
    }
    
    this.onFogUpdated?.()
  }
  
  /**
   * 重置迷雾
   */
  reset(playerId?: string): void {
    const grid = playerId ? this.playerFog.get(playerId) : this.fogGrid
    if (!grid) return
    
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        grid[x][y] = FogCellState.UNEXPLORED
      }
    }
    
    this.onFogUpdated?.()
  }
  
  /**
   * 获取可见区域边界（用于相机裁剪）
   */
  getVisibleBounds(playerId?: string): { minX: number; maxX: number; minY: number; maxY: number } | null {
    const grid = playerId ? this.playerFog.get(playerId) : this.fogGrid
    if (!grid) return null
    
    let minX = this.width
    let maxX = 0
    let minY = this.height
    let maxY = 0
    
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (grid[x][y] === FogCellState.VISIBLE) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    if (minX > maxX) return null
    
    return { minX, maxX, minY, maxY }
  }
  
  /**
   * 生成迷雾纹理数据（用于着色器）
   */
  generateTextureData(playerId?: string): Uint8Array {
    const grid = playerId ? this.playerFog.get(playerId) : this.fogGrid
    if (!grid) return new Uint8Array(0)
    
    const data = new Uint8Array(this.width * this.height * 4)
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = (y * this.width + x) * 4
        const state = grid[x][y]
        
        switch (state) {
          case FogCellState.UNEXPLORED:
            // 黑色
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
            data[index + 3] = 255
            break
          case FogCellState.EXPLORED:
            // 半透明灰色（已探索但未显示）
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
            data[index + 3] = 128
            break
          case FogCellState.VISIBLE:
            // 完全透明
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
            data[index + 3] = 0
            break
        }
      }
    }
    
    return data
  }
  
  /**
   * 设置迷雾更新回调
   */
  onUpdate(callback: () => void): void {
    this.onFogUpdated = callback
  }
}

/**
 * 简化版战争迷雾（用于单人游戏）
 */
export class SimpleFogOfWar {
  private fog: FogOfWar
  
  constructor(map: GameMap) {
    this.fog = new FogOfWar(map, false)
  }
  
  update(units: Unit[]): void {
    this.fog.update(units)
  }
  
  isVisible(x: number, y: number): boolean {
    return this.fog.isVisible(x, y)
  }
  
  isExplored(x: number, y: number): boolean {
    return this.fog.isExplored(x, y)
  }
  
  revealAll(): void {
    this.fog.revealAll()
  }
  
  onUpdate(callback: () => void): void {
    this.fog.onUpdate(callback)
  }
}
