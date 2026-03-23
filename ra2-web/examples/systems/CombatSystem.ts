/**
 * 战斗系统
 * 
 * 处理攻击、伤害计算、武器冷却等战斗逻辑
 */

import { System, SystemPriority } from '../core/System'
import { World } from '../core/World'
import { EventBus } from '../core/EventBus'
import { 
  ComponentType, 
  Combat, 
  Transform, 
  Health, 
  WeaponInstance,
  ArmorType,
  VeterancyLevel
} from '../core/Component'
import { EntityId } from '../core/Entity'

// 护甲伤害倍率表
const ARMOR_MULTIPLIERS: Record<ArmorType, number> = {
  'none': 1.0,
  'flak': 0.75,
  'plate': 0.5,
  'heavy': 0.25,
  'concrete': 0.1
}

// 老兵等级阈值
const VETERANCY_THRESHOLDS: Record<VeterancyLevel, number> = {
  'rookie': 0,
  'veteran': 5,
  'elite': 10,
  'heroic': 20
}

// 老兵加成
const VETERANCY_BONUSES: Record<VeterancyLevel, { damage: number; armor: number } > = {
  'rookie': { damage: 1.0, armor: 1.0 },
  'veteran': { damage: 1.1, armor: 0.9 },
  'elite': { damage: 1.2, armor: 0.8 },
  'heroic': { damage: 1.4, armor: 0.6 }
}

export class CombatSystem extends System {
  constructor(world: World, eventBus: EventBus) {
    super(world, eventBus, SystemPriority.COMBAT)
  }
  
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.COMBAT]
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const combat = this.getComponent<Combat>(entityId, ComponentType.COMBAT)!
      
      // 更新武器冷却
      this.updateWeaponCooldowns(combat, deltaTime)
      
      // 如果有目标，尝试攻击
      if (combat.targetEntityId) {
        this.processAttack(entityId, combat)
      }
    }
  }
  
  private updateWeaponCooldowns(combat: Combat, deltaTime: number): void {
    for (const weapon of combat.weapons) {
      if (weapon.cooldownRemaining > 0) {
        weapon.cooldownRemaining -= deltaTime
        if (weapon.cooldownRemaining < 0) {
          weapon.cooldownRemaining = 0
        }
      }
    }
  }
  
  private processAttack(attackerId: EntityId, combat: Combat): void {
    const targetId = combat.targetEntityId!
    const transform = this.getComponent<Transform>(attackerId, ComponentType.TRANSFORM)!
    const targetTransform = this.world.getComponent<Transform>(targetId, ComponentType.TRANSFORM)
    const targetHealth = this.world.getComponent<Health>(targetId, ComponentType.HEALTH)
    
    // 目标已销毁或死亡
    if (!targetTransform || !targetHealth || targetHealth.current <= 0) {
      combat.targetEntityId = undefined
      combat.isAttacking = false
      return
    }
    
    const weapon = combat.weapons[0]
    if (!weapon || weapon.cooldownRemaining > 0) return
    
    // 计算距离
    const dx = targetTransform.x - transform.x
    const dz = targetTransform.z - transform.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    if (distance > weapon.config.range) {
      // 目标超出射程
      combat.isAttacking = false
      return
    }
    
    // 旋转炮塔/身体朝向目标
    const targetRotation = Math.atan2(dx, dz)
    const rotationDiff = Math.abs(this.normalizeAngle(targetRotation - transform.rotation))
    
    // 检查朝向
    const requiredAccuracy = weapon.config.isTurret ? Math.PI / 6 : Math.PI / 12
    if (rotationDiff > requiredAccuracy) {
      // 还没对准目标
      return
    }
    
    // 开火
    this.fireWeapon(attackerId, targetId, combat, weapon)
  }
  
  private fireWeapon(
    attackerId: EntityId,
    targetId: EntityId,
    combat: Combat,
    weapon: WeaponInstance
  ): void {
    weapon.cooldownRemaining = weapon.config.cooldown
    combat.isAttacking = true
    
    // 计算伤害
    const damage = this.calculateDamage(attackerId, weapon, targetId)
    
    // 发送攻击事件
    this.eventBus.emit('combat:attack', {
      attackerId,
      targetId,
      weaponId: weapon.config.id
    })
    
    // 发送伤害事件
    this.eventBus.emit('combat:damage', {
      source: attackerId,
      target: targetId,
      damage,
      damageType: weapon.config.damageType
    })
    
    // 立即应用伤害
    this.applyDamage(targetId, damage, attackerId, combat)
  }
  
  private calculateDamage(
    attackerId: EntityId,
    weapon: WeaponInstance,
    targetId: EntityId
  ): number {
    const combat = this.world.getComponent<Combat>(attackerId, ComponentType.COMBAT)
    const targetHealth = this.world.getComponent<Health>(targetId, ComponentType.HEALTH)
    
    let baseDamage = weapon.config.damage
    
    // 老兵加成
    if (combat) {
      const bonus = VETERANCY_BONUSES[combat.veterancy]
      baseDamage *= bonus.damage
    }
    
    // 护甲减免
    if (targetHealth) {
      const multiplier = ARMOR_MULTIPLIERS[targetHealth.armor]
      baseDamage *= multiplier
      
      // 老兵防御加成
      const targetCombat = this.world.getComponent<Combat>(targetId, ComponentType.COMBAT)
      if (targetCombat) {
        const targetBonus = VETERANCY_BONUSES[targetCombat.veterancy]
        baseDamage *= targetBonus.armor
      }
    }
    
    // 随机波动 ±10%
    const randomFactor = 0.9 + Math.random() * 0.2
    
    return Math.max(1, Math.floor(baseDamage * randomFactor))
  }
  
  private applyDamage(
    targetId: EntityId,
    damage: number,
    attackerId: EntityId,
    attackerCombat: Combat
  ): void {
    const health = this.world.getComponent<Health>(targetId, ComponentType.HEALTH)
    if (!health) return
    
    health.current -= damage
    
    if (health.current <= 0) {
      health.current = 0
      this.handleKill(attackerId, targetId, attackerCombat)
    }
  }
  
  private handleKill(killerId: EntityId, victimId: EntityId, killerCombat: Combat): void {
    killerCombat.kills++
    
    // 检查升级
    this.checkVeterancy(killerId, killerCombat)
    
    this.eventBus.emit('combat:killed', {
      killerId,
      victimId
    })
  }
  
  private checkVeterancy(entityId: EntityId, combat: Combat): void {
    const levels: VeterancyLevel[] = ['rookie', 'veteran', 'elite', 'heroic']
    const currentIndex = levels.indexOf(combat.veterancy)
    
    for (let i = currentIndex + 1; i < levels.length; i++) {
      const nextLevel = levels[i]
      if (combat.kills >= VETERANCY_THRESHOLDS[nextLevel]) {
        const oldLevel = combat.veterancy
        combat.veterancy = nextLevel
        
        this.eventBus.emit('combat:veterancy', {
          entityId,
          newLevel: nextLevel
        })
        
        console.log(`Unit ${entityId} promoted from ${oldLevel} to ${nextLevel}!`)
      }
    }
  }
  
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI
    while (angle < -Math.PI) angle += 2 * Math.PI
    return angle
  }
  
  /**
   * 外部调用：设置攻击目标
   */
  setTarget(attackerId: EntityId, targetId: EntityId): boolean {
    const combat = this.world.getComponent<Combat>(attackerId, ComponentType.COMBAT)
    if (!combat) return false
    
    combat.targetEntityId = targetId
    combat.isAttacking = false
    
    return true
  }
  
  /**
   * 外部调用：停止攻击
   */
  clearTarget(attackerId: EntityId): boolean {
    const combat = this.world.getComponent<Combat>(attackerId, ComponentType.COMBAT)
    if (!combat) return false
    
    combat.targetEntityId = undefined
    combat.isAttacking = false
    
    return true
  }
}
