/**
 * 战争迷雾系统
 * 
 * 处理视野计算和迷雾更新
 */

import { System, SystemPriority } from '../core/System'
import { World } from '../core/World'
import { EventBus } from '../core/EventBus'
import { ComponentType, Transform, Vision, Owner } from '../core/Component'
import { EntityId } from '../core/Entity'

export enum FogState {
  UNEXPLORED = 0,
  EXPLORED = 1,
  VISIBLE = 2
}

export interface FogGrid {
  width: number
  height: number
  cells: FogState[][]
}

export class FogOfWarSystem extends System {
  private mapWidth: number
  private mapHeight: number
  private playerFog: Map<string, FogState[][]> = new Map()
  private revealedCells: Map<string, Set<string>> = new Map() // playerId -> Set of "x,y"
  
  constructor(world: World, eventBus: EventBus, mapWidth: number, mapHeight: number) {
    super(world, eventBus, SystemPriority.FOG_OF_WAR)
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight
  }
  
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.VISION, ComponentType.OWNER]
  }
  
  /**
   * 为玩家初始化迷雾
   */
  initializePlayer(playerId: string): void {
    const grid: FogState[][] = []
    for (let x = 0; x < this.mapWidth; x++) {
      grid[x] = []
      for (let y = 0; y < this.mapHeight; y++) {
        grid[x][y] = FogState.UNEXPLORED
      }
    }
    this.playerFog.set(playerId, grid)
    this.revealedCells.set(playerId, new Set())
  }
  
  update(deltaTime: number): void {
    // 对每个玩家的迷雾进行更新
    for (const [playerId, grid] of this.playerFog) {
      this.updatePlayerFog(playerId, grid)
    }
  }
  
  private updatePlayerFog(playerId: string, grid: FogState[][]): void {
    const newlyRevealed: { x: number; y: number }[] = []
    const newlyHidden: { x: number; y: number }[] = []
    
    // 1. 将所有当前可见的格子降级为已探索
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        if (grid[x][y] === FogState.VISIBLE) {
          grid[x][y] = FogState.EXPLORED
          newlyHidden.push({ x, y })
        }
      }
    }
    
    // 2. 计算该玩家所有单位的视野
    const entities = this.getEntities()
    for (const entityId of entities) {
      const owner = this.getComponent<Owner>(entityId, ComponentType.OWNER)
      if (!owner || owner.playerId !== playerId) continue
      
      const transform = this.getComponent<Transform>(entityId, ComponentType.TRANSFORM)
      const vision = this.getComponent<Vision>(entityId, ComponentType.VISION)
      
      if (!transform || !vision) continue
      
      const revealed = this.revealArea(grid, transform, vision.range)
      newlyRevealed.push(...revealed)
    }
    
    // 3. 发送事件
    if (newlyRevealed.length > 0) {
      this.eventBus.emit('fog:revealed', { playerId, cells: newlyRevealed })
    }
    if (newlyHidden.length > 0) {
      this.eventBus.emit('fog:hidden', { playerId, cells: newlyHidden })
    }
  }
  
  private revealArea(
    grid: FogState[][],
    transform: Transform,
    range: number
  ): { x: number; y: number }[] {
    const revealed: { x: number; y: number }[] = []
    const centerX = Math.floor(transform.x)
    const centerY = Math.floor(transform.z)
    const rangeSq = range * range
    
    for (let dx = -Math.ceil(range); dx <= Math.ceil(range); dx++) {
      for (let dy = -Math.ceil(range); dy <= Math.ceil(range); dy++) {
        // 圆形范围检查
        if (dx * dx + dy * dy > rangeSq) continue
        
        const x = centerX + dx
        const y = centerY + dy
        
        // 边界检查
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) continue
        
        // TODO: 视线检查（考虑障碍物）
        // if (!this.hasLineOfSight(centerX, centerY, x, y)) continue
        
        if (grid[x][y] !== FogState.VISIBLE) {
          grid[x][y] = FogState.VISIBLE
          revealed.push({ x, y })
        }
      }
    }
    
    return revealed
  }
  
  /**
   * 获取某位置的迷雾状态
   */
  getVisibility(x: number, y: number, playerId: string): FogState {
    const grid = this.playerFog.get(playerId)
    if (!grid) return FogState.UNEXPLORED
    
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return FogState.UNEXPLORED
    }
    
    return grid[x][y]
  }
  
  /**
   * 检查是否可见
   */
  isVisible(x: number, y: number, playerId: string): boolean {
    return this.getVisibility(x, y, playerId) === FogState.VISIBLE
  }
  
  /**
   * 检查是否已探索
   */
  isExplored(x: number, y: number, playerId: string): boolean {
    const state = this.getVisibility(x, y, playerId)
    return state === FogState.EXPLORED || state === FogState.VISIBLE
  }
  
  /**
   * 揭示整个地图（用于调试或观战）
   */
  revealAll(playerId: string): void {
    const grid = this.playerFog.get(playerId)
    if (!grid) return
    
    const revealed: { x: number; y: number }[] = []
    
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        if (grid[x][y] !== FogState.VISIBLE) {
          grid[x][y] = FogState.VISIBLE
          revealed.push({ x, y })
        }
      }
    }
    
    if (revealed.length > 0) {
      this.eventBus.emit('fog:revealed', { playerId, cells: revealed })
    }
  }
  
  /**
   * 获取用于渲染的纹理数据
   */
  generateTextureData(playerId: string): Uint8Array {
    const grid = this.playerFog.get(playerId)
    if (!grid) return new Uint8Array(0)
    
    const data = new Uint8Array(this.mapWidth * this.mapHeight * 4)
    
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const index = (y * this.mapWidth + x) * 4
        const state = grid[x][y]
        
        // R, G, B, A
        switch (state) {
          case FogState.UNEXPLORED:
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
            data[index + 3] = 255      // 完全不透明（黑色）
            break
          case FogState.EXPLORED:
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
            data[index + 3] = 128      // 半透明（灰色）
            break
          case FogState.VISIBLE:
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
            data[index + 3] = 0        // 完全透明
            break
        }
      }
    }
    
    return data
  }
  
  /**
   * 获取玩家的迷雾网格（用于调试）
   */
  getGrid(playerId: string): FogState[][] | undefined {
    return this.playerFog.get(playerId)
  }
}
