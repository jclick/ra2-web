/**
 * EffectComponent
 *
 * 管理视觉特效（爆炸、烟雾、粒子等）
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import { Vector3 } from '../../game/types'

export const EFFECT_TYPE: ComponentType = 'effect'

// 特效类型
export enum EffectType {
  // 爆炸
  EXPLOSION_SMALL = 'explosion_small',
  EXPLOSION_MEDIUM = 'explosion_medium',
  EXPLOSION_LARGE = 'explosion_large',
  EXPLOSION_NUKE = 'explosion_nuke',

  // 武器特效
  BULLET_TRACER = 'bullet_tracer',
  ROCKET_TRAIL = 'rocket_trail',
  LASER_BEAM = 'laser_beam',
  ELECTRIC_SPARK = 'electric_spark',

  // 环境
  SMOKE = 'smoke',
  FIRE = 'fire',
  STEAM = 'steam',
  DUST = 'dust',

  // 超级武器
  LIGHTNING_BOLT = 'lightning_bolt',
  CHRONO_VORTEX = 'chrono_vortex',
  IRON_CURTAIN_AURA = 'iron_curtain_aura',

  // 状态
  BUILDING_PLACEMENT = 'building_placement',
  CONSTRUCTION_ANIM = 'construction_anim',
  REPAIR_SPARKS = 'repair_sparks'
}

// 特效配置
export interface EffectConfig {
  type: EffectType
  duration: number          // 持续时间（秒）
  loop: boolean            // 是否循环
  fadeIn: number           // 淡入时间
  fadeOut: number          // 淡出时间
  scale: number            // 缩放
  color: { r: number; g: number; b: number; a: number }
  particleCount: number    // 粒子数量
  particleSize: number     // 粒子大小
  particleSpeed: number    // 粒子速度
}

// 预设配置
export const EFFECT_CONFIGS: Record<EffectType, Partial<EffectConfig>> = {
  [EffectType.EXPLOSION_SMALL]: {
    duration: 0.5,
    scale: 1,
    color: { r: 1, g: 0.5, b: 0, a: 1 },
    particleCount: 10,
    particleSize: 0.5,
    particleSpeed: 5
  },
  [EffectType.EXPLOSION_MEDIUM]: {
    duration: 1,
    scale: 2,
    color: { r: 1, g: 0.3, b: 0, a: 1 },
    particleCount: 30,
    particleSize: 1,
    particleSpeed: 8
  },
  [EffectType.EXPLOSION_LARGE]: {
    duration: 2,
    scale: 4,
    color: { r: 1, g: 0.2, b: 0, a: 1 },
    particleCount: 80,
    particleSize: 2,
    particleSpeed: 12
  },
  [EffectType.EXPLOSION_NUKE]: {
    duration: 5,
    scale: 15,
    color: { r: 1, g: 0.8, b: 0, a: 1 },
    particleCount: 500,
    particleSize: 5,
    particleSpeed: 20
  },
  [EffectType.BULLET_TRACER]: {
    duration: 0.1,
    scale: 0.1,
    color: { r: 1, g: 1, b: 0.5, a: 0.8 }
  },
  [EffectType.ROCKET_TRAIL]: {
    duration: 1,
    loop: true,
    scale: 0.3,
    color: { r: 0.8, g: 0.4, b: 0, a: 0.6 }
  },
  [EffectType.LASER_BEAM]: {
    duration: 0.2,
    scale: 0.2,
    color: { r: 1, g: 0, b: 0, a: 0.9 }
  },
  [EffectType.ELECTRIC_SPARK]: {
    duration: 0.3,
    scale: 0.5,
    color: { r: 0.5, g: 0.8, b: 1, a: 1 }
  },
  [EffectType.SMOKE]: {
    duration: 3,
    loop: true,
    scale: 1,
    fadeIn: 0.5,
    fadeOut: 2,
    color: { r: 0.5, g: 0.5, b: 0.5, a: 0.5 }
  },
  [EffectType.FIRE]: {
    duration: 2,
    loop: true,
    scale: 1.5,
    color: { r: 1, g: 0.4, b: 0, a: 0.8 }
  },
  [EffectType.STEAM]: {
    duration: 2,
    scale: 1,
    color: { r: 0.8, g: 0.8, b: 0.9, a: 0.4 }
  },
  [EffectType.DUST]: {
    duration: 1,
    scale: 0.5,
    color: { r: 0.7, g: 0.6, b: 0.5, a: 0.3 }
  },
  [EffectType.LIGHTNING_BOLT]: {
    duration: 0.5,
    scale: 3,
    color: { r: 0.8, g: 0.9, b: 1, a: 1 }
  },
  [EffectType.CHRONO_VORTEX]: {
    duration: 2,
    scale: 2,
    color: { r: 0.2, g: 0.5, b: 1, a: 0.7 }
  },
  [EffectType.IRON_CURTAIN_AURA]: {
    duration: 0,
    loop: true,
    scale: 1.2,
    color: { r: 1, g: 0, b: 0, a: 0.6 }
  },
  [EffectType.BUILDING_PLACEMENT]: {
    duration: 0,
    loop: true,
    scale: 1,
    color: { r: 0, g: 1, b: 0, a: 0.3 }
  },
  [EffectType.CONSTRUCTION_ANIM]: {
    duration: 10,
    loop: true,
    scale: 1,
    color: { r: 0.5, g: 0.7, b: 1, a: 0.5 }
  },
  [EffectType.REPAIR_SPARKS]: {
    duration: 0.5,
    scale: 0.5,
    color: { r: 1, g: 1, b: 0.5, a: 1 }
  }
}

export class EffectComponent extends Component {
  readonly type = EFFECT_TYPE

  // 特效类型
  effectType: EffectType

  // 配置
  config: EffectConfig

  // 当前时间
  currentTime: number

  // 是否激活
  isActive: boolean

  // 是否暂停
  isPaused: boolean

  // 播放速度
  playbackSpeed: number

  // 世界位置
  worldPosition: Vector3

  // 父实体ID（跟随移动）
  parentEntity: number | null

  // 是否跟随父实体旋转
  followRotation: boolean

  // 偏移量
  offset: Vector3

  // 自定义数据
  customData: Map<string, unknown>

  constructor(
    effectType: EffectType,
    position: Vector3 = { x: 0, y: 0, z: 0 }
  ) {
    super()
    this.effectType = effectType
    this.config = {
      type: effectType,
      duration: 1,
      loop: false,
      fadeIn: 0,
      fadeOut: 0.2,
      scale: 1,
      color: { r: 1, g: 1, b: 1, a: 1 },
      particleCount: 0,
      particleSize: 1,
      particleSpeed: 1,
      ...EFFECT_CONFIGS[effectType]
    } as EffectConfig
    this.currentTime = 0
    this.isActive = true
    this.isPaused = false
    this.playbackSpeed = 1
    this.worldPosition = { ...position }
    this.parentEntity = null
    this.followRotation = false
    this.offset = { x: 0, y: 0, z: 0 }
    this.customData = new Map()
  }

  /**
   * 更新特效
   */
  update(deltaTime: number): void {
    if (!this.isActive || this.isPaused) return

    const dt = deltaTime * this.playbackSpeed
    this.currentTime += dt

    // 检查是否结束
    if (!this.config.loop && this.currentTime >= this.config.duration) {
      this.stop()
    }
  }

  /**
   * 播放
   */
  play(): void {
    this.isActive = true
    this.isPaused = false
    this.currentTime = 0
  }

  /**
   * 停止
   */
  stop(): void {
    this.isActive = false
  }

  /**
   * 暂停
   */
  pause(): void {
    this.isPaused = true
  }

  /**
   * 恢复
   */
  resume(): void {
    this.isPaused = false
  }

  /**
   * 设置父实体
   */
  setParent(entityId: number, offset: Vector3 = { x: 0, y: 0, z: 0 }): void {
    this.parentEntity = entityId
    this.offset = offset
  }

  /**
   * 更新位置（如果有父实体）
   */
  updatePosition(world: unknown): void {
    if (this.parentEntity === null) return

    // 这里需要从world获取父实体位置
    // 实际实现时传入World类型
    const w = world as { getEntity: (id: number) => { getComponent: (type: string) => { position: Vector3 } | null } | null }
    const parent = w.getEntity(this.parentEntity)
    if (parent) {
      const transform = parent.getComponent('transform')
      if (transform) {
        this.worldPosition = {
          x: transform.position.x + this.offset.x,
          y: transform.position.y + this.offset.y,
          z: transform.position.z + this.offset.z
        }
      }
    }
  }

  /**
   * 获取当前透明度（考虑淡入淡出）
   */
  getCurrentAlpha(): number {
    const t = this.currentTime
    const duration = this.config.duration
    const fadeIn = this.config.fadeIn
    const fadeOut = this.config.fadeOut

    if (t < fadeIn) {
      return this.config.color.a * (t / fadeIn)
    }

    if (t > duration - fadeOut) {
      return this.config.color.a * ((duration - t) / fadeOut)
    }

    return this.config.color.a
  }

  /**
   * 获取进度 (0-1)
   */
  getProgress(): number {
    if (this.config.loop) {
      return (this.currentTime % this.config.duration) / this.config.duration
    }
    return Math.min(1, this.currentTime / this.config.duration)
  }

  /**
   * 是否已完成
   */
  isFinished(): boolean {
    return !this.config.loop && this.currentTime >= this.config.duration
  }

  clone(): EffectComponent {
    const clone = new EffectComponent(this.effectType, this.worldPosition)
    clone.config = { ...this.config }
    clone.currentTime = this.currentTime
    clone.isActive = this.isActive
    clone.isPaused = this.isPaused
    clone.playbackSpeed = this.playbackSpeed
    clone.parentEntity = this.parentEntity
    clone.followRotation = this.followRotation
    clone.offset = { ...this.offset }
    // 不复制customData，让新实例有自己的数据
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      effectType: this.effectType,
      config: this.config,
      currentTime: this.currentTime,
      isActive: this.isActive,
      isPaused: this.isPaused,
      playbackSpeed: this.playbackSpeed,
      worldPosition: this.worldPosition,
      parentEntity: this.parentEntity,
      followRotation: this.followRotation,
      offset: this.offset
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.currentTime !== undefined) this.currentTime = data.currentTime as number
    if (data.isActive !== undefined) this.isActive = data.isActive as boolean
    if (data.isPaused !== undefined) this.isPaused = data.isPaused as boolean
    if (data.playbackSpeed !== undefined) this.playbackSpeed = data.playbackSpeed as number
    if (data.worldPosition !== undefined) this.worldPosition = data.worldPosition as Vector3
    if (data.parentEntity !== undefined) this.parentEntity = data.parentEntity as number | null
    if (data.followRotation !== undefined) this.followRotation = data.followRotation as boolean
    if (data.offset !== undefined) this.offset = data.offset as Vector3
  }
}

// 注册组件类型
registerComponentType(EFFECT_TYPE, EffectComponent)
