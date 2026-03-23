/**
 * Combat Adapter
 * 
 * Week 9: 战斗系统适配器
 * 在现有 Unit 类和 ECS CombatSystem 之间桥接
 */

import { Unit } from '../../game/objects/Unit'
import { GameManager } from '../../game/GameManager'
import {
  World,
  Entity,
  TransformComponent,
  HealthComponent,
  OwnerComponent,
  Faction,
  ArmorType,
  CombatComponent,
  WeaponComponent,
  WeaponConfig,
  DamageType,
  ProjectileType,
  COMBAT_TYPE,
  WEAPON_TYPE,
  HEALTH_TYPE
} from '../'
import { CombatSystem } from '../systems/CombatSystem'

/**
 * 战斗适配器选项
 */
export interface CombatAdapterOptions {
  useECS: boolean
  syncToUnit: boolean
  syncToECS: boolean
}

/**
 * 单位-实体映射
 */
interface UnitEntityMapping {
  unit: Unit
  entity: Entity
}

/**
 * Combat Adapter
 * 
 * 管理 Unit 实例和 ECS Entity 之间的战斗映射和同步
 */
export class CombatAdapter {
  private gameManager: GameManager
  private world: World
  private combatSystem: CombatSystem
  private options: CombatAdapterOptions

  private unitMap: Map<string, UnitEntityMapping> = new Map()
  private entityMap: Map<number, string> = new Map()

  constructor(
    gameManager: GameManager,
    world: World,
    options: Partial<CombatAdapterOptions> = {}
  ) {
    this.gameManager = gameManager
    this.world = world
    this.options = {
      useECS: true,
      syncToUnit: true,
      syncToECS: true,
      ...options
    }

    // 获取或创建 CombatSystem
    const existingSystem = world.getAllSystems().find(s => s instanceof CombatSystem)
    if (existingSystem) {
      this.combatSystem = existingSystem as CombatSystem
    } else {
      this.combatSystem = new CombatSystem()
      world.addSystem(this.combatSystem)
    }
  }

  /**
   * 注册单位到 ECS
   */
  registerUnit(unit: Unit): Entity {
    if (this.unitMap.has(unit.id)) {
      return this.unitMap.get(unit.id)!.entity
    }

    const entity = this.world.createEntity(`Unit_${unit.id}`)

    // Transform
    entity.addComponent(new TransformComponent(
      { ...unit.position },
      { x: 0, y: unit.rotation * (Math.PI / 180), z: 0 }
    ))

    // Health
    const armorMap: Record<string, ArmorType> = {
      none: ArmorType.NONE,
      flak: ArmorType.LIGHT,
      plate: ArmorType.MEDIUM,
      heavy: ArmorType.HEAVY
    }
    entity.addComponent(new HealthComponent(
      unit.stats.health,
      armorMap[unit.stats.armor] || ArmorType.LIGHT
    ))

    // Owner
    const factionMap: Record<string, Faction> = {
      Allies: Faction.ALLIES,
      Soviet: Faction.SOVIET,
      Yuri: Faction.YURI
    }
    entity.addComponent(new OwnerComponent(
      unit.owner?.id || 'neutral',
      factionMap[unit.faction] || Faction.NEUTRAL
    ))

    // Combat
    const combat = new CombatComponent(
      unit.stats.primaryWeapon?.range || 5
    )
    entity.addComponent(combat)

    // Weapon
    if (unit.stats.primaryWeapon) {
      const weaponConfig: WeaponConfig = {
        id: unit.stats.primaryWeapon.id,
        name: unit.stats.primaryWeapon.name,
        damage: unit.stats.primaryWeapon.damage,
        range: unit.stats.primaryWeapon.range,
        cooldown: unit.stats.primaryWeapon.cooldown / 1000, // 转换为秒
        projectileType: ProjectileType.BULLET,
        damageType: DamageType.NORMAL,
        projectileSpeed: unit.stats.primaryWeapon.projectileSpeed,
        isTurret: unit.stats.primaryWeapon.isTurret,
        turretRotationSpeed: unit.stats.primaryWeapon.turretRotationSpeed,
        canTargetAir: true,
        canTargetGround: true
      }
      entity.addComponent(new WeaponComponent(weaponConfig))
    } else {
      entity.addComponent(new WeaponComponent())
    }

    this.unitMap.set(unit.id, { unit, entity })
    this.entityMap.set(entity.id, unit.id)

    return entity
  }

  /**
   * 命令单位攻击
   */
  attackTarget(unitId: string, targetId: string): boolean {
    if (!this.options.useECS) {
      const unit = this.gameManager.units.get(unitId)
      const target = this.gameManager.units.get(targetId)
      if (!unit || !target) return false
      unit.attack(target)
      return true
    }

    const mapping = this.unitMap.get(unitId)
    const targetMapping = this.unitMap.get(targetId)
    if (!mapping || !targetMapping) return false

    return this.combatSystem.attackTarget(mapping.entity, targetMapping.entity.id)
  }

  /**
   * 命令单位停止攻击
   */
  stopAttacking(unitId: string): boolean {
    if (!this.options.useECS) {
      const unit = this.gameManager.units.get(unitId)
      if (!unit) return false
      unit.stop()
      return true
    }

    const mapping = this.unitMap.get(unitId)
    if (!mapping) return false

    return this.combatSystem.stopAttacking(mapping.entity)
  }

  /**
   * 同步 ECS 状态到 Unit
   */
  syncECSToUnit(unitId: string): boolean {
    if (!this.options.syncToUnit) return false

    const mapping = this.unitMap.get(unitId)
    if (!mapping) return false

    const { unit, entity } = mapping

    // 同步生命
    const health = entity.getComponent<HealthComponent>(HEALTH_TYPE)
    if (health) {
      unit.health = health.currentHealth
    }

    // 同步战斗状态
    const combat = entity.getComponent<CombatComponent>(COMBAT_TYPE)
    const weapon = entity.getComponent<WeaponComponent>(WEAPON_TYPE)
    if (combat && weapon) {
      // 同步目标
      if (combat.targetId) {
        const targetUnitId = this.entityMap.get(combat.targetId)
        if (targetUnitId) {
          const targetUnit = this.gameManager.units.get(targetUnitId)
          if (targetUnit) {
            unit.targetUnit = targetUnit
          }
        }
      } else {
        unit.targetUnit = undefined
      }

      // 同步炮塔旋转
      unit.turretRotation = weapon.turretRotation
      unit.targetTurretRotation = weapon.targetTurretRotation ?? 0
    }

    return true
  }

  /**
   * 更新所有同步
   */
  update(_deltaTime: number): void {
    if (!this.options.useECS) return

    if (this.options.syncToUnit) {
      for (const [unitId] of this.unitMap) {
        this.syncECSToUnit(unitId)
      }
    }
  }

  /**
   * 注册所有单位
   */
  registerAllUnits(): void {
    for (const unit of this.gameManager.units.values()) {
      this.registerUnit(unit)
    }
  }

  /**
   * 清理
   */
  clear(): void {
    for (const mapping of this.unitMap.values()) {
      this.world.removeEntity(mapping.entity)
    }
    this.unitMap.clear()
    this.entityMap.clear()
  }
}
