/**
 * Movement Adapter
 * 
 * Week 6: 新旧系统适配器
 * 在现有 Unit 类和 ECS MovementSystem 之间桥接
 */

import { Unit } from '../../game/objects/Unit'
import { GameManager } from '../../game/GameManager'
import {
  World,
  Entity,
  TransformComponent,
  MovementComponent,
  MovementType,
  MovementSystem,
  MOVEMENT_TYPE,
  TRANSFORM_TYPE
} from '../'
import { Vector3 } from '../../game/types'

/**
 * 移动适配器选项
 */
export interface MovementAdapterOptions {
  // 是否启用 ECS 移动系统
  useECS: boolean
  // 是否同步位置回 Unit（双向同步）
  syncToUnit: boolean
  // 是否同步位置到 ECS（双向同步）
  syncToECS: boolean
}

/**
 * 单位-实体映射
 */
interface UnitEntityMapping {
  unit: Unit
  entity: Entity
  lastPosition: Vector3
  lastRotation: number
}

/**
 * Movement Adapter
 * 
 * 管理 Unit 实例和 ECS Entity 之间的映射和同步
 */
export class MovementAdapter {
  private gameManager: GameManager
  private world: World
  private movementSystem: MovementSystem
  private options: MovementAdapterOptions

  // 单位到实体的映射
  private unitMap: Map<string, UnitEntityMapping> = new Map()

  // ECS Entity 到单位的映射
  private entityMap: Map<number, string> = new Map()

  constructor(
    gameManager: GameManager,
    world: World,
    options: Partial<MovementAdapterOptions> = {}
  ) {
    this.gameManager = gameManager
    this.world = world
    this.options = {
      useECS: true,
      syncToUnit: true,
      syncToECS: true,
      ...options
    }

    // 获取或创建 MovementSystem
    const existingSystem = world.getAllSystems().find(s => s instanceof MovementSystem)
    if (existingSystem) {
      this.movementSystem = existingSystem as MovementSystem
    } else {
      this.movementSystem = new MovementSystem()
      world.addSystem(this.movementSystem)
    }
  }

  /**
   * 注册单位到 ECS
   */
  registerUnit(unit: Unit): Entity {
    // 检查是否已注册
    if (this.unitMap.has(unit.id)) {
      return this.unitMap.get(unit.id)!.entity
    }

    // 创建实体
    const entity = this.world.createEntity(`Unit_${unit.id}`)

    // 添加 Transform 组件
    const transform = new TransformComponent(
      { ...unit.position },
      { x: 0, y: unit.rotation * (Math.PI / 180), z: 0 }
    )
    entity.addComponent(transform)

    // 添加 Movement 组件
    const movementTypeMap: Record<string, MovementType> = {
      foot: MovementType.FOOT,
      track: MovementType.TRACK,
      wheel: MovementType.WHEEL,
      hover: MovementType.HOVER,
      fly: MovementType.FLY
    }
    const movement = new MovementComponent(
      unit.stats.speed,
      unit.stats.turnRate,
      movementTypeMap[unit.stats.movementType] || MovementType.TRACK
    )
    entity.addComponent(movement)

    // 保存映射
    this.unitMap.set(unit.id, {
      unit,
      entity,
      lastPosition: { ...unit.position },
      lastRotation: unit.rotation
    })
    this.entityMap.set(entity.id, unit.id)

    return entity
  }

  /**
   * 注销单位
   */
  unregisterUnit(unitId: string): boolean {
    const mapping = this.unitMap.get(unitId)
    if (!mapping) return false

    // 从 ECS 世界移除实体
    this.world.removeEntity(mapping.entity)

    // 清除映射
    this.entityMap.delete(mapping.entity.id)
    this.unitMap.delete(unitId)

    return true
  }

  /**
   * 命令单位移动
   */
  moveUnit(unitId: string, destination: Vector3): boolean {
    if (!this.options.useECS) {
      // 使用旧系统
      const unit = this.gameManager.units.get(unitId)
      if (!unit) return false
      unit.moveTo(destination)
      return true
    }

    // 使用 ECS
    const mapping = this.unitMap.get(unitId)
    if (!mapping) {
      // 自动注册
      const unit = this.gameManager.units.get(unitId)
      if (!unit) return false
      this.registerUnit(unit)
      return this.moveUnit(unitId, destination)
    }

    return this.movementSystem.moveTo(mapping.entity, destination)
  }

  /**
   * 命令单位停止
   */
  stopUnit(unitId: string): boolean {
    if (!this.options.useECS) {
      const unit = this.gameManager.units.get(unitId)
      if (!unit) return false
      unit.stop()
      return true
    }

    const mapping = this.unitMap.get(unitId)
    if (!mapping) return false

    return this.movementSystem.stop(mapping.entity)
  }

  /**
   * 同步 Unit 位置到 ECS
   */
  syncUnitToECS(unitId: string): boolean {
    if (!this.options.syncToECS) return false

    const mapping = this.unitMap.get(unitId)
    if (!mapping) return false

    const transform = mapping.entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!transform) return false

    // 检查是否有显著变化
    const pos = mapping.unit.position
    const rot = mapping.unit.rotation

    if (
      Math.abs(pos.x - mapping.lastPosition.x) > 0.01 ||
      Math.abs(pos.z - mapping.lastPosition.z) > 0.01 ||
      Math.abs(rot - mapping.lastRotation) > 1
    ) {
      transform.position.x = pos.x
      transform.position.z = pos.z
      transform.rotation.y = rot * (Math.PI / 180)

      mapping.lastPosition = { ...pos }
      mapping.lastRotation = rot
    }

    return true
  }

  /**
   * 同步 ECS 位置到 Unit
   */
  syncECSToUnit(unitId: string): boolean {
    if (!this.options.syncToUnit) return false

    const mapping = this.unitMap.get(unitId)
    if (!mapping) return false

    const transform = mapping.entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const movement = mapping.entity.getComponent<MovementComponent>(MOVEMENT_TYPE)
    if (!transform || !movement) return false

    // 同步位置
    mapping.unit.position.x = transform.position.x
    mapping.unit.position.z = transform.position.z

    // 使用渲染插值位置（更平滑）
    mapping.unit.renderPosition.x = movement.renderPosition.x
    mapping.unit.renderPosition.y = movement.renderPosition.y
    mapping.unit.renderPosition.z = movement.renderPosition.z

    // 同步旋转
    mapping.unit.rotation = transform.rotation.y * (180 / Math.PI)
    mapping.unit.renderRotation = movement.renderRotation

    return true
  }

  /**
   * 更新所有同步
   * 每帧调用
   */
  update(_deltaTime: number): void {
    if (!this.options.useECS) return

    // 同步 Unit -> ECS
    if (this.options.syncToECS) {
      for (const [unitId] of this.unitMap) {
        this.syncUnitToECS(unitId)
      }
    }

    // ECS 系统更新（由 World 处理）
    // this.world.update(deltaTime)

    // 同步 ECS -> Unit
    if (this.options.syncToUnit) {
      for (const [unitId] of this.unitMap) {
        this.syncECSToUnit(unitId)
      }
    }
  }

  /**
   * 注册所有现有单位
   */
  registerAllUnits(): void {
    for (const unit of this.gameManager.units.values()) {
      this.registerUnit(unit)
    }
  }

  /**
   * 获取映射统计
   */
  getStats() {
    return {
      registeredUnits: this.unitMap.size,
      registeredEntities: this.entityMap.size
    }
  }

  /**
   * 清理所有映射
   */
  clear(): void {
    for (const mapping of this.unitMap.values()) {
      this.world.removeEntity(mapping.entity)
    }
    this.unitMap.clear()
    this.entityMap.clear()
  }
}
