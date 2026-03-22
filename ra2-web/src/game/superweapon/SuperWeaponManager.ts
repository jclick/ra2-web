import { Vector3 } from '../types'

/**
 * 超级武器类型
 */
export enum SuperWeaponType {
  NUCLEAR_MISSILE = 'nuclear_missile',      // 核弹
  LIGHTNING_STORM = 'lightning_storm',      // 闪电风暴
  CHRONOSPHERE = 'chronosphere',            // 超时空传送
  IRON_CURTAIN = 'iron_curtain',            // 铁幕
}

/**
 * 超级武器状态
 */
export enum SuperWeaponState {
  READY = 'ready',                    // 就绪可用
  CHARGING = 'charging',              // 充能中
  FIRING = 'firing',                  // 发射中
  COOLDOWN = 'cooldown',              // 冷却中
}

/**
 * 超级武器配置
 */
export interface SuperWeaponConfig {
  id: string
  name: string
  type: SuperWeaponType
  icon: string
  
  // 成本和时间
  buildCost: number
  buildTime: number
  rechargeTime: number      // 充能时间（毫秒）
  
  // 伤害和范围
  damage: number
  radius: number            // 影响半径（格数）
  
  // 特殊效果
  effectDuration: number    // 效果持续时间（毫秒）
  
  // 描述
  description: string
  warningMessage: string    // 发射时的警告消息
}

/**
 * 超级武器实例
 */
export interface SuperWeapon {
  id: string
  config: SuperWeaponConfig
  state: SuperWeaponState
  
  // 进度
  chargeProgress: number    // 0-1
  cooldownProgress: number  // 0-1
  
  // 位置
  position?: Vector3        // 发射位置（建筑位置）
  targetPosition?: Vector3  // 目标位置
  
  // 时间
  lastFiredTime: number     // 上次发射时间
  
  // 所有者
  ownerId: string
}

/**
 * 超级武器效果
 */
export interface SuperWeaponEffect {
  id: string
  type: SuperWeaponType
  position: Vector3
  radius: number
  duration: number          // 剩余持续时间
  startTime: number
  
  // 视觉效果
  visualEffect: string      // 效果类型标识
}

/**
 * 超级武器数据库
 */
export const superWeaponDatabase: Record<SuperWeaponType, SuperWeaponConfig> = {
  [SuperWeaponType.NUCLEAR_MISSILE]: {
    id: 'NANRCT',
    name: '核弹攻击',
    type: SuperWeaponType.NUCLEAR_MISSILE,
    icon: '☢️',
    buildCost: 5000,
    buildTime: 60000,
    rechargeTime: 600000,      // 10分钟
    damage: 1000,
    radius: 10,
    effectDuration: 5000,      // 5秒爆炸效果
    description: '发射一枚核弹，对大范围内的所有单位和建筑造成毁灭性打击',
    warningMessage: '核弹发射警告！寻找掩护！',
  },
  
  [SuperWeaponType.LIGHTNING_STORM]: {
    id: 'GAWEAT',
    name: '闪电风暴',
    type: SuperWeaponType.LIGHTNING_STORM,
    icon: '⛈️',
    buildCost: 5000,
    buildTime: 60000,
    rechargeTime: 600000,      // 10分钟
    damage: 300,
    radius: 12,
    effectDuration: 18000,     // 18秒持续时间
    description: '在目标区域召唤持续的闪电风暴，对范围内所有单位造成伤害',
    warningMessage: '闪电风暴即将到来！',
  },
  
  [SuperWeaponType.CHRONOSPHERE]: {
    id: 'GACSPH',
    name: '超时空传送',
    type: SuperWeaponType.CHRONOSPHERE,
    icon: '🔮',
    buildCost: 2500,
    buildTime: 45000,
    rechargeTime: 420000,      // 7分钟
    damage: 0,                 // 无伤害
    radius: 3,                 // 传送范围
    effectDuration: 0,
    description: '将最多9个单位瞬间传送到地图上的任意位置',
    warningMessage: '超时空传送启动！',
  },
  
  [SuperWeaponType.IRON_CURTAIN]: {
    id: 'NAIRON',
    name: '铁幕',
    type: SuperWeaponType.IRON_CURTAIN,
    icon: '🛡️',
    buildCost: 2500,
    buildTime: 45000,
    rechargeTime: 300000,      // 5分钟
    damage: 0,                 // 无伤害
    radius: 3,                 // 影响范围
    effectDuration: 45000,     // 45秒无敌时间
    description: '使范围内的单位无敌，持续45秒',
    warningMessage: '铁幕已激活！',
  },
}

/**
 * 超级武器管理器
 */
export class SuperWeaponManager {
  private superWeapons: Map<string, SuperWeapon> = new Map()
  private activeEffects: Map<string, SuperWeaponEffect> = new Map()
  private effectIdCounter = 0
  
  // 回调
  private onSuperWeaponFired?: (sw: SuperWeapon) => void
  private onSuperWeaponReady?: (sw: SuperWeapon) => void
  private onEffectCreated?: (effect: SuperWeaponEffect) => void
  private onEffectEnded?: (effectId: string) => void
  private onWarning?: (message: string, position: Vector3) => void
  
  /**
   * 创建超级武器
   */
  createSuperWeapon(
    type: SuperWeaponType,
    ownerId: string,
    position: Vector3
  ): SuperWeapon {
    const config = superWeaponDatabase[type]
    const id = `${type}_${ownerId}_${Date.now()}`
    
    const superWeapon: SuperWeapon = {
      id,
      config: { ...config },
      state: SuperWeaponState.CHARGING,
      chargeProgress: 0,
      cooldownProgress: 0,
      position,
      lastFiredTime: 0,
      ownerId,
    }
    
    this.superWeapons.set(id, superWeapon)
    return superWeapon
  }
  
  /**
   * 更新超级武器
   */
  update(deltaTime: number): void {
    // 更新所有超级武器状态
    for (const sw of this.superWeapons.values()) {
      this.updateSuperWeapon(sw, deltaTime)
    }
    
    // 更新所有效果
    for (const effect of this.activeEffects.values()) {
      effect.duration -= deltaTime
      
      if (effect.duration <= 0) {
        this.endEffect(effect.id)
      }
    }
  }
  
  /**
   * 更新单个超级武器
   */
  private updateSuperWeapon(sw: SuperWeapon, deltaTime: number): void {
    switch (sw.state) {
      case SuperWeaponState.CHARGING:
        // 充能中
        sw.chargeProgress += deltaTime / sw.config.rechargeTime
        
        if (sw.chargeProgress >= 1) {
          sw.chargeProgress = 1
          sw.state = SuperWeaponState.READY
          this.onSuperWeaponReady?.(sw)
        }
        break
        
      case SuperWeaponState.COOLDOWN:
        // 冷却中（发射后短暂冷却）
        sw.cooldownProgress += deltaTime / 5000  // 5秒冷却
        
        if (sw.cooldownProgress >= 1) {
          sw.cooldownProgress = 0
          sw.state = SuperWeaponState.CHARGING
          sw.chargeProgress = 0
        }
        break
        
      case SuperWeaponState.FIRING:
        // 发射中 - 检查是否完成
        if (Date.now() - sw.lastFiredTime > sw.config.effectDuration) {
          sw.state = SuperWeaponState.COOLDOWN
          sw.cooldownProgress = 0
        }
        break
        
      case SuperWeaponState.READY:
        // 就绪状态 - 等待发射指令
        break
    }
  }
  
  /**
   * 发射超级武器
   */
  fireSuperWeapon(superWeaponId: string, targetPosition: Vector3): boolean {
    const sw = this.superWeapons.get(superWeaponId)
    if (!sw || sw.state !== SuperWeaponState.READY) {
      return false
    }
    
    // 设置目标
    sw.targetPosition = targetPosition
    sw.lastFiredTime = Date.now()
    sw.state = SuperWeaponState.FIRING
    
    // 触发警告
    this.onWarning?.(sw.config.warningMessage, targetPosition)
    
    // 创建效果
    this.createEffect(sw, targetPosition)
    
    // 触发回调
    this.onSuperWeaponFired?.(sw)
    
    return true
  }
  
  /**
   * 创建超级武器效果
   */
  private createEffect(sw: SuperWeapon, position: Vector3): void {
    const effectId = `effect_${++this.effectIdCounter}`
    
    const effect: SuperWeaponEffect = {
      id: effectId,
      type: sw.config.type,
      position: { ...position },
      radius: sw.config.radius,
      duration: sw.config.effectDuration,
      startTime: Date.now(),
      visualEffect: this.getVisualEffectType(sw.config.type),
    }
    
    this.activeEffects.set(effectId, effect)
    this.onEffectCreated?.(effect)
    
    // 立即造成伤害（除了支援型）
    if (sw.config.damage > 0) {
      this.applyDamage(sw, position)
    }
    
    // 应用特殊效果
    this.applySpecialEffect(sw, position)
  }
  
  /**
   * 获取视觉效果类型
   */
  private getVisualEffectType(type: SuperWeaponType): string {
    const effectMap: Record<SuperWeaponType, string> = {
      [SuperWeaponType.NUCLEAR_MISSILE]: 'nuclear_explosion',
      [SuperWeaponType.LIGHTNING_STORM]: 'lightning_storm',
      [SuperWeaponType.CHRONOSPHERE]: 'chronosphere_teleport',
      [SuperWeaponType.IRON_CURTAIN]: 'iron_curtain_shield',
    }
    return effectMap[type]
  }
  
  /**
   * 造成伤害
   */
  private applyDamage(_sw: SuperWeapon, _center: Vector3): void {
    // 这里应该查询范围内的单位并造成伤害
    // 简化实现：通过回调让外部处理
    // 实际项目中需要：
    // 1. 查询范围内的所有单位和建筑
    // 2. 根据距离计算伤害衰减
    // 3. 应用伤害
  }
  
  /**
   * 应用特殊效果
   */
  private applySpecialEffect(_sw: SuperWeapon, _position: Vector3): void {
    switch (_sw.config.type) {
      case SuperWeaponType.CHRONOSPHERE:
        // 超时空传送 - 需要第二个目标点
        // 实际使用时需要选择源区域和目标区域
        break
        
      case SuperWeaponType.IRON_CURTAIN:
        // 铁幕 - 使单位无敌
        // 需要标记范围内的单位
        break
        
      default:
        break
    }
  }
  
  /**
   * 结束效果
   */
  private endEffect(effectId: string): void {
    const effect = this.activeEffects.get(effectId)
    if (!effect) return
    
    // 清理效果
    this.activeEffects.delete(effectId)
    this.onEffectEnded?.(effectId)
    
    // 清理铁幕等持续效果
    if (effect.type === SuperWeaponType.IRON_CURTAIN) {
      // 移除无敌状态
    }
  }
  
  /**
   * 获取玩家的所有超级武器
   */
  getPlayerSuperWeapons(playerId: string): SuperWeapon[] {
    return Array.from(this.superWeapons.values())
      .filter(sw => sw.ownerId === playerId)
  }
  
  /**
   * 获取就绪的超级武器
   */
  getReadySuperWeapons(playerId: string): SuperWeapon[] {
    return this.getPlayerSuperWeapons(playerId)
      .filter(sw => sw.state === SuperWeaponState.READY)
  }
  
  /**
   * 获取指定类型的超级武器
   */
  getSuperWeaponByType(playerId: string, type: SuperWeaponType): SuperWeapon | undefined {
    return Array.from(this.superWeapons.values())
      .find(sw => sw.ownerId === playerId && sw.config.type === type)
  }
  
  /**
   * 检查玩家是否有就绪的指定类型超级武器
   */
  hasReadySuperWeapon(playerId: string, type: SuperWeaponType): boolean {
    return this.getSuperWeaponByType(playerId, type)?.state === SuperWeaponState.READY
  }
  
  /**
   * 获取所有活跃效果
   */
  getActiveEffects(): SuperWeaponEffect[] {
    return Array.from(this.activeEffects.values())
  }
  
  /**
   * 设置回调
   */
  setCallbacks(callbacks: {
    onSuperWeaponFired?: (sw: SuperWeapon) => void
    onSuperWeaponReady?: (sw: SuperWeapon) => void
    onEffectCreated?: (effect: SuperWeaponEffect) => void
    onEffectEnded?: (effectId: string) => void
    onWarning?: (message: string, position: Vector3) => void
  }): void {
    this.onSuperWeaponFired = callbacks.onSuperWeaponFired
    this.onSuperWeaponReady = callbacks.onSuperWeaponReady
    this.onEffectCreated = callbacks.onEffectCreated
    this.onEffectEnded = callbacks.onEffectEnded
    this.onWarning = callbacks.onWarning
  }
  
  /**
   * 重置（新游戏）
   */
  reset(): void {
    this.superWeapons.clear()
    this.activeEffects.clear()
    this.effectIdCounter = 0
  }
}

export default SuperWeaponManager
