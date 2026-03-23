/**
 * SuperWeaponSystem
 *
 * 处理超级武器逻辑
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import {
  SuperWeaponComponent,
  SuperWeaponState,
  SuperWeaponType,
  SUPER_WEAPON_TYPE
} from '../components/SuperWeaponComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { OwnerComponent, OWNER_TYPE, Faction } from '../components/OwnerComponent'

// 超级武器效果事件
export interface SuperWeaponEffectEvent {
  type: SuperWeaponType
  position: { x: number; z: number }
  radius: number
  faction: Faction
  countdown: number
}

export class SuperWeaponSystem extends EntitySystem {
  readonly priority = SystemPriority.HIGH

  constructor() {
    super(SUPER_WEAPON_TYPE)
  }

  initialize(world: World): void {
    super.initialize(world)
  }

  protected updateEntity(entity: Entity, deltaTime: number): void {
    const weapon = entity.getComponent<SuperWeaponComponent>(SUPER_WEAPON_TYPE)
    if (!weapon) return

    // 根据状态更新
    switch (weapon.state) {
      case SuperWeaponState.CHARGING:
        weapon.updateCharge(deltaTime)
        break
      case SuperWeaponState.FIRING:
        weapon.updateFireCountdown(deltaTime)
        if (weapon.fireCountdown <= 5 && weapon.fireCountdown > 4.9) {
          // 发射前5秒触发效果
          this.triggerLaunchEffects(entity, weapon)
        }
        if (weapon.fireCountdown <= 0) {
          // 实际发射
          this.fireSuperWeapon(entity, weapon)
        }
        break
      case SuperWeaponState.COOLDOWN:
        weapon.updateCooldown(deltaTime)
        break
    }
  }

  /**
   * 触发发射特效
   */
  private triggerLaunchEffects(entity: Entity, weapon: SuperWeaponComponent): void {
    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)

    if (!transform || !owner) return

    // 发送发射事件
    this.world?.events.emit('super_weapon:launching', {
      type: weapon.config.type,
      position: weapon.targetPosition,
      sourcePosition: {
        x: transform.position.x,
        z: transform.position.z
      },
      faction: owner.faction,
      countdown: weapon.fireCountdown
    })
  }

  /**
   * 发射超级武器
   */
  private fireSuperWeapon(entity: Entity, weapon: SuperWeaponComponent): void {
    if (!weapon.targetPosition) return

    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    if (!owner) return

    // 发送发射事件
    this.world?.events.emit('super_weapon:fired', {
      type: weapon.config.type,
      position: weapon.targetPosition,
      radius: weapon.config.range,
      faction: owner.faction,
      damage: weapon.config.damage
    })

    // 应用效果
    this.applySuperWeaponEffect(weapon, owner.faction)
  }

  /**
   * 应用超级武器效果
   */
  private applySuperWeaponEffect(weapon: SuperWeaponComponent, faction: Faction): void {
    const pos = weapon.targetPosition
    if (!pos) return

    switch (weapon.config.type) {
      case SuperWeaponType.LIGHTNING_STORM:
        this.applyLightningStorm(pos, weapon.config.range, weapon.config.damage, faction)
        break
      case SuperWeaponType.NUKE:
        this.applyNuke(pos, weapon.config.range, weapon.config.damage, faction)
        break
      case SuperWeaponType.CHRONOSPHERE:
        this.applyChronosphere(pos, weapon.config.range)
        break
      case SuperWeaponType.IRON_CURTAIN:
        this.applyIronCurtain(pos, weapon.config.range, weapon.config.duration)
        break
      case SuperWeaponType.GENETIC_MUTATOR:
        this.applyGeneticMutator(pos, weapon.config.range)
        break
      case SuperWeaponType.PSYCHIC_DOMINATOR:
        this.applyPsychicDominator(pos, weapon.config.range, faction)
        break
    }
  }

  /**
   * 闪电风暴效果
   */
  private applyLightningStorm(
    position: { x: number; z: number },
    range: number,
    damage: number,
    faction: Faction
  ): void {
    // 触发视觉效果
    this.world?.events.emit('effect:spawn', {
      type: 'lightning_storm',
      position,
      range,
      duration: 15
    })

    // 持续伤害逻辑
    const applyDamage = () => {
      // 获取范围内所有单位并造成伤害
      this.world?.events.emit('combat:area_damage', {
        position,
        radius: range,
        damage: damage / 15, // 分散到15秒
        faction
      })
    }

    // 每秒造成伤害
    for (let i = 0; i < 15; i++) {
      setTimeout(applyDamage, i * 1000)
    }
  }

  /**
   * 核弹效果
   */
  private applyNuke(
    position: { x: number; z: number },
    range: number,
    damage: number,
    faction: Faction
  ): void {
    // 触发核弹特效
    this.world?.events.emit('effect:spawn', {
      type: 'nuke_explosion',
      position,
      range
    })

    // 瞬间伤害
    this.world?.events.emit('combat:area_damage', {
      position,
      radius: range,
      damage,
      faction,
      instant: true
    })

    // 辐射残留效果
    this.world?.events.emit('effect:spawn', {
      type: 'radiation',
      position,
      range: range * 0.5,
      duration: 30
    })
  }

  /**
   * 超时空传送效果
   */
  private applyChronosphere(
    position: { x: number; z: number },
    range: number
  ): void {
    // 获取范围内的单位
    const units: number[] = []

    for (const entity of this.world?.getAllEntities() || []) {
      const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
      if (!transform) continue

      const dx = transform.position.x - position.x
      const dz = transform.position.z - position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= range) {
        units.push(entity.id)
      }
    }

    // 存储待传送单位
    this.world?.events.emit('super_weapon:chronosphere_ready', {
      units,
      sourcePosition: position,
      range
    })
  }

  /**
   * 铁幕效果
   */
  private applyIronCurtain(
    position: { x: number; z: number },
    range: number,
    duration: number
  ): void {
    for (const entity of this.world?.getAllEntities() || []) {
      const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
      if (!transform) continue

      const dx = transform.position.x - position.x
      const dz = transform.position.z - position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= range) {
        // 给单位添加无敌效果
        this.world?.events.emit('combat:iron_curtain', {
          entityId: entity.id,
          duration
        })

        // 视觉特效
        this.world?.events.emit('effect:attach', {
          entityId: entity.id,
          type: 'iron_curtain_aura',
          duration
        })
      }
    }
  }

  /**
   * 基因突变器效果
   */
  private applyGeneticMutator(
    position: { x: number; z: number },
    range: number
  ): void {
    for (const entity of this.world?.getAllEntities() || []) {
      const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
      if (!transform) continue

      const dx = transform.position.x - position.x
      const dz = transform.position.z - position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= range) {
        // 将步兵变成狂兽人
        this.world?.events.emit('super_weapon:mutate', {
          entityId: entity.id
        })
      }
    }

    // 视觉特效
    this.world?.events.emit('effect:spawn', {
      type: 'mutate_field',
      position,
      range
    })
  }

  /**
   * 精神控制塔效果
   */
  private applyPsychicDominator(
    position: { x: number; z: number },
    range: number,
    faction: Faction
  ): void {
    for (const entity of this.world?.getAllEntities() || []) {
      const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
      const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)

      if (!transform || !owner) continue

      const dx = transform.position.x - position.x
      const dz = transform.position.z - position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= range && owner.faction !== faction) {
        // 控制单位
        this.world?.events.emit('super_weapon:mind_control', {
          entityId: entity.id,
          newFaction: faction
        })
      }
    }

    // 视觉特效
    this.world?.events.emit('effect:spawn', {
      type: 'psychic_wave',
      position,
      range
    })
  }

  /**
   * 建造超级武器
   */
  buildSuperWeapon(entity: Entity): void {
    const weapon = entity.getComponent<SuperWeaponComponent>(SUPER_WEAPON_TYPE)
    if (!weapon) return

    weapon.isBuilt = true
    weapon.state = SuperWeaponState.CHARGING
    weapon.chargeProgress = 0

    this.world?.events.emit('super_weapon:built', {
      entityId: entity.id,
      type: weapon.config.type
    })
  }

  /**
   * 设置目标并发射
   */
  launchAt(entity: Entity, position: { x: number; z: number }): boolean {
    const weapon = entity.getComponent<SuperWeaponComponent>(SUPER_WEAPON_TYPE)
    if (!weapon || !weapon.setTarget(position)) return false

    return weapon.fire()
  }

  /**
   * 获取玩家所有超级武器
   */
  getPlayerSuperWeapons(playerId: string): Entity[] {
    const weapons: Entity[] = []

    for (const entity of this.entities) {
      const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
      if (owner?.playerId === playerId) {
        weapons.push(entity)
      }
    }

    return weapons
  }

  /**
   * 获取就绪的超级武器
   */
  getReadySuperWeapons(playerId: string): Entity[] {
    return this.getPlayerSuperWeapons(playerId).filter(entity => {
      const weapon = entity.getComponent<SuperWeaponComponent>(SUPER_WEAPON_TYPE)
      return weapon?.isReady()
    })
  }
}
