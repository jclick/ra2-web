/**
 * CombatSystem
 * 
 * 处理所有带 CombatComponent 和 WeaponComponent 的实体的战斗逻辑
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import { CombatComponent, CombatState, COMBAT_TYPE } from '../components/CombatComponent'
import { WeaponComponent, WEAPON_TYPE } from '../components/WeaponComponent'
import { HealthComponent, HEALTH_TYPE } from '../components/HealthComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { OwnerComponent, OWNER_TYPE, Relationship } from '../components/OwnerComponent'
import { Vector3 } from '../../game/types'

// 战斗事件
export interface CombatEvent {
  attackerId: number
  targetId: number
  damage: number
  isKill: boolean
}

export class CombatSystem extends EntitySystem {
  readonly priority = SystemPriority.NORMAL

  // 战斗统计
  private stats = {
    attacksInitiated: 0,
    attacksLanded: 0,
    totalDamage: 0,
    kills: 0
  }

  // 伤害修饰符（护甲类型对伤害类型的影响）
  private damageModifiers: Record<string, Record<string, number>> = {
    none: { normal: 1.0, ap: 1.0, he: 1.5, fire: 1.0, laser: 1.0, electric: 1.0, psychic: 0 },
    light: { normal: 0.8, ap: 0.6, he: 1.2, fire: 1.0, laser: 0.9, electric: 0.8, psychic: 0.5 },
    medium: { normal: 0.6, ap: 0.8, he: 0.8, fire: 0.9, laser: 0.7, electric: 0.6, psychic: 0.3 },
    heavy: { normal: 0.4, ap: 1.0, he: 0.5, fire: 0.7, laser: 0.5, electric: 0.4, psychic: 0.2 },
    concrete: { normal: 0.3, ap: 0.5, he: 0.4, fire: 0.5, laser: 0.3, electric: 0.2, psychic: 0.1 },
    steel: { normal: 0.25, ap: 0.4, he: 0.3, fire: 0.4, laser: 0.2, electric: 0.1, psychic: 0 },
    wood: { normal: 0.7, ap: 0.5, he: 1.5, fire: 2.0, laser: 1.0, electric: 1.0, psychic: 0.3 },
    special: { normal: 0.5, ap: 0.5, he: 0.5, fire: 0.5, laser: 0.5, electric: 0.5, psychic: 0.5 }
  }

  constructor() {
    super(COMBAT_TYPE, WEAPON_TYPE, TRANSFORM_TYPE, HEALTH_TYPE)
  }

  initialize(world: World): void {
    super.initialize(world)
  }

  /**
   * 更新单个实体
   */
  protected updateEntity(entity: Entity, deltaTime: number): void {
    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)!
    const weapon = entity.getComponent<WeaponComponent>(WEAPON_TYPE)!
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)!

    // 更新武器冷却
    weapon.update(deltaTime)

    // 根据战斗状态执行逻辑
    switch (combat.state) {
      case CombatState.IDLE:
        this.updateIdle(entity, combat, weapon, transform)
        break
      case CombatState.ACQUIRING:
        this.updateAcquiring(entity, combat, weapon, transform)
        break
      case CombatState.AIMING:
        this.updateAiming(entity, combat, weapon, transform, deltaTime)
        break
      case CombatState.FIRING:
        this.updateFiring(entity, combat, weapon, transform, deltaTime)
        break
      case CombatState.COOLDOWN:
        this.updateCooldown(entity, combat, weapon)
        break
    }
  }

  /**
   * 空闲状态 - 自动索敌
   */
  private updateIdle(
    entity: Entity,
    combat: CombatComponent,
    _weapon: WeaponComponent,
    _transform: TransformComponent
  ): void {
    if (!combat.autoAcquire) return

    // 寻找目标
    const target = this.findTarget(entity, combat)
    if (target) {
      combat.setTarget(target.id)
    }
  }

  /**
   * 索敌状态 - 检查目标是否在射程内
   */
  private updateAcquiring(
    _entity: Entity,
    combat: CombatComponent,
    weapon: WeaponComponent,
    transform: TransformComponent
  ): void {
    if (!combat.targetId) {
      combat.setState(CombatState.IDLE)
      return
    }

    const targetEntity = this.world?.getEntity(combat.targetId)
    if (!targetEntity) {
      // 目标已消失
      combat.clearTarget()
      return
    }

    const targetTransform = targetEntity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!targetTransform) {
      combat.clearTarget()
      return
    }

    // 更新目标位置
    combat.updateTargetPosition(targetTransform.position)

    // 计算距离
    const distance = this.calculateDistance(transform.position, targetTransform.position)
    const currentWeapon = weapon.getCurrentWeapon()

    if (!currentWeapon) {
      combat.setState(CombatState.NO_AMMO)
      return
    }

    // 检查是否在射程内
    if (distance <= currentWeapon.config.range) {
      combat.setState(CombatState.AIMING)
    } else {
      // 目标太远，需要追击（由移动系统处理）
      // 这里可以发出追击事件
    }
  }

  /**
   * 瞄准状态 - 旋转朝向目标
   */
  private updateAiming(
    _entity: Entity,
    combat: CombatComponent,
    weapon: WeaponComponent,
    transform: TransformComponent,
    deltaTime: number
  ): void {
    if (!combat.targetId || !combat.lastKnownTargetPosition) {
      combat.setState(CombatState.IDLE)
      return
    }

    // 计算目标方向
    const targetPos = combat.lastKnownTargetPosition
    const dx = targetPos.x - transform.position.x
    const dz = targetPos.z - transform.position.z
    const targetRotation = Math.atan2(dx, dz) * (180 / Math.PI)

    const currentWeapon = weapon.getCurrentWeapon()

    if (currentWeapon?.config.isTurret) {
      // 使用炮塔瞄准
      weapon.setTurretTarget(targetRotation)
      
      // 更新炮塔旋转
      const rotationSpeed = currentWeapon.config.turretRotationSpeed || 180
      const diff = this.normalizeAngle(targetRotation - weapon.turretRotation)
      const maxRotation = rotationSpeed * deltaTime

      if (Math.abs(diff) <= maxRotation) {
        weapon.turretRotation = targetRotation
      } else {
        weapon.turretRotation += Math.sign(diff) * maxRotation
      }

      // 检查是否对准
      if (weapon.isTurretAimedAt(targetRotation, combat.aimTolerance)) {
        combat.setState(CombatState.FIRING)
      }
    } else {
      // 使用身体瞄准（通过Transform旋转）
      // 这里需要配合移动系统
      // 暂时简化处理
      transform.lookAt(targetPos)
      combat.setState(CombatState.FIRING)
    }
  }

  /**
   * 开火状态
   */
  private updateFiring(
    entity: Entity,
    combat: CombatComponent,
    weapon: WeaponComponent,
    transform: TransformComponent,
    _deltaTime: number
  ): void {
    if (!combat.targetId) {
      combat.setState(CombatState.IDLE)
      return
    }

    const targetEntity = this.world?.getEntity(combat.targetId)
    if (!targetEntity) {
      combat.clearTarget()
      return
    }

    // 检查武器是否可以开火
    if (!weapon.canFire()) {
      combat.setState(CombatState.COOLDOWN)
      return
    }

    // 开火
    const currentWeapon = weapon.getCurrentWeapon()
    if (currentWeapon && weapon.fire()) {
      this.performAttack(entity, combat, weapon, targetEntity, transform)
    }

    // 继续瞄准（目标可能移动）
    combat.setState(CombatState.AIMING)
  }

  /**
   * 冷却状态
   */
  private updateCooldown(
    _entity: Entity,
    combat: CombatComponent,
    weapon: WeaponComponent
  ): void {
    if (weapon.canFire()) {
      // 冷却完成，回到瞄准状态
      combat.setState(CombatState.AIMING)
    }
  }

  /**
   * 执行攻击
   */
  private performAttack(
    attacker: Entity,
    combat: CombatComponent,
    weapon: WeaponComponent,
    target: Entity,
    _attackerTransform: TransformComponent
  ): void {
    const currentWeapon = weapon.getCurrentWeapon()
    if (!currentWeapon) return

    this.stats.attacksInitiated++

    // 获取目标的生命值组件
    const targetHealth = target.getComponent<HealthComponent>(HEALTH_TYPE)
    if (!targetHealth) return

    // 计算伤害
    const damage = this.calculateDamage(
      currentWeapon.config.damage,
      currentWeapon.config.damageType,
      targetHealth.armorType
    )

    // 应用老兵加成
    const attackerHealth = attacker.getComponent<HealthComponent>(HEALTH_TYPE)
    if (attackerHealth) {
      const bonus = attackerHealth.getVeterancyBonus()
      const finalDamage = damage * bonus.damage

      // 造成伤害
      targetHealth.takeDamage(finalDamage)
      combat.recordDamage(finalDamage)
      this.stats.totalDamage += finalDamage

      // 检查击杀
      if (targetHealth.isDead()) {
        combat.recordKill()
        attackerHealth.promote() // 尝试晋升
        this.stats.kills++
        
        // 清除目标
        combat.clearTarget()

        // 发送击杀事件
        this.world?.events.emit('combat:kill', {
          attackerId: attacker.id,
          targetId: target.id,
          damage: finalDamage,
          isKill: true
        } as CombatEvent)
      } else {
        // 发送伤害事件
        this.world?.events.emit('combat:damage', {
          attackerId: attacker.id,
          targetId: target.id,
          damage: finalDamage,
          isKill: false
        } as CombatEvent)
      }
    }

    this.stats.attacksLanded++
  }

  /**
   * 寻找目标
   */
  private findTarget(entity: Entity, combat: CombatComponent): Entity | null {
    if (!this.world) return null

    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    if (!owner || !transform) return null

    let bestTarget: Entity | null = null
    let bestScore = -Infinity

    // 遍历所有可能的目标
    for (const other of this.world.getAllEntities()) {
      if (other.id === entity.id) continue

      const otherOwner = other.getComponent<OwnerComponent>(OWNER_TYPE)
      const otherHealth = other.getComponent<HealthComponent>(HEALTH_TYPE)
      const otherTransform = other.getComponent<TransformComponent>(TRANSFORM_TYPE)

      if (!otherOwner || !otherHealth || !otherTransform) continue

      // 检查关系（只攻击敌人）
      const relationship = owner.getRelationshipTo(otherOwner)
      if (relationship !== Relationship.ENEMY) continue

      // 检查是否存活
      if (otherHealth.isDead()) continue

      // 计算距离
      const distance = this.calculateDistance(transform.position, otherTransform.position)

      // 检查是否在索敌范围内
      if (distance > combat.acquisitionRange) continue

      // 计算优先级分数
      const score = this.calculateTargetScore(combat, other, otherHealth, distance)

      if (score > bestScore) {
        bestScore = score
        bestTarget = other
      }
    }

    return bestTarget
  }

  /**
   * 计算目标分数（越高越优先）
   */
  private calculateTargetScore(
    combat: CombatComponent,
    _target: Entity,
    targetHealth: HealthComponent,
    distance: number
  ): number {
    switch (combat.targetPriority) {
      case 'closest':
        return -distance // 距离越近分数越高
      case 'weakest':
        return 1000 - targetHealth.currentHealth // 生命越低分数越高
      case 'strongest':
        return targetHealth.currentHealth // 生命越高分数越高
      case 'high_value':
        // 根据目标类型判断价值
        return targetHealth.maxHealth * 2
      case 'attacker':
        // 优先攻击正在攻击自己的单位
        return 100
      default:
        return -distance
    }
  }

  /**
   * 计算伤害
   */
  private calculateDamage(
    baseDamage: number,
    damageType: string,
    armorType: string
  ): number {
    const modifier = this.damageModifiers[armorType]?.[damageType] ?? 1.0
    return Math.max(1, baseDamage * modifier)
  }

  /**
   * 计算两点间距离
   */
  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  /**
   * 标准化角度
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }

  /**
   * 命令实体攻击目标
   */
  attackTarget(entity: Entity, targetId: number): boolean {
    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)
    if (!combat) return false

    combat.setTarget(targetId)
    return true
  }

  /**
   * 命令实体停止攻击
   */
  stopAttacking(entity: Entity): boolean {
    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)
    if (!combat) return false

    combat.clearTarget()
    const weapon = entity.getComponent<WeaponComponent>(WEAPON_TYPE)
    weapon?.stopFiring()
    return true
  }

  /**
   * 获取战斗统计
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      attacksInitiated: 0,
      attacksLanded: 0,
      totalDamage: 0,
      kills: 0
    }
  }
}
