/**
 * AIQueries
 * 
 * 行为树条件查询
 */

import { World } from '../core/World'
import { Entity } from '../core/Entity'
import { AIComponent, AI_TYPE, AIState } from '../components/AIComponent'
import { HealthComponent, HEALTH_TYPE } from '../components/HealthComponent'
import { CombatComponent, COMBAT_TYPE } from '../components/CombatComponent'
import { MovementComponent, MOVEMENT_TYPE } from '../components/MovementComponent'
import { EconomyComponent, ECONOMY_TYPE, HarvesterState } from '../components/EconomyComponent'
import { OwnerComponent, OWNER_TYPE, Relationship } from '../components/OwnerComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'

export class AIQueries {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  /**
   * 获取实体
   */
  private getEntity(entityId: number): Entity | null {
    return this.world.getEntity(entityId)
  }

  /**
   * 检查是否在被攻击
   */
  isUnderAttack(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return false

    // 检查上次被攻击时间是否在5秒内
    return ai.getTimeSinceLastAttack() < 5
  }

  /**
   * 获取生命值百分比
   */
  getHealthPercent(entityId: number): number {
    const entity = this.getEntity(entityId)
    if (!entity) return 0

    const health = entity.getComponent<HealthComponent>(HEALTH_TYPE)
    if (!health) return 1

    return health.getHealthPercent()
  }

  /**
   * 设置AI状态
   */
  setAIState(entityId: number, state: AIState): void {
    const entity = this.getEntity(entityId)
    if (!entity) return

    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (ai) {
      ai.setState(state)
    }
  }
}

export class CombatQueries {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  /**
   * 获取实体
   */
  private getEntity(entityId: number): Entity | null {
    return this.world.getEntity(entityId)
  }

  /**
   * 检查范围内是否有敌人
   */
  hasEnemyInRange(entityId: number, range: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    
    if (!transform || !owner) return false

    // 遍历所有实体检查敌人
    for (const other of this.world.getAllEntities()) {
      if (other.id === entityId) continue

      const otherTransform = other.getComponent<TransformComponent>(TRANSFORM_TYPE)
      const otherOwner = other.getComponent<OwnerComponent>(OWNER_TYPE)

      if (!otherTransform || !otherOwner) continue

      // 检查是否为敌人
      if (owner.getRelationshipTo(otherOwner) !== Relationship.ENEMY) {
        continue
      }

      // 检查距离
      const dx = otherTransform.position.x - transform.position.x
      const dz = otherTransform.position.z - transform.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= range) {
        return true
      }
    }

    return false
  }

  /**
   * 检查是否有有效目标
   */
  hasValidTarget(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)
    if (!combat) return false

    // 检查当前目标是否有效
    if (!combat.targetId) return false

    const target = this.world.getEntity(combat.targetId)
    if (!target) return false

    const targetHealth = target.getComponent<HealthComponent>(HEALTH_TYPE)
    return targetHealth ? !targetHealth.isDead() : false
  }

  /**
   * 获取最近的敌人
   */
  getNearestEnemy(entityId: number): Entity | null {
    const entity = this.getEntity(entityId)
    if (!entity) return null

    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)

    if (!transform || !owner || !combat) return null

    let nearest: Entity | null = null
    let nearestDist = Infinity

    for (const other of this.world.getAllEntities()) {
      if (other.id === entityId) continue

      const otherTransform = other.getComponent<TransformComponent>(TRANSFORM_TYPE)
      const otherOwner = other.getComponent<OwnerComponent>(OWNER_TYPE)

      if (!otherTransform || !otherOwner) continue
      if (owner.getRelationshipTo(otherOwner) !== Relationship.ENEMY) continue

      // 检查是否可攻击
      const otherHealth = other.getComponent<HealthComponent>(HEALTH_TYPE)
      if (!otherHealth || otherHealth.isDead()) continue

      const dx = otherTransform.position.x - transform.position.x
      const dz = otherTransform.position.z - transform.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < nearestDist && combat.isTargetInRange(dist)) {
        nearestDist = dist
        nearest = other
      }
    }

    return nearest
  }
}

export class MovementQueries {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  /**
   * 检查是否到达目的地
   */
  hasReachedDestination(entityId: number): boolean {
    const entity = this.world.getEntity(entityId)
    if (!entity) return false

    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)
    if (!movement) return false

    return movement.state === 'idle' || !movement.targetPosition
  }
}

export class EconomyQueries {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  /**
   * 检查是否可以采集
   */
  canHarvest(entityId: number): boolean {
    const entity = this.world.getEntity(entityId)
    if (!entity) return false

    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    if (!economy?.isHarvester) return false

    return !economy.isFull() && economy.harvesterState === HarvesterState.HARVESTING
  }

  /**
   * 检查是否满载
   */
  isCargoFull(entityId: number): boolean {
    const entity = this.world.getEntity(entityId)
    if (!entity) return false

    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    if (!economy?.isHarvester) return false

    return economy.isFull()
  }
}
