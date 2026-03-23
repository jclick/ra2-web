/**
 * AIActions
 * 
 * 行为树动作执行
 */

import { World } from '../core/World'
import { Entity } from '../core/Entity'
import { AIComponent, AI_TYPE } from '../components/AIComponent'
import { CombatComponent, COMBAT_TYPE } from '../components/CombatComponent'
import { MovementComponent, MOVEMENT_TYPE } from '../components/MovementComponent'
import { EconomyComponent, ECONOMY_TYPE } from '../components/EconomyComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { CombatQueries } from './AIQueries'

export class CombatActions {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  private getEntity(entityId: number): Entity | null {
    return this.world.getEntity(entityId)
  }

  attackNearestEnemy(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const queries = new CombatQueries(this.world)
    const nearest = queries.getNearestEnemy(entityId)

    if (!nearest) return false

    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)
    if (!combat) return false

    combat.setTarget(nearest.id)
    return true
  }

  moveToAttackRange(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)

    if (!combat || !movement || !combat.targetId) return false

    const target = this.world.getEntity(combat.targetId)
    if (!target) {
      combat.clearTarget()
      return false
    }

    const targetTransform = target.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!targetTransform) return false

    movement.setDestination({
      x: targetTransform.position.x,
      y: 0,
      z: targetTransform.position.z
    })

    return true
  }
}

export class MovementActions {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  private getEntity(entityId: number): Entity | null {
    return this.world.getEntity(entityId)
  }

  fleeFromEnemy(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)

    if (!transform || !ai || !movement) return false

    const queries = new CombatQueries(this.world)
    const enemy = queries.getNearestEnemy(entityId)

    if (!enemy) {
      if (ai.homePosition) {
        movement.setDestination(ai.homePosition)
      }
      return true
    }

    const enemyTransform = enemy.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!enemyTransform) return false

    const dx = transform.position.x - enemyTransform.position.x
    const dz = transform.position.z - enemyTransform.position.z

    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0) {
      const fleeDistance = 10
      movement.setDestination({
        x: transform.position.x + (dx / len) * fleeDistance,
        y: 0,
        z: transform.position.z + (dz / len) * fleeDistance
      })
    }

    return true
  }

  moveToNextPatrolPoint(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)

    if (!ai || !movement) return false

    const target = ai.getCurrentPatrolTarget()
    if (!target) return false

    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (transform) {
      const dx = transform.position.x - target.x
      const dz = transform.position.z - target.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 1) {
        ai.advancePatrolPoint()
        const nextTarget = ai.getCurrentPatrolTarget()
        if (!nextTarget) return false

        movement.setDestination({
          x: nextTarget.x,
          y: 0,
          z: nextTarget.z
        })
        return true
      }
    }

    movement.setDestination({
      x: target.x,
      y: 0,
      z: target.z
    })

    return true
  }

  returnToGuardPosition(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)

    if (!ai || !movement || !ai.homePosition) return false

    movement.setDestination(ai.homePosition)
    return true
  }
}

export class EconomyActions {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  private getEntity(entityId: number): Entity | null {
    return this.world.getEntity(entityId)
  }

  harvest(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    if (!economy?.isHarvester) return false

    economy.startHarvesting()
    return true
  }

  returnToRefinery(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)

    if (!economy?.isHarvester || !movement) return false

    // 简化：直接返回，不查找精炼厂
    economy.startReturning()
    return true
  }

  unloadCargo(entityId: number): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    if (!economy?.isHarvester) return false

    economy.startUnloading()
    return true
  }
}
