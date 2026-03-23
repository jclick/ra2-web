/**
 * Transform 组件
 * 
 * 管理实体的位置、旋转和缩放
 * 几乎所有游戏实体都需要此组件
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import { Vector3 } from '../../game/types'

export const TRANSFORM_TYPE: ComponentType = 'transform'

export class TransformComponent extends Component {
  readonly type = TRANSFORM_TYPE

  // 位置
  position: Vector3

  // 旋转（欧拉角，单位：弧度）
  rotation: Vector3

  // 缩放
  scale: Vector3

  constructor(
    position: Vector3 = { x: 0, y: 0, z: 0 },
    rotation: Vector3 = { x: 0, y: 0, z: 0 },
    scale: Vector3 = { x: 1, y: 1, z: 1 }
  ) {
    super()
    this.position = { ...position }
    this.rotation = { ...rotation }
    this.scale = { ...scale }
  }

  /**
   * 设置位置
   */
  setPosition(x: number, y: number, z: number): void {
    this.position.x = x
    this.position.y = y
    this.position.z = z
  }

  /**
   * 设置旋转（弧度）
   */
  setRotation(x: number, y: number, z: number): void {
    this.rotation.x = x
    this.rotation.y = y
    this.rotation.z = z
  }

  /**
   * 设置旋转（角度）
   */
  setRotationDegrees(x: number, y: number, z: number): void {
    this.rotation.x = (x * Math.PI) / 180
    this.rotation.y = (y * Math.PI) / 180
    this.rotation.z = (z * Math.PI) / 180
  }

  /**
   * 向前移动（基于当前朝向）
   */
  translateForward(distance: number): void {
    const cosY = Math.cos(this.rotation.y)
    const sinY = Math.sin(this.rotation.y)
    this.position.x += sinY * distance
    this.position.z += cosY * distance
  }

  /**
   * 获取朝向向量
   */
  getForwardVector(): Vector3 {
    return {
      x: Math.sin(this.rotation.y),
      y: 0,
      z: Math.cos(this.rotation.y)
    }
  }

  /**
   * 计算到目标的距离
   */
  distanceTo(other: TransformComponent): number {
    const dx = this.position.x - other.position.x
    const dy = this.position.y - other.position.y
    const dz = this.position.z - other.position.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * 计算到目标点的距离
   */
  distanceToPoint(point: Vector3): number {
    const dx = this.position.x - point.x
    const dy = this.position.y - point.y
    const dz = this.position.z - point.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * 朝向目标点
   */
  lookAt(target: Vector3): void {
    const dx = target.x - this.position.x
    const dz = target.z - this.position.z
    this.rotation.y = Math.atan2(dx, dz)
  }

  clone(): TransformComponent {
    return new TransformComponent(
      { ...this.position },
      { ...this.rotation },
      { ...this.scale }
    )
  }

  serialize(): Record<string, unknown> {
    return {
      position: { ...this.position },
      rotation: { ...this.rotation },
      scale: { ...this.scale }
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.position) this.position = { ...(data.position as Vector3) }
    if (data.rotation) this.rotation = { ...(data.rotation as Vector3) }
    if (data.scale) this.scale = { ...(data.scale as Vector3) }
  }
}

// 注册组件类型
registerComponentType(TRANSFORM_TYPE, TransformComponent)
