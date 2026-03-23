/**
 * EffectSystem
 *
 * 管理视觉特效的生成、更新和销毁
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import {
  EffectComponent,
  EffectType,
  EFFECT_TYPE
} from '../components/EffectComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'

// 特效池
interface EffectPool {
  type: EffectType
  available: Entity[]
  inUse: Set<number>
}

export class EffectSystem extends EntitySystem {
  readonly priority = SystemPriority.LOW  // 特效低优先级

  // 特效池
  private effectPools: Map<EffectType, EffectPool> = new Map()

  // 最大池大小
  private maxPoolSize: number = 50

  constructor() {
    super(EFFECT_TYPE)
  }

  initialize(world: World): void {
    super.initialize(world)

    // 监听特效生成事件
    world.events.on('effect:spawn', (event: {
      type: EffectType
      position: { x: number; y?: number; z: number }
      duration?: number
      scale?: number
    }) => {
      this.spawnEffect(
        event.type,
        {
          x: event.position.x,
          y: event.position.y || 0,
          z: event.position.z
        },
        event.duration,
        event.scale
      )
    })

    // 监听特效附加事件
    world.events.on('effect:attach', (event: {
      entityId: number
      type: EffectType
      duration?: number
      offset?: { x: number; y: number; z: number }
    }) => {
      this.attachEffect(
        event.entityId,
        event.type,
        event.duration,
        event.offset
      )
    })
  }

  protected updateEntity(entity: Entity, deltaTime: number): void {
    const effect = entity.getComponent<EffectComponent>(EFFECT_TYPE)
    if (!effect) return

    // 更新特效时间
    effect.update(deltaTime)

    // 更新位置（如果有父实体）
    if (effect.parentEntity !== null) {
      effect.updatePosition(this.world)
    }

    // 检查是否完成
    if (effect.isFinished()) {
      this.recycleEffect(entity)
    }
  }

  /**
   * 生成特效
   */
  spawnEffect(
    type: EffectType,
    position: { x: number; y: number; z: number },
    duration?: number,
    scale?: number
  ): Entity {
    // 尝试从池中获取
    const entity = this.getEffectFromPool(type)

    if (entity) {
      // 重置池中的特效
      const effect = entity.getComponent<EffectComponent>(EFFECT_TYPE)
      if (effect) {
        effect.worldPosition = { ...position }
        effect.currentTime = 0
        effect.isActive = true
        effect.isPaused = false
        effect.parentEntity = null

        if (duration !== undefined) {
          effect.config.duration = duration
        }
        if (scale !== undefined) {
          effect.config.scale = scale
        }

        effect.play()
      }
      return entity
    }

    // 创建新特效
    const newEntity = this.world!.createEntity(`Effect_${type}`)
    const effect = new EffectComponent(type, position)

    if (duration !== undefined) {
      effect.config.duration = duration
    }
    if (scale !== undefined) {
      effect.config.scale = scale
    }

    newEntity.addComponent(effect)

    // 添加到池
    this.addToPool(type, newEntity)

    return newEntity
  }

  /**
   * 附加特效到实体
   */
  attachEffect(
    entityId: number,
    type: EffectType,
    duration?: number,
    offset?: { x: number; y: number; z: number }
  ): Entity | null {
    const parent = this.world?.getEntity(entityId)
    if (!parent) return null

    const transform = parent.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!transform) return null

    const position = {
      x: transform.position.x + (offset?.x || 0),
      y: transform.position.y + (offset?.y || 0),
      z: transform.position.z + (offset?.z || 0)
    }

    const effectEntity = this.spawnEffect(type, position, duration)
    const effect = effectEntity.getComponent<EffectComponent>(EFFECT_TYPE)

    if (effect) {
      effect.setParent(entityId, offset || { x: 0, y: 0, z: 0 })
    }

    return effectEntity
  }

  /**
   * 创建爆炸效果
   */
  createExplosion(
    position: { x: number; y: number; z: number },
    size: 'small' | 'medium' | 'large' | 'nuke' = 'medium'
  ): Entity {
    const typeMap: Record<string, EffectType> = {
      small: EffectType.EXPLOSION_SMALL,
      medium: EffectType.EXPLOSION_MEDIUM,
      large: EffectType.EXPLOSION_LARGE,
      nuke: EffectType.EXPLOSION_NUKE
    }

    return this.spawnEffect(typeMap[size], position)
  }

  /**
   * 创建武器轨迹
   */
  createWeaponTrail(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    type: 'bullet' | 'rocket' | 'laser' = 'bullet'
  ): Entity {
    const typeMap: Record<string, EffectType> = {
      bullet: EffectType.BULLET_TRACER,
      rocket: EffectType.ROCKET_TRAIL,
      laser: EffectType.LASER_BEAM
    }

    const midPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      z: (start.z + end.z) / 2
    }

    return this.spawnEffect(typeMap[type], midPoint)
  }

  /**
   * 创建建造效果
   */
  createConstructionEffect(
    entityId: number,
    progress: number
  ): void {
    const parent = this.world?.getEntity(entityId)
    if (!parent) return

    // 检查是否已有建造特效
    for (const effectEntity of this.entities) {
      const effect = effectEntity.getComponent<EffectComponent>(EFFECT_TYPE)
      if (effect?.effectType === EffectType.CONSTRUCTION_ANIM &&
          effect.parentEntity === entityId) {
        // 更新现有特效
        effect.currentTime = progress * effect.config.duration
        return
      }
    }

    // 创建新特效
    this.attachEffect(
      entityId,
      EffectType.CONSTRUCTION_ANIM,
      undefined,
      { x: 0, y: 0.5, z: 0 }
    )
  }

  /**
   * 清除实体的所有特效
   */
  clearEntityEffects(entityId: number): void {
    for (const effectEntity of this.entities) {
      const effect = effectEntity.getComponent<EffectComponent>(EFFECT_TYPE)
      if (effect?.parentEntity === entityId) {
        this.recycleEffect(effectEntity)
      }
    }
  }

  /**
   * 从池中获取特效
   */
  private getEffectFromPool(type: EffectType): Entity | null {
    const pool = this.effectPools.get(type)
    if (!pool || pool.available.length === 0) return null

    const entity = pool.available.pop()!
    pool.inUse.add(entity.id)
    return entity
  }

  /**
   * 添加特效到池
   */
  private addToPool(type: EffectType, entity: Entity): void {
    if (!this.effectPools.has(type)) {
      this.effectPools.set(type, {
        type,
        available: [],
        inUse: new Set()
      })
    }

    const pool = this.effectPools.get(type)!
    pool.inUse.add(entity.id)
  }

  /**
   * 回收特效
   */
  private recycleEffect(entity: Entity): void {
    const effect = entity.getComponent<EffectComponent>(EFFECT_TYPE)
    if (!effect) return

    const pool = this.effectPools.get(effect.effectType)
    if (!pool) return

    // 从使用中移除
    pool.inUse.delete(entity.id)

    // 如果池未满，添加到可用列表
    if (pool.available.length < this.maxPoolSize) {
      pool.available.push(entity)
      effect.isActive = false
    } else {
      // 池已满，销毁实体
      entity.destroy()
    }
  }

  /**
   * 预生成特效池
   */
  prewarmPool(type: EffectType, count: number): void {
    for (let i = 0; i < count; i++) {
      const entity = this.world!.createEntity(`Effect_${type}_Pooled`)
      const effect = new EffectComponent(type, { x: 0, y: 0, z: 0 })
      effect.isActive = false
      entity.addComponent(effect)
      this.addToPool(type, entity)
    }
  }

  /**
   * 清理所有特效
   */
  clearAllEffects(): void {
    for (const entity of this.entities) {
      entity.destroy()
    }
    this.effectPools.clear()
  }

  /**
   * 获取统计
   */
  getStats(): {
    totalEffects: number
    activeEffects: number
    pooledEffects: number
    byType: Partial<Record<EffectType, { active: number; pooled: number }>>
  } {
    const byType: Partial<Record<EffectType, { active: number; pooled: number }>> = {}
    let activeCount = 0

    for (const [type, pool] of this.effectPools) {
      byType[type] = {
        active: pool.inUse.size,
        pooled: pool.available.length
      }
      activeCount += pool.inUse.size
    }

    return {
      totalEffects: this.entities.size,
      activeEffects: activeCount,
      pooledEffects: this.entities.size - activeCount,
      byType
    }
  }
}
