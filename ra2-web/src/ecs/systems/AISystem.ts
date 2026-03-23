/**
 * AISystem
 * 
 * 管理所有AI实体的行为树更新
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import { AIComponent, AIState, AI_TYPE, AIBehaviorType } from '../components/AIComponent'
import { MovementComponent, MOVEMENT_TYPE } from '../components/MovementComponent'
import { BehaviorTreeFactory } from '../ai/BehaviorTreeFactory'

export class AISystem extends EntitySystem {
  readonly priority = SystemPriority.NORMAL

  constructor() {
    super(AI_TYPE)
  }

  initialize(world: World): void {
    super.initialize(world)
  }

  protected updateEntity(entity: Entity, deltaTime: number): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai?.enabled) return
    ai.think(deltaTime)
  }

  createAggressiveAI(entity: Entity): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    const factory = new BehaviorTreeFactory(this.world!)
    const tree = factory.createAggressiveTree(entity.id)
    
    ai.setBehaviorTree(tree)
    ai.behaviorType = AIBehaviorType.AGGRESSIVE
  }

  createDefensiveAI(entity: Entity): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    const factory = new BehaviorTreeFactory(this.world!)
    const tree = factory.createDefensiveTree(entity.id)
    
    ai.setBehaviorTree(tree)
    ai.behaviorType = AIBehaviorType.DEFENSIVE
  }

  createPatrolAI(entity: Entity, waypoints: { x: number; z: number }[]): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    ai.patrolWaypoints = waypoints
    ai.patrolLoop = true

    const factory = new BehaviorTreeFactory(this.world!)
    const tree = factory.createPatrolTree(entity.id)
    
    ai.setBehaviorTree(tree)
    ai.behaviorType = AIBehaviorType.PATROL
  }

  createHarvestAI(entity: Entity): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    const factory = new BehaviorTreeFactory(this.world!)
    const tree = factory.createHarvesterTree(entity.id)
    
    ai.setBehaviorTree(tree)
    ai.behaviorType = AIBehaviorType.HARVEST
  }

  stopAI(entity: Entity): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    ai.enabled = false
    ai.setState(AIState.IDLE)
  }

  resumeAI(entity: Entity): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    ai.enabled = true
  }

  commandAttackMove(entity: Entity, targetPosition: { x: number; z: number }): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)
    
    if (!ai) return

    ai.setContextData('attackMoveTarget', targetPosition)
    ai.behaviorType = AIBehaviorType.ATTACK_MOVE

    if (movement) {
      movement.setDestination({
        x: targetPosition.x,
        y: 0,
        z: targetPosition.z
      })
      ai.setState(AIState.MOVING)
    }

    const factory = new BehaviorTreeFactory(this.world!)
    const tree = factory.createAttackMoveTree(entity.id)
    
    ai.setBehaviorTree(tree)
  }

  commandPatrol(entity: Entity, waypoints: { x: number; z: number }[]): void {
    this.createPatrolAI(entity, waypoints)
  }

  commandGuard(entity: Entity, position: { x: number; z: number }, radius: number = 10): void {
    const ai = entity.getComponent<AIComponent>(AI_TYPE)
    if (!ai) return

    ai.homePosition = { x: position.x, y: 0, z: position.z }
    ai.guardRadius = radius
    
    this.createDefensiveAI(entity)
  }

  getStats(): { total: number; byState: Record<AIState, number> } {
    const stats = {
      total: this.entities.size,
      byState: {} as Record<AIState, number>
    }

    for (const entity of this.entities) {
      const ai = entity.getComponent<AIComponent>(AI_TYPE)
      if (ai) {
        stats.byState[ai.state] = (stats.byState[ai.state] || 0) + 1
      }
    }

    return stats
  }

  getEntitiesInState(state: AIState): Entity[] {
    const result: Entity[] = []

    for (const entity of this.entities) {
      const ai = entity.getComponent<AIComponent>(AI_TYPE)
      if (ai?.state === state) {
        result.push(entity)
      }
    }

    return result
  }
}
