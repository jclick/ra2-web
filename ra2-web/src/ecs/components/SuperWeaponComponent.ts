/**
 * SuperWeaponComponent
 *
 * 管理超级武器（闪电风暴、核弹、超时空传送等）
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const SUPER_WEAPON_TYPE: ComponentType = 'super_weapon'

// 超级武器类型
export enum SuperWeaponType {
  LIGHTNING_STORM = 'lightning_storm',  // 闪电风暴（盟军）
  NUKE = 'nuke',                        // 核弹（苏联）
  CHRONOSPHERE = 'chronosphere',        // 超时空传送（盟军）
  IRON_CURTAIN = 'iron_curtain',        // 铁幕（苏联）
  GENETIC_MUTATOR = 'genetic_mutator',  // 基因突变器（尤里）
  PSYCHIC_DOMINATOR = 'psychic_dominator' // 精神控制车（尤里）
}

// 超级武器状态
export enum SuperWeaponState {
  READY = 'ready',           // 就绪可用
  CHARGING = 'charging',     // 充能中
  FIRING = 'firing',         // 发射中
  COOLDOWN = 'cooldown'      // 冷却中
}

// 超级武器配置
export interface SuperWeaponConfig {
  type: SuperWeaponType
  name: string
  description: string
  chargeTime: number        // 充能时间（秒）
  cooldownTime: number      // 冷却时间（秒）
  duration: number          // 持续时间（秒）
  range: number             // 影响范围
  damage: number            // 伤害值
  cost: number              // 建造成本
  powerConsumption: number  // 电力消耗
}

// 预设配置
export const SUPER_WEAPON_CONFIGS: Record<SuperWeaponType, SuperWeaponConfig> = {
  [SuperWeaponType.LIGHTNING_STORM]: {
    type: SuperWeaponType.LIGHTNING_STORM,
    name: '闪电风暴',
    description: '召唤毁灭性的闪电风暴攻击目标区域',
    chargeTime: 600,
    cooldownTime: 60,
    duration: 15,
    range: 10,
    damage: 1000,
    cost: 5000,
    powerConsumption: 200
  },
  [SuperWeaponType.NUKE]: {
    type: SuperWeaponType.NUKE,
    name: '核弹攻击',
    description: '发射战术核弹摧毁目标区域',
    chargeTime: 600,
    cooldownTime: 60,
    duration: 5,
    range: 12,
    damage: 2000,
    cost: 5000,
    powerConsumption: 200
  },
  [SuperWeaponType.CHRONOSPHERE]: {
    type: SuperWeaponType.CHRONOSPHERE,
    name: '超时空传送',
    description: '瞬间传送单位到指定位置',
    chargeTime: 300,
    cooldownTime: 30,
    duration: 0,
    range: 8,
    damage: 0,
    cost: 2500,
    powerConsumption: 100
  },
  [SuperWeaponType.IRON_CURTAIN]: {
    type: SuperWeaponType.IRON_CURTAIN,
    name: '铁幕装置',
    description: '使单位短时间内无敌',
    chargeTime: 300,
    cooldownTime: 30,
    duration: 45,
    range: 0,
    damage: 0,
    cost: 2500,
    powerConsumption: 100
  },
  [SuperWeaponType.GENETIC_MUTATOR]: {
    type: SuperWeaponType.GENETIC_MUTATOR,
    name: '基因突变器',
    description: '将步兵变异为狂兽人',
    chargeTime: 300,
    cooldownTime: 30,
    duration: 0,
    range: 8,
    damage: 0,
    cost: 2500,
    powerConsumption: 100
  },
  [SuperWeaponType.PSYCHIC_DOMINATOR]: {
    type: SuperWeaponType.PSYCHIC_DOMINATOR,
    name: '精神控制塔',
    description: '控制范围内敌方单位',
    chargeTime: 300,
    cooldownTime: 30,
    duration: 0,
    range: 10,
    damage: 0,
    cost: 5000,
    powerConsumption: 200
  }
}

export class SuperWeaponComponent extends Component {
  readonly type = SUPER_WEAPON_TYPE

  // 武器配置
  config: SuperWeaponConfig

  // 当前状态
  state: SuperWeaponState

  // 充能进度 (0-1)
  chargeProgress: number

  // 冷却进度 (0-1)
  cooldownProgress: number

  // 发射倒计时
  fireCountdown: number

  // 目标位置
  targetPosition: { x: number; z: number } | null

  // 已发射次数
  fireCount: number

  // 是否已建造
  isBuilt: boolean

  // 是否已选择目标
  isTargetSelected: boolean

  constructor(type: SuperWeaponType) {
    super()
    this.config = SUPER_WEAPON_CONFIGS[type]
    this.state = SuperWeaponState.CHARGING
    this.chargeProgress = 0
    this.cooldownProgress = 0
    this.fireCountdown = 0
    this.targetPosition = null
    this.fireCount = 0
    this.isBuilt = false
    this.isTargetSelected = false
  }

  /**
   * 更新充能
   */
  updateCharge(deltaTime: number): void {
    if (this.state !== SuperWeaponState.CHARGING) return

    this.chargeProgress += deltaTime / this.config.chargeTime

    if (this.chargeProgress >= 1) {
      this.chargeProgress = 1
      this.state = SuperWeaponState.READY
    }
  }

  /**
   * 更新冷却
   */
  updateCooldown(deltaTime: number): void {
    if (this.state !== SuperWeaponState.COOLDOWN) return

    this.cooldownProgress += deltaTime / this.config.cooldownTime

    if (this.cooldownProgress >= 1) {
      this.cooldownProgress = 0
      this.state = SuperWeaponState.CHARGING
      this.chargeProgress = 0
    }
  }

  /**
   * 更新发射倒计时
   */
  updateFireCountdown(deltaTime: number): void {
    if (this.state !== SuperWeaponState.FIRING) return

    this.fireCountdown -= deltaTime

    if (this.fireCountdown <= 0) {
      this.fireCountdown = 0
      this.state = SuperWeaponState.COOLDOWN
      this.cooldownProgress = 0
      this.fireCount++
    }
  }

  /**
   * 设置目标
   */
  setTarget(position: { x: number; z: number }): boolean {
    if (this.state !== SuperWeaponState.READY) return false

    this.targetPosition = position
    this.isTargetSelected = true
    return true
  }

  /**
   * 发射超级武器
   */
  fire(): boolean {
    if (this.state !== SuperWeaponState.READY || !this.isTargetSelected) {
      return false
    }

    this.state = SuperWeaponState.FIRING
    this.fireCountdown = 10  // 10秒倒计时
    this.isTargetSelected = false
    return true
  }

  /**
   * 是否就绪
   */
  isReady(): boolean {
    return this.state === SuperWeaponState.READY
  }

  /**
   * 获取剩余充能时间
   */
  getRemainingChargeTime(): number {
    if (this.state !== SuperWeaponState.CHARGING) return 0
    return this.config.chargeTime * (1 - this.chargeProgress)
  }

  /**
   * 获取百分比进度
   */
  getProgressPercent(): number {
    switch (this.state) {
      case SuperWeaponState.CHARGING:
        return this.chargeProgress
      case SuperWeaponState.COOLDOWN:
        return this.cooldownProgress
      case SuperWeaponState.FIRING:
        return 1 - (this.fireCountdown / 10)
      case SuperWeaponState.READY:
        return 1
      default:
        return 0
    }
  }

  clone(): SuperWeaponComponent {
    const clone = new SuperWeaponComponent(this.config.type)
    clone.state = this.state
    clone.chargeProgress = this.chargeProgress
    clone.cooldownProgress = this.cooldownProgress
    clone.fireCountdown = this.fireCountdown
    clone.targetPosition = this.targetPosition ? { ...this.targetPosition } : null
    clone.fireCount = this.fireCount
    clone.isBuilt = this.isBuilt
    clone.isTargetSelected = this.isTargetSelected
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      config: this.config,
      state: this.state,
      chargeProgress: this.chargeProgress,
      cooldownProgress: this.cooldownProgress,
      fireCountdown: this.fireCountdown,
      targetPosition: this.targetPosition,
      fireCount: this.fireCount,
      isBuilt: this.isBuilt,
      isTargetSelected: this.isTargetSelected
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.state !== undefined) this.state = data.state as SuperWeaponState
    if (data.chargeProgress !== undefined) this.chargeProgress = data.chargeProgress as number
    if (data.cooldownProgress !== undefined) this.cooldownProgress = data.cooldownProgress as number
    if (data.fireCountdown !== undefined) this.fireCountdown = data.fireCountdown as number
    if (data.targetPosition !== undefined) this.targetPosition = data.targetPosition as { x: number; z: number } | null
    if (data.fireCount !== undefined) this.fireCount = data.fireCount as number
    if (data.isBuilt !== undefined) this.isBuilt = data.isBuilt as boolean
    if (data.isTargetSelected !== undefined) this.isTargetSelected = data.isTargetSelected as boolean
  }
}

// 注册组件类型
registerComponentType(SUPER_WEAPON_TYPE, SuperWeaponComponent)
