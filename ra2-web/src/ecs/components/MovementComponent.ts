/**
 * Movement 组件
 * 
 * 管理实体的移动能力
 * 包含速度、转向率、移动类型等属性
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import { Vector3 } from '../../game/types'
import type { TransformComponent } from './TransformComponent'

export const MOVEMENT_TYPE: ComponentType = 'movement'

// 移动类型
export enum MovementType {
  FOOT = 'foot',       // 步兵
  TRACK = 'track',     // 履带（坦克）
  WHEEL = 'wheel',     // 轮式（吉普）
  HOVER = 'hover',     // 悬浮（两栖）
  FLY = 'fly'          // 飞行
}

// 移动状态
export enum MovementState {
  IDLE = 'idle',           // 空闲
  MOVING = 'moving',       // 移动中
  ROTATING = 'rotating',   // 转向中
  BLOCKED = 'blocked'      // 被阻挡
}

export class MovementComponent extends Component {
  readonly type = MOVEMENT_TYPE

  // 移动类型
  movementType: MovementType

  // 速度（单位/秒）
  speed: number

  // 转向速度（度/秒）
  turnRate: number

  // 当前移动状态
  state: MovementState

  // 当前路径
  path: Vector3[]

  // 当前路径索引
  pathIndex: number

  // 目标位置
  targetPosition: Vector3 | null

  // 目标旋转角度（度）
  targetRotation: number | null

  // 是否正在移动
  get isMoving(): boolean {
    return this.state === MovementState.MOVING || this.state === MovementState.ROTATING
  }

  // 路径到达阈值
  arrivalThreshold: number

  // 转向阈值（度）
  rotationThreshold: number

  // 渲染插值位置（用于平滑显示）
  renderPosition: Vector3

  // 渲染插值旋转
  renderRotation: number

  constructor(
    speed: number = 5,
    turnRate: number = 180,
    movementType: MovementType = MovementType.TRACK
  ) {
    super()
    this.speed = speed
    this.turnRate = turnRate
    this.movementType = movementType
    this.state = MovementState.IDLE
    this.path = []
    this.pathIndex = 0
    this.targetPosition = null
    this.targetRotation = null
    this.arrivalThreshold = 0.1
    this.rotationThreshold = 5
    this.renderPosition = { x: 0, y: 0, z: 0 }
    this.renderRotation = 0
  }

  /**
   * 设置目标位置
   */
  setDestination(position: Vector3): void {
    this.targetPosition = { ...position }
    this.state = MovementState.MOVING
  }

  /**
   * 设置路径
   */
  setPath(path: Vector3[]): void {
    if (path.length === 0) {
      this.clearPath()
      return
    }
    this.path = path.map(p => ({ ...p }))
    this.pathIndex = 0
    this.state = MovementState.MOVING
  }

  /**
   * 清除路径
   */
  clearPath(): void {
    this.path = []
    this.pathIndex = 0
    this.targetPosition = null
    this.state = MovementState.IDLE
  }

  /**
   * 停止移动
   */
  stop(): void {
    this.clearPath()
    this.targetRotation = null
  }

  /**
   * 获取当前目标点
   */
  getCurrentTarget(): Vector3 | null {
    if (this.path.length > 0 && this.pathIndex < this.path.length) {
      return this.path[this.pathIndex]
    }
    return this.targetPosition
  }

  /**
   * 前进到下一个路径点
   */
  advancePath(): boolean {
    this.pathIndex++
    if (this.pathIndex >= this.path.length) {
      this.clearPath()
      return false
    }
    return true
  }

  /**
   * 更新渲染插值位置
   */
  updateRenderPosition(actualPosition: Vector3, lerpFactor: number = 0.3): void {
    this.renderPosition.x += (actualPosition.x - this.renderPosition.x) * lerpFactor
    this.renderPosition.y += (actualPosition.y - this.renderPosition.y) * lerpFactor
    this.renderPosition.z += (actualPosition.z - this.renderPosition.z) * lerpFactor
  }

  /**
   * 更新渲染插值旋转
   */
  updateRenderRotation(actualRotation: number, lerpFactor: number = 0.2): void {
    const diff = this.normalizeAngle(actualRotation - this.renderRotation)
    this.renderRotation += diff * lerpFactor
  }

  /**
   * 标准化角度到 -180 ~ 180
   */
  normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }

  onAttach(): void {
    // 初始化渲染位置为实体位置
    const transform = this.entity?.getComponent<TransformComponent>('transform')
    if (transform) {
      this.renderPosition = { ...transform.position }
    }
  }

  clone(): MovementComponent {
    const clone = new MovementComponent(this.speed, this.turnRate, this.movementType)
    clone.state = this.state
    clone.path = this.path.map(p => ({ ...p }))
    clone.pathIndex = this.pathIndex
    clone.targetPosition = this.targetPosition ? { ...this.targetPosition } : null
    clone.targetRotation = this.targetRotation
    clone.arrivalThreshold = this.arrivalThreshold
    clone.rotationThreshold = this.rotationThreshold
    clone.renderPosition = { ...this.renderPosition }
    clone.renderRotation = this.renderRotation
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      movementType: this.movementType,
      speed: this.speed,
      turnRate: this.turnRate,
      state: this.state,
      path: this.path.map(p => ({ ...p })),
      pathIndex: this.pathIndex,
      targetPosition: this.targetPosition ? { ...this.targetPosition } : null,
      targetRotation: this.targetRotation,
      arrivalThreshold: this.arrivalThreshold,
      rotationThreshold: this.rotationThreshold
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.movementType !== undefined) this.movementType = data.movementType as MovementType
    if (data.speed !== undefined) this.speed = data.speed as number
    if (data.turnRate !== undefined) this.turnRate = data.turnRate as number
    if (data.state !== undefined) this.state = data.state as MovementState
    if (data.path !== undefined) this.path = (data.path as Vector3[]).map(p => ({ ...p }))
    if (data.pathIndex !== undefined) this.pathIndex = data.pathIndex as number
    if (data.targetPosition !== undefined) {
      this.targetPosition = data.targetPosition ? { ...(data.targetPosition as Vector3) } : null
    }
    if (data.targetRotation !== undefined) this.targetRotation = data.targetRotation as number | null
    if (data.arrivalThreshold !== undefined) this.arrivalThreshold = data.arrivalThreshold as number
    if (data.rotationThreshold !== undefined) this.rotationThreshold = data.rotationThreshold as number
  }
}

// 注册组件类型
registerComponentType(MOVEMENT_TYPE, MovementComponent)
