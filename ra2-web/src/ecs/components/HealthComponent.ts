/**
 * Health 组件
 * 
 * 管理实体的生命值、护甲和伤害处理
 * 用于单位、建筑等可摧毁的游戏对象
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const HEALTH_TYPE: ComponentType = 'health'

// 护甲类型
export enum ArmorType {
  NONE = 'none',           // 无护甲
  LIGHT = 'light',         // 轻型护甲（步兵）
  MEDIUM = 'medium',       // 中型护甲（轻载具）
  HEAVY = 'heavy',         // 重型护甲（坦克）
  CONCRETE = 'concrete',   // 混凝土（建筑）
  STEEL = 'steel',         // 钢甲（高级建筑）
  WOOD = 'wood',           // 木质
  SPECIAL = 'special'      // 特殊护甲
}

// 老兵等级
export enum VeterancyLevel {
  ROOKIE = 0,
  VETERAN = 1,
  ELITE = 2
}

export class HealthComponent extends Component {
  readonly type = HEALTH_TYPE

  // 当前生命值
  currentHealth: number

  // 最大生命值
  maxHealth: number

  // 护甲类型
  armorType: ArmorType

  // 老兵等级
  veterancy: VeterancyLevel

  // 是否是建筑（影响某些伤害计算）
  isStructure: boolean

  // 上次受到伤害的时间
  lastDamageTime: number = 0

  // 是否已死亡
  private _isDead: boolean = false

  constructor(
    maxHealth: number,
    armorType: ArmorType = ArmorType.LIGHT,
    isStructure: boolean = false
  ) {
    super()
    this.maxHealth = maxHealth
    this.currentHealth = maxHealth
    this.armorType = armorType
    this.veterancy = VeterancyLevel.ROOKIE
    this.isStructure = isStructure
  }

  /**
   * 获取生命值百分比
   */
  getHealthPercent(): number {
    return this.currentHealth / this.maxHealth
  }

  /**
   * 是否存活
   */
  isAlive(): boolean {
    return this.currentHealth > 0 && !this._isDead
  }

  /**
   * 是否已死亡
   */
  isDead(): boolean {
    return this._isDead || this.currentHealth <= 0
  }

  /**
   * 受到伤害
   * @returns 实际造成的伤害
   */
  takeDamage(amount: number, attackerArmorType?: ArmorType): number {
    if (this.isDead()) return 0

    // 计算护甲减伤
    const damage = this.calculateDamage(amount, attackerArmorType)
    
    this.currentHealth = Math.max(0, this.currentHealth - damage)
    this.lastDamageTime = Date.now()

    if (this.currentHealth <= 0) {
      this._isDead = true
    }

    return damage
  }

  /**
   * 恢复生命值
   */
  heal(amount: number): number {
    if (this.isDead()) return 0
    
    const oldHealth = this.currentHealth
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
    return this.currentHealth - oldHealth
  }

  /**
   * 完全恢复
   */
  fullHeal(): void {
    this.currentHealth = this.maxHealth
  }

  /**
   * 提升老兵等级
   */
  promote(): boolean {
    if (this.veterancy < VeterancyLevel.ELITE) {
      this.veterancy++
      // 晋升时恢复部分生命
      this.heal(this.maxHealth * 0.5)
      return true
    }
    return false
  }

  /**
   * 计算实际伤害（考虑护甲）
   * @param baseDamage 基础伤害
   * @param _attackerType 攻击者护甲类型（预留，未来用于伤害类型计算）
   */
  private calculateDamage(baseDamage: number, _attackerType?: ArmorType): number {
    // 基础减伤系数
    const armorModifiers: Record<ArmorType, number> = {
      [ArmorType.NONE]: 1.0,
      [ArmorType.LIGHT]: 0.8,
      [ArmorType.MEDIUM]: 0.6,
      [ArmorType.HEAVY]: 0.4,
      [ArmorType.CONCRETE]: 0.3,
      [ArmorType.STEEL]: 0.25,
      [ArmorType.WOOD]: 0.7,
      [ArmorType.SPECIAL]: 0.5
    }

    const modifier = armorModifiers[this.armorType] || 1.0
    return Math.max(1, baseDamage * modifier)
  }

  /**
   * 获取老兵加成
   */
  getVeterancyBonus(): { damage: number; armor: number; speed: number } {
    switch (this.veterancy) {
      case VeterancyLevel.VETERAN:
        return { damage: 1.2, armor: 1.1, speed: 1.1 }
      case VeterancyLevel.ELITE:
        return { damage: 1.4, armor: 1.2, speed: 1.2 }
      default:
        return { damage: 1.0, armor: 1.0, speed: 1.0 }
    }
  }

  clone(): HealthComponent {
    const clone = new HealthComponent(this.maxHealth, this.armorType, this.isStructure)
    clone.currentHealth = this.currentHealth
    clone.veterancy = this.veterancy
    clone.lastDamageTime = this.lastDamageTime
    clone._isDead = this._isDead
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      armorType: this.armorType,
      veterancy: this.veterancy,
      isStructure: this.isStructure,
      lastDamageTime: this.lastDamageTime,
      isDead: this._isDead
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.currentHealth !== undefined) this.currentHealth = data.currentHealth as number
    if (data.maxHealth !== undefined) this.maxHealth = data.maxHealth as number
    if (data.armorType !== undefined) this.armorType = data.armorType as ArmorType
    if (data.veterancy !== undefined) this.veterancy = data.veterancy as VeterancyLevel
    if (data.isStructure !== undefined) this.isStructure = data.isStructure as boolean
    if (data.lastDamageTime !== undefined) this.lastDamageTime = data.lastDamageTime as number
    if (data.isDead !== undefined) this._isDead = data.isDead as boolean
  }
}

// 注册组件类型
registerComponentType(HEALTH_TYPE, HealthComponent)
