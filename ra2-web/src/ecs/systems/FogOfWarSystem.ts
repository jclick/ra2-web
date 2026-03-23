/**
 * FogOfWarSystem
 * 
 * 处理战争迷雾更新
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import { 
  FogOfWarComponent, 
  FogCellState, 
  FOG_OF_WAR_TYPE,
  FogLayer 
} from '../components/FogOfWarComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { VisionComponent, VISION_TYPE } from '../components/VisionComponent'
import { OwnerComponent, OWNER_TYPE } from '../components/OwnerComponent'
import { ConstructionComponent, CONSTRUCTION_TYPE } from '../components/ConstructionComponent'

// 视野贡献者
interface VisionContributor {
  entity: Entity
  position: { x: number; z: number }
  radius: number
  playerId: string
  isBuilding: boolean
  isActive: boolean
}

export class FogOfWarSystem extends EntitySystem {
  readonly priority = SystemPriority.NORMAL

  // 全局迷雾组件（通常是世界的组件）
  private globalFog: FogOfWarComponent | null = null

  // 地图尺寸
  private mapWidth: number = 0
  private mapHeight: number = 0

  constructor(mapWidth: number = 128, mapHeight: number = 128) {
    super(FOG_OF_WAR_TYPE)
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight
  }

  /**
   * 更新单个实体（FogOfWarSystem 是全局系统，不需要逐个实体更新）
   */
  protected updateEntity(_entity: Entity, _deltaTime: number): void {
    // 战争迷雾是全局系统，在 update 中统一处理
  }

  initialize(world: World): void {
    super.initialize(world)

    // 寻找或创建全局迷雾组件
    const worldEntity = world.getEntity(0) // 世界实体通常是ID 0
    if (worldEntity) {
      this.globalFog = worldEntity.getComponent<FogOfWarComponent>(FOG_OF_WAR_TYPE)
    }

    // 如果没有全局迷雾，创建一个
    if (!this.globalFog) {
      this.globalFog = new FogOfWarComponent()
      // 初始化所有玩家的迷雾层
      // 注意：实际游戏中应该根据玩家列表初始化
    }
  }

  /**
   * 更新迷雾
   */
  update(_deltaTime: number): void {
    if (!this.globalFog) return

    // 获取所有视野贡献者
    const contributors = this.collectVisionContributors()

    // 重置所有玩家的可见区域为已探索
    for (const playerId of this.globalFog.layers.keys()) {
      this.globalFog.resetVisibleToRevealed(playerId)
    }

    // 更新每个玩家的视野
    for (const playerId of this.globalFog.layers.keys()) {
      this.updatePlayerVision(playerId, contributors)
    }

    // 发送迷雾更新事件
    this.emitFogUpdateEvents()
  }

  /**
   * 收集所有视野贡献者
   */
  private collectVisionContributors(): VisionContributor[] {
    const contributors: VisionContributor[] = []

    for (const entity of this.world?.getAllEntities() || []) {
      const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
      const vision = entity.getComponent<VisionComponent>(VISION_TYPE)
      const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
      const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)

      if (!transform || !vision || !owner) continue

      // 检查单位是否活跃（建筑需要完成建造）
      let isActive = true
      if (construction) {
        isActive = construction.isCompleted()
      }

      contributors.push({
        entity,
        position: { x: transform.position.x, z: transform.position.z },
        radius: vision.currentRadius || vision.radius,
        playerId: owner.playerId,
        isBuilding: !!construction,
        isActive
      })
    }

    return contributors
  }

  /**
   * 更新指定玩家的视野
   */
  private updatePlayerVision(
    playerId: string, 
    contributors: VisionContributor[]
  ): void {
    if (!this.globalFog) return

    // 获取该玩家的视野贡献者
    const playerContributors = contributors.filter(c => 
      c.playerId === playerId && c.isActive
    )

    // 更新视野
    for (const contributor of playerContributors) {
      const gridX = Math.floor(contributor.position.x)
      const gridY = Math.floor(contributor.position.z)
      
      // 使区域可见
      this.globalFog.makeVisible(playerId, gridX, gridY, contributor.radius)
      
      // 揭示区域（首次可见后变为已探索）
      this.globalFog.revealArea(playerId, gridX, gridY, contributor.radius)
    }
  }

  /**
   * 发送迷雾更新事件
   */
  private emitFogUpdateEvents(): void {
    if (!this.globalFog) return

    for (const [playerId, layer] of this.globalFog.layers) {
      this.world?.events.emit('fog_of_war:updated', {
        playerId,
        version: layer.version,
        width: layer.width,
        height: layer.height
      })
    }
  }

  /**
   * 检查位置对指定玩家是否可见
   */
  isVisibleToPlayer(playerId: string, x: number, y: number): boolean {
    if (!this.globalFog) return true // 无迷雾时默认可见
    return this.globalFog.isVisible(playerId, Math.floor(x), Math.floor(y))
  }

  /**
   * 检查位置对指定玩家是否已探索
   */
  isRevealedToPlayer(playerId: string, x: number, y: number): boolean {
    if (!this.globalFog) return true
    return this.globalFog.isRevealed(playerId, Math.floor(x), Math.floor(y))
  }

  /**
   * 检查实体是否对指定玩家可见
   */
  isEntityVisibleToPlayer(entity: Entity, playerId: string): boolean {
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!transform) return false

    return this.isVisibleToPlayer(
      playerId, 
      transform.position.x, 
      transform.position.z
    )
  }

  /**
   * 检查实体是否对指定玩家可探测（考虑隐形）
   */
  isEntityDetectableByPlayer(entity: Entity, playerId: string): boolean {
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const vision = entity.getComponent<VisionComponent>(VISION_TYPE)
    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)

    if (!transform) return false

    // 友方单位总是可见的
    if (owner?.playerId === playerId) return true

    // 检查是否被战争迷雾遮挡
    if (!this.isVisibleToPlayer(playerId, transform.position.x, transform.position.z)) {
      return false
    }

    // 如果单位隐形，检查是否有探测器
    if (vision?.isStealth) {
      return this.hasDetectorNearby(
        playerId, 
        transform.position.x, 
        transform.position.z
      )
    }

    return true
  }

  /**
   * 检查指定玩家是否在指定位置有探测器
   */
  private hasDetectorNearby(playerId: string, x: number, z: number): boolean {
    for (const entity of this.world?.getAllEntities() || []) {
      const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
      const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
      const fog = entity.getComponent<FogOfWarComponent>(FOG_OF_WAR_TYPE)

      if (!transform || !owner || !fog) continue
      if (owner.playerId !== playerId) continue
      if (!fog.detectsStealth) continue

      const dx = transform.position.x - x
      const dz = transform.position.z - z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= fog.detectionRadius) {
        return true
      }
    }

    return false
  }

  /**
   * 获取指定位置的迷雾状态
   */
  getCellState(playerId: string, x: number, y: number): FogCellState {
    if (!this.globalFog) return FogCellState.VISIBLE
    return this.globalFog.getCellState(playerId, Math.floor(x), Math.floor(y))
  }

  /**
   * 初始化玩家迷雾
   */
  initPlayerFog(playerId: string): void {
    if (!this.globalFog) return
    this.globalFog.initLayer(playerId, this.mapWidth, this.mapHeight)
  }

  /**
   * 揭示整个地图（用于调试或观战）
   */
  revealAll(playerId: string): void {
    if (!this.globalFog) return

    const layer = this.globalFog.layers.get(playerId)
    if (!layer) return

    for (let i = 0; i < layer.data.length; i++) {
      layer.data[i] = FogCellState.VISIBLE
    }
    layer.version++
  }

  /**
   * 隐藏整个地图
   */
  hideAll(playerId: string): void {
    if (!this.globalFog) return

    const layer = this.globalFog.layers.get(playerId)
    if (!layer) return

    for (let i = 0; i < layer.data.length; i++) {
      layer.data[i] = FogCellState.HIDDEN
    }
    layer.version++
  }

  /**
   * 获取迷雾统计
   */
  getStats(playerId: string): { revealed: number; hidden: number; visible: number } {
    if (!this.globalFog) return { revealed: 0, hidden: 0, visible: 0 }

    const layer = this.globalFog.layers.get(playerId)
    if (!layer) return { revealed: 0, hidden: 0, visible: 0 }

    const stats = { revealed: 0, hidden: 0, visible: 0 }
    
    for (const cell of layer.data) {
      switch (cell) {
        case FogCellState.HIDDEN:
          stats.hidden++
          break
        case FogCellState.REVEALED:
          stats.revealed++
          break
        case FogCellState.VISIBLE:
          stats.visible++
          break
      }
    }

    return stats
  }

  /**
   * 获取迷雾层数据（用于渲染）
   */
  getLayerData(playerId: string): FogLayer | null {
    return this.globalFog?.layers.get(playerId) || null
  }
}
