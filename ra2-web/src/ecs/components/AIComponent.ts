/**
 * AIComponent
 * 
 * 管理实体的AI行为树
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import { BehaviorTree, BTNode, BTContext } from '../ai/BehaviorTree'

export const AI_TYPE: ComponentType = 'ai'

// AI行为类型
export enum AIBehaviorType {
  PASSIVE = 'passive',       // 被动 - 不主动攻击
  AGGRESSIVE = 'aggressive', // 攻击性 - 主动攻击范围内敌人
  DEFENSIVE = 'defensive',   // 防御性 - 只在被攻击时反击
  PATROL = 'patrol',         // 巡逻 - 在路径点间移动
  HARVEST = 'harvest',       // 采集 - 采矿车AI
  ATTACK_MOVE = 'attack_move' // 攻击移动 - 移动中攻击遇到的敌人
}

// AI状态
export enum AIState {
  IDLE = 'idle',
  MOVING = 'moving',
  ATTACKING = 'attacking',
  HARVESTING = 'harvesting',
  RETURNING = 'returning',
  PATROLLING = 'patrolling',
  FLEEING = 'fleeing'
}

export class AIComponent extends Component {
  readonly type = AI_TYPE

  // 行为树实例
  behaviorTree: BehaviorTree | null = null

  // 行为类型
  behaviorType: AIBehaviorType

  // 当前AI状态
  state: AIState

  // 是否启用AI
  enabled: boolean

  // 思考间隔（秒）
  thinkInterval: number

  // 距离上次思考的时间
  timeSinceLastThink: number

  // 目标选择范围
  targetAcquisitionRange: number

  // 记忆：最后攻击者
  lastAttacker: number | null

  // 记忆：最后攻击时间
  lastAttackTime: number

  // 记忆：出生位置
  homePosition: { x: number; y: number; z: number } | null

  // 巡逻路径点
  patrolWaypoints: { x: number; z: number }[]

  // 当前巡逻点索引
  currentWaypointIndex: number

  // 是否循环巡逻
  patrolLoop: boolean

  // 警戒范围（防守模式）
  guardRadius: number

  // 低血量逃跑阈值
  fleeHealthThreshold: number

  // 行为树上下文数据
  contextData: Map<string, unknown>

  constructor(
    behaviorType: AIBehaviorType = AIBehaviorType.AGGRESSIVE,
    thinkInterval: number = 0.5
  ) {
    super()
    this.behaviorType = behaviorType
    this.state = AIState.IDLE
    this.enabled = true
    this.thinkInterval = thinkInterval
    this.timeSinceLastThink = 0
    this.targetAcquisitionRange = 10
    this.lastAttacker = null
    this.lastAttackTime = 0
    this.homePosition = null
    this.patrolWaypoints = []
    this.currentWaypointIndex = 0
    this.patrolLoop = true
    this.guardRadius = 15
    this.fleeHealthThreshold = 0.2
    this.contextData = new Map()
  }

  /**
   * 设置行为树
   */
  setBehaviorTree(tree: BehaviorTree | BTNode): void {
    if (tree instanceof BehaviorTree) {
      this.behaviorTree = tree
    } else {
      // 如果是根节点，创建新的 BehaviorTree
      const context: BTContext = {
        entity: 0, // 将在 think 中更新
        world: null,
        deltaTime: 0,
        memory: new Map()
      }
      this.behaviorTree = new BehaviorTree(tree, context)
    }
  }

  /**
   * 设置行为树从节点
   */
  setBehaviorTreeFromNode(rootNode: BTNode, entityId: number, world: unknown): void {
    const context: BTContext = {
      entity: entityId,
      world,
      deltaTime: 0,
      memory: new Map()
    }
    this.behaviorTree = new BehaviorTree(rootNode, context)
  }

  /**
   * 执行一次思考
   */
  think(deltaTime: number): void {
    if (!this.enabled || !this.behaviorTree) return

    this.timeSinceLastThink += deltaTime

    if (this.timeSinceLastThink >= this.thinkInterval) {
      this.behaviorTree.tick(this.timeSinceLastThink)
      this.timeSinceLastThink = 0
    }
  }

  /**
   * 设置AI状态
   */
  setState(newState: AIState): void {
    if (this.state !== newState) {
      this.state = newState
    }
  }

  /**
   * 添加巡逻点
   */
  addPatrolWaypoint(x: number, z: number): void {
    this.patrolWaypoints.push({ x, z })
  }

  /**
   * 获取当前巡逻目标
   */
  getCurrentPatrolTarget(): { x: number; z: number } | null {
    if (this.patrolWaypoints.length === 0) return null
    return this.patrolWaypoints[this.currentWaypointIndex]
  }

  /**
   * 移动到下一个巡逻点
   */
  advancePatrolPoint(): void {
    if (this.patrolWaypoints.length === 0) return

    this.currentWaypointIndex++

    if (this.currentWaypointIndex >= this.patrolWaypoints.length) {
      if (this.patrolLoop) {
        this.currentWaypointIndex = 0
      } else {
        this.currentWaypointIndex = this.patrolWaypoints.length - 1
      }
    }
  }

  /**
   * 记录被攻击
   */
  recordAttacked(attackerId: number): void {
    this.lastAttacker = attackerId
    this.lastAttackTime = Date.now()
  }

  /**
   * 获取上次攻击以来的时间
   */
  getTimeSinceLastAttack(): number {
    return (Date.now() - this.lastAttackTime) / 1000
  }

  /**
   * 设置上下文数据
   */
  setContextData(key: string, value: unknown): void {
    this.contextData.set(key, value)
  }

  /**
   * 获取上下文数据
   */
  getContextData(key: string): unknown {
    return this.contextData.get(key)
  }

  clone(): AIComponent {
    const clone = new AIComponent(this.behaviorType, this.thinkInterval)
    clone.state = this.state
    clone.enabled = this.enabled
    clone.targetAcquisitionRange = this.targetAcquisitionRange
    clone.homePosition = this.homePosition ? { ...this.homePosition } : null
    clone.patrolWaypoints = [...this.patrolWaypoints]
    clone.currentWaypointIndex = this.currentWaypointIndex
    clone.patrolLoop = this.patrolLoop
    clone.guardRadius = this.guardRadius
    clone.fleeHealthThreshold = this.fleeHealthThreshold
    // 注意：behaviorTree 需要重新设置
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      behaviorType: this.behaviorType,
      state: this.state,
      enabled: this.enabled,
      thinkInterval: this.thinkInterval,
      targetAcquisitionRange: this.targetAcquisitionRange,
      homePosition: this.homePosition,
      patrolWaypoints: this.patrolWaypoints,
      currentWaypointIndex: this.currentWaypointIndex,
      patrolLoop: this.patrolLoop,
      guardRadius: this.guardRadius,
      fleeHealthThreshold: this.fleeHealthThreshold
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.behaviorType !== undefined) this.behaviorType = data.behaviorType as AIBehaviorType
    if (data.state !== undefined) this.state = data.state as AIState
    if (data.enabled !== undefined) this.enabled = data.enabled as boolean
    if (data.thinkInterval !== undefined) this.thinkInterval = data.thinkInterval as number
    if (data.targetAcquisitionRange !== undefined) this.targetAcquisitionRange = data.targetAcquisitionRange as number
    if (data.homePosition !== undefined) this.homePosition = data.homePosition as { x: number; y: number; z: number } | null
    if (data.patrolWaypoints !== undefined) this.patrolWaypoints = data.patrolWaypoints as { x: number; z: number }[]
    if (data.currentWaypointIndex !== undefined) this.currentWaypointIndex = data.currentWaypointIndex as number
    if (data.patrolLoop !== undefined) this.patrolLoop = data.patrolLoop as boolean
    if (data.guardRadius !== undefined) this.guardRadius = data.guardRadius as number
    if (data.fleeHealthThreshold !== undefined) this.fleeHealthThreshold = data.fleeHealthThreshold as number
  }
}

// 注册组件类型
registerComponentType(AI_TYPE, AIComponent)
