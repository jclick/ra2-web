/**
 * Vision 组件
 * 
 * 管理实体的视野范围
 * 用于战争迷雾和探测
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const VISION_TYPE: ComponentType = 'vision'

export class VisionComponent extends Component {
  readonly type = VISION_TYPE

  // 视野半径（格数）
  radius: number

  // 高度加成（越高看得越远）
  heightBonus: number

  // 当前实际视野半径（计算后的）
  currentRadius: number

  // 是否是探测器（可以探测隐形单位）
  isDetector: boolean

  // 探测半径
  detectionRadius: number

  // 是否隐形
  isStealth: boolean

  // 隐形类型
  stealthType: 'none' | 'submerged' | 'cloaked' | 'burrowed'

  constructor(
    radius: number = 5,
    heightBonus: number = 0,
    isDetector: boolean = false,
    detectionRadius: number = 3
  ) {
    super()
    this.radius = radius
    this.heightBonus = heightBonus
    this.currentRadius = radius
    this.isDetector = isDetector
    this.detectionRadius = detectionRadius
    this.isStealth = false
    this.stealthType = 'none'
  }

  /**
   * 更新实际视野半径（基于高度）
   */
  updateVisionRadius(height: number): void {
    this.currentRadius = this.radius + (height * this.heightBonus)
  }

  /**
   * 设置隐形状态
   */
  setStealth(stealth: boolean, type: 'none' | 'submerged' | 'cloaked' | 'burrowed' = 'cloaked'): void {
    this.isStealth = stealth
    this.stealthType = stealth ? type : 'none'
  }

  /**
   * 启用隐形
   */
  cloak(): void {
    this.isStealth = true
    this.stealthType = 'cloaked'
  }

  /**
   * 取消隐形
   */
  decloak(): void {
    this.isStealth = false
    this.stealthType = 'none'
  }

  /**
   * 下潜（潜艇）
   */
  submerge(): void {
    this.isStealth = true
    this.stealthType = 'submerged'
  }

  /**
   * 上浮
   */
  surface(): void {
    this.isStealth = false
    this.stealthType = 'none'
  }

  /**
   * 检查是否能探测到隐形单位
   */
  canDetect(other: VisionComponent): boolean {
    if (!this.isDetector || !other.isStealth) return false
    
    // 探测器可以探测大部分隐形
    // 特殊：声呐可以探测潜艇，雷达可以探测隐形飞机
    return true
  }

  clone(): VisionComponent {
    const clone = new VisionComponent(
      this.radius,
      this.heightBonus,
      this.isDetector,
      this.detectionRadius
    )
    clone.currentRadius = this.currentRadius
    clone.isStealth = this.isStealth
    clone.stealthType = this.stealthType
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      radius: this.radius,
      heightBonus: this.heightBonus,
      currentRadius: this.currentRadius,
      isDetector: this.isDetector,
      detectionRadius: this.detectionRadius,
      isStealth: this.isStealth,
      stealthType: this.stealthType
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.radius !== undefined) this.radius = data.radius as number
    if (data.heightBonus !== undefined) this.heightBonus = data.heightBonus as number
    if (data.currentRadius !== undefined) this.currentRadius = data.currentRadius as number
    if (data.isDetector !== undefined) this.isDetector = data.isDetector as boolean
    if (data.detectionRadius !== undefined) this.detectionRadius = data.detectionRadius as number
    if (data.isStealth !== undefined) this.isStealth = data.isStealth as boolean
    if (data.stealthType !== undefined) this.stealthType = data.stealthType as 'none' | 'submerged' | 'cloaked' | 'burrowed'
  }
}

// 注册组件类型
registerComponentType(VISION_TYPE, VisionComponent)
