/**
 * Weapon 组件
 * 
 * 管理实体的武器系统
 * 支持主武器和副武器
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const WEAPON_TYPE: ComponentType = 'weapon'

// 伤害类型
export enum DamageType {
  NORMAL = 'normal',       // 普通
  AP = 'ap',               // 穿甲
  HE = 'he',               // 高爆
  FIRE = 'fire',           // 火焰
  LASER = 'laser',         // 激光
  ELECTRIC = 'electric',   // 电击
  PSYCHIC = 'psychic'      // 心灵
}

// 投射物类型
export enum ProjectileType {
  INSTANT = 'instant',     // 即时命中
  BULLET = 'bullet',       // 子弹
  MISSILE = 'missile',     // 导弹
  ROCKET = 'rocket',       // 火箭
  BOMB = 'bomb',           // 炸弹
  BEAM = 'beam'            // 光束
}

// 武器配置
export interface WeaponConfig {
  id: string
  name: string
  damage: number
  range: number
  cooldown: number              // 秒
  projectileType: ProjectileType
  damageType: DamageType
  projectileSpeed?: number      // 投射物速度（单位/秒）
  isTurret: boolean             // 是否有炮塔
  turretRotationSpeed?: number  // 炮塔转向速度（度/秒）
  areaOfEffect?: number         // 范围伤害半径
  canTargetAir: boolean
  canTargetGround: boolean
}

// 武器实例
export class WeaponInstance {
  config: WeaponConfig
  currentCooldown: number = 0
  isFiring: boolean = false

  constructor(config: WeaponConfig) {
    this.config = config
  }

  /**
   * 检查是否可以开火
   */
  canFire(): boolean {
    return this.currentCooldown <= 0 && !this.isFiring
  }

  /**
   * 开火
   */
  fire(): void {
    if (!this.canFire()) return
    this.currentCooldown = this.config.cooldown
    this.isFiring = true
  }

  /**
   * 停止开火
   */
  stopFiring(): void {
    this.isFiring = false
  }

  /**
   * 更新冷却
   */
  update(deltaTime: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime
      if (this.currentCooldown <= 0) {
        this.currentCooldown = 0
        this.isFiring = false // 冷却完成，重置开火状态
      }
    }
  }

  /**
   * 重置冷却
   */
  resetCooldown(): void {
    this.currentCooldown = 0
  }

  /**
   * 获取冷却百分比（0-1）
   */
  getCooldownPercent(): number {
    if (this.config.cooldown <= 0) return 0
    return Math.min(1, this.currentCooldown / this.config.cooldown)
  }
}

export class WeaponComponent extends Component {
  readonly type = WEAPON_TYPE

  // 主武器
  primaryWeapon: WeaponInstance | null

  // 副武器
  secondaryWeapon: WeaponInstance | null

  // 当前使用的武器
  currentWeapon: WeaponInstance | null

  // 炮塔旋转（度）
  turretRotation: number = 0

  // 目标炮塔旋转
  targetTurretRotation: number | null = null

  // 最小攻击间隔
  minAttackInterval: number = 0.1

  // 上次攻击时间
  lastAttackTime: number = 0

  constructor(
    primaryConfig?: WeaponConfig,
    secondaryConfig?: WeaponConfig
  ) {
    super()
    this.primaryWeapon = primaryConfig ? new WeaponInstance(primaryConfig) : null
    this.secondaryWeapon = secondaryConfig ? new WeaponInstance(secondaryConfig) : null
    this.currentWeapon = this.primaryWeapon
  }

  /**
   * 获取当前武器
   */
  getCurrentWeapon(): WeaponInstance | null {
    return this.currentWeapon
  }

  /**
   * 切换到主武器
   */
  switchToPrimary(): void {
    this.currentWeapon = this.primaryWeapon
  }

  /**
   * 切换到副武器
   */
  switchToSecondary(): void {
    this.currentWeapon = this.secondaryWeapon
  }

  /**
   * 检查当前武器是否可以开火
   */
  canFire(): boolean {
    return this.currentWeapon?.canFire() ?? false
  }

  /**
   * 开火
   */
  fire(): boolean {
    if (!this.canFire()) return false

    const now = Date.now() / 1000
    if (now - this.lastAttackTime < this.minAttackInterval) return false

    this.currentWeapon?.fire()
    this.lastAttackTime = now
    return true
  }

  /**
   * 停止开火
   */
  stopFiring(): void {
    this.primaryWeapon?.stopFiring()
    this.secondaryWeapon?.stopFiring()
  }

  /**
   * 更新武器状态
   */
  update(deltaTime: number): void {
    this.primaryWeapon?.update(deltaTime)
    this.secondaryWeapon?.update(deltaTime)

    // 更新炮塔旋转
    if (this.targetTurretRotation !== null) {
      const weapon = this.getCurrentWeapon()
      if (weapon?.config.isTurret) {
        const rotationSpeed = weapon.config.turretRotationSpeed || 180
        const diff = this.normalizeAngle(this.targetTurretRotation - this.turretRotation)
        const maxRotation = rotationSpeed * deltaTime

        if (Math.abs(diff) <= maxRotation) {
          this.turretRotation = this.targetTurretRotation
        } else {
          this.turretRotation += Math.sign(diff) * maxRotation
        }
      }
    }
  }

  /**
   * 设置炮塔目标旋转
   */
  setTurretTarget(rotation: number): void {
    this.targetTurretRotation = rotation
  }

  /**
   * 检查炮塔是否对准目标
   */
  isTurretAimedAt(targetRotation: number, tolerance: number = 5): boolean {
    const diff = Math.abs(this.normalizeAngle(this.turretRotation - targetRotation))
    return diff <= tolerance
  }

  /**
   * 标准化角度
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }

  clone(): WeaponComponent {
    const clone = new WeaponComponent(
      this.primaryWeapon?.config,
      this.secondaryWeapon?.config
    )
    clone.turretRotation = this.turretRotation
    clone.targetTurretRotation = this.targetTurretRotation
    clone.minAttackInterval = this.minAttackInterval
    clone.lastAttackTime = this.lastAttackTime
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      hasPrimary: !!this.primaryWeapon,
      hasSecondary: !!this.secondaryWeapon,
      currentWeapon: this.currentWeapon === this.primaryWeapon ? 'primary' : 'secondary',
      turretRotation: this.turretRotation,
      targetTurretRotation: this.targetTurretRotation,
      lastAttackTime: this.lastAttackTime
    }
  }

  deserialize(data: Record<string, unknown>): void {
    // 武器配置需要从外部重新设置
    if (data.currentWeapon === 'primary') {
      this.switchToPrimary()
    } else if (data.currentWeapon === 'secondary') {
      this.switchToSecondary()
    }
    if (data.turretRotation !== undefined) this.turretRotation = data.turretRotation as number
    if (data.targetTurretRotation !== undefined) {
      this.targetTurretRotation = data.targetTurretRotation as number | null
    }
    if (data.lastAttackTime !== undefined) this.lastAttackTime = data.lastAttackTime as number
  }
}

// 注册组件类型
registerComponentType(WEAPON_TYPE, WeaponComponent)
