/**
 * Combat 组件
 * 
 * 管理实体的战斗状态
 * 包括目标锁定、攻击范围、战斗行为等
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import { Vector3 } from '../../game/types'

export const COMBAT_TYPE: ComponentType = 'combat'

// 战斗状态
export enum CombatState {
  IDLE = 'idle',           // 空闲
  ACQUIRING = 'acquiring', // 索敌中
  AIMING = 'aiming',       // 瞄准中
  FIRING = 'firing',       // 开火中
  RELOADING = 'reloading', // 装填中
  COOLDOWN = 'cooldown',   // 冷却中
  NO_AMMO = 'no_ammo'      // 无弹药
}

// 目标优先级
export enum TargetPriority {
  CLOSEST = 'closest',         // 最近
  WEAKEST = 'weakest',         // 最弱
  STRONGEST = 'strongest',     // 最强
  HIGH_VALUE = 'high_value',   // 高价值
  ATTACKER = 'attacker'        // 攻击者
}

// 目标类型
export enum TargetType {
  NONE = 'none',
  UNIT = 'unit',
  BUILDING = 'building',
  AIRCRAFT = 'aircraft'
}

export class CombatComponent extends Component {
  readonly type = COMBAT_TYPE

  // 当前战斗状态
  state: CombatState

  // 目标实体ID
  targetId: number | null

  // 目标类型
  targetType: TargetType

  // 目标最后已知位置
  lastKnownTargetPosition: Vector3 | null

  // 攻击范围
  attackRange: number

  // 最小攻击范围（太近不能攻击）
  minAttackRange: number

  // 目标优先级
  targetPriority: TargetPriority

  // 是否自动索敌
  autoAcquire: boolean

  // 索敌范围
  acquisitionRange: number

  // 瞄准容差（度）
  aimTolerance: number

  // 攻击角度限制（度，0表示无限制）
  attackAngleLimit: number

  // 上次攻击时间
  lastAttackTime: number

  // 总伤害输出
  totalDamageDealt: number

  // 击杀数
  kills: number

  // 是否在射程内
  get isInRange(): boolean {
    return this.state === CombatState.AIMING || this.state === CombatState.FIRING
  }

  // 是否可以攻击
  get canAttack(): boolean {
    return this.state !== CombatState.NO_AMMO && 
           this.state !== CombatState.RELOADING
  }

  constructor(
    attackRange: number = 5,
    targetPriority: TargetPriority = TargetPriority.CLOSEST
  ) {
    super()
    this.state = CombatState.IDLE
    this.targetId = null
    this.targetType = TargetType.NONE
    this.lastKnownTargetPosition = null
    this.attackRange = attackRange
    this.minAttackRange = 0
    this.targetPriority = targetPriority
    this.autoAcquire = true
    this.acquisitionRange = attackRange * 1.5
    this.aimTolerance = 5
    this.attackAngleLimit = 0
    this.lastAttackTime = 0
    this.totalDamageDealt = 0
    this.kills = 0
  }

  /**
   * 设置目标
   */
  setTarget(targetId: number | null, targetType: TargetType = TargetType.UNIT): void {
    this.targetId = targetId
    this.targetType = targetType
    if (targetId === null) {
      this.lastKnownTargetPosition = null
      this.state = CombatState.IDLE
    } else {
      this.state = CombatState.ACQUIRING
    }
  }

  /**
   * 清除目标
   */
  clearTarget(): void {
    this.setTarget(null, TargetType.NONE)
  }

  /**
   * 更新目标位置
   */
  updateTargetPosition(position: Vector3): void {
    this.lastKnownTargetPosition = { ...position }
  }

  /**
   * 检查目标是否丢失
   * @param maxAge 最大丢失时间（秒，预留参数）
   */
  isTargetLost(_maxAge: number = 5): boolean {
    if (!this.lastKnownTargetPosition) return true
    // 实际实现中应该检查时间戳
    return false
  }

  /**
   * 记录伤害输出
   */
  recordDamage(amount: number): void {
    this.totalDamageDealt += amount
  }

  /**
   * 记录击杀
   */
  recordKill(): void {
    this.kills++
  }

  /**
   * 设置战斗状态
   */
  setState(state: CombatState): void {
    this.state = state
  }

  /**
   * 检查是否在攻击范围内
   */
  isTargetInRange(distance: number): boolean {
    return distance >= this.minAttackRange && distance <= this.attackRange
  }

  /**
   * 检查是否可以对齐目标
   */
  canAimAt(targetRotation: number, currentRotation: number): boolean {
    if (this.attackAngleLimit <= 0) return true
    
    const diff = Math.abs(this.normalizeAngle(targetRotation - currentRotation))
    return diff <= this.attackAngleLimit
  }

  /**
   * 标准化角度
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }

  clone(): CombatComponent {
    const clone = new CombatComponent(this.attackRange, this.targetPriority)
    clone.state = this.state
    clone.targetId = this.targetId
    clone.targetType = this.targetType
    clone.lastKnownTargetPosition = this.lastKnownTargetPosition 
      ? { ...this.lastKnownTargetPosition } 
      : null
    clone.minAttackRange = this.minAttackRange
    clone.autoAcquire = this.autoAcquire
    clone.acquisitionRange = this.acquisitionRange
    clone.aimTolerance = this.aimTolerance
    clone.attackAngleLimit = this.attackAngleLimit
    clone.lastAttackTime = this.lastAttackTime
    clone.totalDamageDealt = this.totalDamageDealt
    clone.kills = this.kills
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      state: this.state,
      targetId: this.targetId,
      targetType: this.targetType,
      lastKnownTargetPosition: this.lastKnownTargetPosition,
      attackRange: this.attackRange,
      minAttackRange: this.minAttackRange,
      targetPriority: this.targetPriority,
      autoAcquire: this.autoAcquire,
      acquisitionRange: this.acquisitionRange,
      aimTolerance: this.aimTolerance,
      attackAngleLimit: this.attackAngleLimit,
      lastAttackTime: this.lastAttackTime,
      totalDamageDealt: this.totalDamageDealt,
      kills: this.kills
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.state !== undefined) this.state = data.state as CombatState
    if (data.targetId !== undefined) this.targetId = data.targetId as number | null
    if (data.targetType !== undefined) this.targetType = data.targetType as TargetType
    if (data.lastKnownTargetPosition !== undefined) {
      this.lastKnownTargetPosition = data.lastKnownTargetPosition as Vector3 | null
    }
    if (data.attackRange !== undefined) this.attackRange = data.attackRange as number
    if (data.minAttackRange !== undefined) this.minAttackRange = data.minAttackRange as number
    if (data.targetPriority !== undefined) this.targetPriority = data.targetPriority as TargetPriority
    if (data.autoAcquire !== undefined) this.autoAcquire = data.autoAcquire as boolean
    if (data.acquisitionRange !== undefined) this.acquisitionRange = data.acquisitionRange as number
    if (data.aimTolerance !== undefined) this.aimTolerance = data.aimTolerance as number
    if (data.attackAngleLimit !== undefined) this.attackAngleLimit = data.attackAngleLimit as number
    if (data.lastAttackTime !== undefined) this.lastAttackTime = data.lastAttackTime as number
    if (data.totalDamageDealt !== undefined) this.totalDamageDealt = data.totalDamageDealt as number
    if (data.kills !== undefined) this.kills = data.kills as number
  }
}

// 注册组件类型
registerComponentType(COMBAT_TYPE, CombatComponent)
