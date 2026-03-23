/**
 * BehaviorTreeFactory
 * 
 * 创建 RA2 特定的行为树
 */

import { World } from '../core/World'
import {
  BTNode,
  BTSequence,
  BTSelector,
  BTInverter,
  BTSucceeder,
  BTCondition,
  BTAction,
  BTContext
} from './BehaviorTree'
import { AIState } from '../components/AIComponent'
import { CombatQueries, AIQueries, MovementQueries, EconomyQueries } from './AIQueries'
import { CombatActions, MovementActions, EconomyActions } from './AIActions'

// ==================== 条件节点 ====================

class HasEnemyInRange extends BTCondition {
  private range: number

  constructor(range: number = 10) {
    super('HasEnemyInRange')
    this.range = range
  }

  check(context: BTContext): boolean {
    const queries = new CombatQueries(context.world as World)
    return queries.hasEnemyInRange(context.entity, this.range)
  }
}

class IsUnderAttack extends BTCondition {
  constructor() {
    super('IsUnderAttack')
  }

  check(context: BTContext): boolean {
    const queries = new AIQueries(context.world as World)
    return queries.isUnderAttack(context.entity)
  }
}

class IsHealthLow extends BTCondition {
  private threshold: number

  constructor(threshold: number = 0.3) {
    super('IsHealthLow')
    this.threshold = threshold
  }

  check(context: BTContext): boolean {
    const queries = new AIQueries(context.world as World)
    return queries.getHealthPercent(context.entity) < this.threshold
  }
}

class HasReachedDestination extends BTCondition {
  constructor() {
    super('HasReachedDestination')
  }

  check(context: BTContext): boolean {
    const queries = new MovementQueries(context.world as World)
    return queries.hasReachedDestination(context.entity)
  }
}

class CanHarvest extends BTCondition {
  constructor() {
    super('CanHarvest')
  }

  check(context: BTContext): boolean {
    const queries = new EconomyQueries(context.world as World)
    return queries.canHarvest(context.entity)
  }
}

class IsCargoFull extends BTCondition {
  constructor() {
    super('IsCargoFull')
  }

  check(context: BTContext): boolean {
    const queries = new EconomyQueries(context.world as World)
    return queries.isCargoFull(context.entity)
  }
}

// ==================== 动作节点 ====================

class AttackNearestEnemy extends BTAction {
  constructor() {
    super('AttackNearestEnemy')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new CombatActions(context.world as World)
    return actions.attackNearestEnemy(context.entity) ? 'success' : 'failure'
  }
}

class MoveToTarget extends BTAction {
  constructor() {
    super('MoveToTarget')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new CombatActions(context.world as World)
    return actions.moveToAttackRange(context.entity) ? 'running' : 'failure'
  }
}

class FleeFromEnemy extends BTAction {
  constructor() {
    super('FleeFromEnemy')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new MovementActions(context.world as World)
    return actions.fleeFromEnemy(context.entity) ? 'running' : 'failure'
  }
}

class PatrolToNextPoint extends BTAction {
  constructor() {
    super('PatrolToNextPoint')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new MovementActions(context.world as World)
    return actions.moveToNextPatrolPoint(context.entity) ? 'running' : 'success'
  }
}

class HarvestResources extends BTAction {
  constructor() {
    super('HarvestResources')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new EconomyActions(context.world as World)
    return actions.harvest(context.entity) ? 'running' : 'failure'
  }
}

class ReturnToRefinery extends BTAction {
  constructor() {
    super('ReturnToRefinery')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new EconomyActions(context.world as World)
    return actions.returnToRefinery(context.entity) ? 'running' : 'failure'
  }
}

class UnloadCargo extends BTAction {
  constructor() {
    super('UnloadCargo')
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new EconomyActions(context.world as World)
    return actions.unloadCargo(context.entity) ? 'success' : 'failure'
  }
}

class SetAIState extends BTAction {
  private state: AIState

  constructor(state: AIState) {
    super(`SetState_${state}`)
    this.state = state
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const queries = new AIQueries(context.world as World)
    queries.setAIState(context.entity, this.state)
    return 'success'
  }
}

// ==================== 工厂 ====================

export class BehaviorTreeFactory {
  private world: World

  constructor(world: World) {
    this.world = world
  }

  createAggressiveTree(_entityId: number): BTNode {
    return new BTSelector('AggressiveRoot', [
      new BTSequence('AttackSequence', [
        new HasEnemyInRange(),
        new SetAIState(AIState.ATTACKING),
        new AttackNearestEnemy()
      ]),
      new SetAIState(AIState.IDLE)
    ])
  }

  createDefensiveTree(_entityId: number): BTNode {
    return new BTSelector('DefensiveRoot', [
      new BTSequence('FleeSequence', [
        new IsHealthLow(0.3),
        new SetAIState(AIState.FLEEING),
        new FleeFromEnemy()
      ]),
      new BTSequence('CounterAttackSequence', [
        new IsUnderAttack(),
        new SetAIState(AIState.ATTACKING),
        new AttackNearestEnemy()
      ]),
      new SetAIState(AIState.IDLE)
    ])
  }

  createPatrolTree(_entityId: number): BTNode {
    return new BTSelector('PatrolRoot', [
      new BTSequence('AttackWhilePatrolling', [
        new HasEnemyInRange(),
        new SetAIState(AIState.ATTACKING),
        new AttackNearestEnemy()
      ]),
      new BTSequence('PatrolSequence', [
        new SetAIState(AIState.PATROLLING),
        new PatrolToNextPoint()
      ])
    ])
  }

  createHarvesterTree(_entityId: number): BTNode {
    return new BTSelector('HarvesterRoot', [
      new BTSequence('ReturnSequence', [
        new IsCargoFull(),
        new SetAIState(AIState.RETURNING),
        new ReturnToRefinery(),
        new UnloadCargo()
      ]),
      new BTSequence('HarvestSequence', [
        new CanHarvest(),
        new SetAIState(AIState.HARVESTING),
        new HarvestResources()
      ]),
      new SetAIState(AIState.MOVING)
    ])
  }

  createAttackMoveTree(_entityId: number): BTNode {
    return new BTSelector('AttackMoveRoot', [
      new BTSequence('AttackSequence', [
        new HasEnemyInRange(),
        new SetAIState(AIState.ATTACKING),
        new AttackNearestEnemy()
      ]),
      new BTSequence('MoveSequence', [
        new SetAIState(AIState.MOVING),
        new BTSucceeder('AlwaysMoving', new MoveToTarget())
      ])
    ])
  }

  createBaseDefenseTree(_entityId: number): BTNode {
    return new BTSelector('BaseDefenseRoot', [
      new BTSequence('CloseThreat', [
        new HasEnemyInRange(5),
        new SetAIState(AIState.ATTACKING),
        new AttackNearestEnemy()
      ]),
      new BTSequence('DistantThreat', [
        new HasEnemyInRange(15),
        new SetAIState(AIState.ATTACKING),
        new MoveToTarget()
      ]),
      new BTSequence('ReturnToGuard', [
        new BTInverter('NotAtGuardPosition', new HasReachedDestination()),
        new SetAIState(AIState.MOVING),
        new ReturnToGuardAction(this.world)
      ]),
      new SetAIState(AIState.IDLE)
    ])
  }
}

// 辅助动作类
class ReturnToGuardAction extends BTAction {
  private world: World

  constructor(world: World) {
    super('ReturnToGuard')
    this.world = world
  }

  tick(context: BTContext): import('./BehaviorTree').BTNodeStatus {
    const actions = new MovementActions(this.world)
    return actions.returnToGuardPosition(context.entity) ? 'running' : 'success'
  }
}
