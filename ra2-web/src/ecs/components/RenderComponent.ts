/**
 * Render 组件
 * 
 * 管理实体的渲染信息
 * 将ECS数据与Three.js渲染对象关联
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import * as THREE from 'three'

export const RENDER_TYPE: ComponentType = 'render'

// 渲染类型
export enum RenderType {
  SPRITE = 'sprite',       // 2D精灵（SHP）
  VOXEL = 'voxel',         // 3D体素（VXL）
  MESH = 'mesh',           // 静态网格
  PARTICLE = 'particle',   // 粒子效果
  NONE = 'none'            // 不渲染
}

// 渲染层级
export enum RenderLayer {
  GROUND = 0,      // 地面
  SHADOW = 1,      // 阴影
  OBJECT = 2,      // 普通对象
  EFFECT = 3,      // 特效
  UI = 4           // UI元素
}

export class RenderComponent extends Component {
  readonly type = RENDER_TYPE

  // 渲染类型
  renderType: RenderType

  // 资源ID（如SHP文件名、VXL文件名）
  assetId: string

  // 渲染层级
  layer: RenderLayer

  // 是否可见
  visible: boolean

  // 透明度
  opacity: number

  // 是否半透明
  transparent: boolean

  // 是否投射阴影
  castShadow: boolean

  // 是否接收阴影
  receiveShadow: boolean

  // 颜色覆盖（用于玩家颜色）
  tintColor: THREE.Color | null

  // 当前动画帧
  currentFrame: number

  // 动画播放速度
  animationSpeed: number

  // 是否循环播放
  loopAnimation: boolean

  // Three.js 对象引用（由渲染系统设置）
  mesh: THREE.Object3D | null

  // 是否需要更新
  needsUpdate: boolean

  constructor(
    renderType: RenderType = RenderType.SPRITE,
    assetId: string = '',
    layer: RenderLayer = RenderLayer.OBJECT
  ) {
    super()
    this.renderType = renderType
    this.assetId = assetId
    this.layer = layer
    this.visible = true
    this.opacity = 1.0
    this.transparent = false
    this.castShadow = true
    this.receiveShadow = true
    this.tintColor = null
    this.currentFrame = 0
    this.animationSpeed = 1.0
    this.loopAnimation = true
    this.mesh = null
    this.needsUpdate = true
  }

  /**
   * 设置可见性
   */
  setVisible(visible: boolean): void {
    this.visible = visible
    if (this.mesh) {
      this.mesh.visible = visible
    }
  }

  /**
   * 设置透明度
   */
  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity))
    this.needsUpdate = true
  }

  /**
   * 设置颜色覆盖
   */
  setTintColor(color: THREE.Color | string | null): void {
    if (color === null) {
      this.tintColor = null
    } else if (typeof color === 'string') {
      this.tintColor = new THREE.Color(color)
    } else {
      this.tintColor = color.clone()
    }
    this.needsUpdate = true
  }

  /**
   * 播放动画
   */
  playAnimation(frame: number = 0): void {
    this.currentFrame = frame
    this.needsUpdate = true
  }

  /**
   * 设置动画帧
   */
  setFrame(frame: number): void {
    this.currentFrame = frame
    this.needsUpdate = true
  }

  /**
   * 标记需要更新
   */
  markDirty(): void {
    this.needsUpdate = true
  }

  /**
   * 标记已更新
   */
  markClean(): void {
    this.needsUpdate = false
  }

  onAttach(): void {
    // 通知渲染系统创建渲染对象
    this.needsUpdate = true
  }

  onDetach(): void {
    // 清理Three.js对象
    if (this.mesh) {
      // 渲染系统负责实际的销毁
      this.mesh = null
    }
  }

  clone(): RenderComponent {
    const clone = new RenderComponent(this.renderType, this.assetId, this.layer)
    clone.visible = this.visible
    clone.opacity = this.opacity
    clone.transparent = this.transparent
    clone.castShadow = this.castShadow
    clone.receiveShadow = this.receiveShadow
    clone.tintColor = this.tintColor ? this.tintColor.clone() : null
    clone.currentFrame = this.currentFrame
    clone.animationSpeed = this.animationSpeed
    clone.loopAnimation = this.loopAnimation
    // 不克隆mesh引用
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      renderType: this.renderType,
      assetId: this.assetId,
      layer: this.layer,
      visible: this.visible,
      opacity: this.opacity,
      transparent: this.transparent,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      tintColor: this.tintColor ? `#${this.tintColor.getHexString()}` : null,
      currentFrame: this.currentFrame,
      animationSpeed: this.animationSpeed,
      loopAnimation: this.loopAnimation
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.renderType !== undefined) this.renderType = data.renderType as RenderType
    if (data.assetId !== undefined) this.assetId = data.assetId as string
    if (data.layer !== undefined) this.layer = data.layer as RenderLayer
    if (data.visible !== undefined) this.visible = data.visible as boolean
    if (data.opacity !== undefined) this.opacity = data.opacity as number
    if (data.transparent !== undefined) this.transparent = data.transparent as boolean
    if (data.castShadow !== undefined) this.castShadow = data.castShadow as boolean
    if (data.receiveShadow !== undefined) this.receiveShadow = data.receiveShadow as boolean
    if (data.tintColor !== undefined) {
      const color = data.tintColor as string | null
      this.tintColor = color ? new THREE.Color(color) : null
    }
    if (data.currentFrame !== undefined) this.currentFrame = data.currentFrame as number
    if (data.animationSpeed !== undefined) this.animationSpeed = data.animationSpeed as number
    if (data.loopAnimation !== undefined) this.loopAnimation = data.loopAnimation as boolean
    this.needsUpdate = true
  }
}

// 注册组件类型
registerComponentType(RENDER_TYPE, RenderComponent)
