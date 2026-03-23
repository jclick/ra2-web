/**
 * 单位工厂
 * 
 * 创建带有完整组件的单位实体
 */

import { World } from '../core/World'
import { EntityId } from '../core/Entity'
import { Faction } from '../core/Component'
import * as Components from '../core/Component'

// 武器配置
const weapons = {
  // 盟军武器
  m60: {
    id: 'm60',
    name: 'M60机枪',
    damage: 15,
    range: 4,
    cooldown: 400,
    damageType: 'small_arms',
    isTurret: false
  },
  grizzlyCannon: {
    id: 'grizzlyCannon',
    name: '90mm炮',
    damage: 65,
    range: 5,
    cooldown: 1200,
    damageType: 'armor_piercing',
    isTurret: true,
    turretRotationSpeed: 180
  },
  
  // 苏联武器
  makarov: {
    id: 'makarov',
    name: '马卡罗夫手枪',
    damage: 15,
    range: 4,
    cooldown: 400,
    damageType: 'small_arms',
    isTurret: false
  },
  rhinoCannon: {
    id: 'rhinoCannon',
    name: '120mm炮',
    damage: 90,
    range: 5.75,
    cooldown: 1300,
    damageType: 'armor_piercing',
    isTurret: true,
    turretRotationSpeed: 150
  }
}

// 单位配置
const unitConfigs: Record<string, {
  name: string
  health: number
  armor: Components.ArmorType
  speed: number
  turnRate: number
  movementType: Components.MovementType
  sight: number
  weapons: Components.WeaponConfig[]
  modelId: string
}> = {
  // 盟军单位
  'GI': {
    name: '美国大兵',
    health: 125,
    armor: 'none',
    speed: 15,
    turnRate: 180,
    movementType: 'foot',
    sight: 5,
    weapons: [weapons.m60],
    modelId: 'gi'
  },
  'GRIZZLY': {
    name: '灰熊坦克',
    health: 300,
    armor: 'heavy',
    speed: 40,
    turnRate: 90,
    movementType: 'track',
    sight: 8,
    weapons: [weapons.grizzlyCannon],
    modelId: 'grizzly_tank'
  },
  
  // 苏联单位
  'CONSCRIPT': {
    name: '动员兵',
    health: 125,
    armor: 'flak',
    speed: 15,
    turnRate: 180,
    movementType: 'foot',
    sight: 5,
    weapons: [weapons.makarov],
    modelId: 'conscript'
  },
  'RHINO': {
    name: '犀牛坦克',
    health: 400,
    armor: 'heavy',
    speed: 35,
    turnRate: 80,
    movementType: 'track',
    sight: 8,
    weapons: [weapons.rhinoCannon],
    modelId: 'rhino_tank'
  }
}

export class UnitFactory {
  /**
   * 创建单位
   */
  static createUnit(
    world: World,
    unitType: string,
    position: { x: number; y?: number; z: number },
    playerId: string,
    faction: Faction
  ): EntityId | null {
    const config = unitConfigs[unitType]
    if (!config) {
      console.warn(`[UnitFactory] Unknown unit type: ${unitType}`)
      return null
    }
    
    // 创建实体
    const entity = world.createEntity('UNIT')
    
    // 基础组件
    world.addComponent(entity.id, Components.ComponentType.TRANSFORM, 
      Components.createTransform(position.x, position.y || 0, position.z))
    
    world.addComponent(entity.id, Components.ComponentType.HEALTH,
      Components.createHealth(config.health, config.armor))
    
    world.addComponent(entity.id, Components.ComponentType.OWNER,
      Components.createOwner(playerId, faction))
    
    world.addComponent(entity.id, Components.ComponentType.MOVEMENT,
      Components.createMovement(config.speed, config.turnRate, config.movementType))
    
    world.addComponent(entity.id, Components.ComponentType.VISION,
      Components.createVision(config.sight))
    
    world.addComponent(entity.id, Components.ComponentType.COMBAT,
      Components.createCombat(config.weapons))
    
    world.addComponent(entity.id, Components.ComponentType.SELECTABLE,
      Components.createSelectable())
    
    world.addComponent(entity.id, Components.ComponentType.RENDER,
      Components.createRender(config.modelId))
    
    return entity.id
  }
  
  /**
   * 创建采矿车
   */
  static createHarvester(
    world: World,
    position: { x: number; y?: number; z: number },
    playerId: string,
    faction: Faction
  ): EntityId {
    const entity = world.createEntity('UNIT')
    
    world.addComponent(entity.id, Components.ComponentType.TRANSFORM,
      Components.createTransform(position.x, position.y || 0, position.z))
    
    world.addComponent(entity.id, Components.ComponentType.HEALTH,
      Components.createHealth(600, 'heavy'))
    
    world.addComponent(entity.id, Components.ComponentType.OWNER,
      Components.createOwner(playerId, faction))
    
    world.addComponent(entity.id, Components.ComponentType.MOVEMENT,
      Components.createMovement(30, 60, 'track'))
    
    world.addComponent(entity.id, Components.ComponentType.VISION,
      Components.createVision(6))
    
    world.addComponent(entity.id, Components.ComponentType.RESOURCE,
      Components.createResource(1000, Components.ResourceType.ORE))
    
    world.addComponent(entity.id, Components.ComponentType.SELECTABLE,
      Components.createSelectable())
    
    world.addComponent(entity.id, Components.ComponentType.RENDER,
      Components.createRender('chrono_miner'))
    
    return entity.id
  }
  
  /**
   * 获取单位配置
   */
  static getConfig(unitType: string) {
    return unitConfigs[unitType]
  }
  
  /**
   * 获取某阵营所有可用单位类型
   */
  static getFactionUnits(faction: Faction): string[] {
    const alliedUnits = ['GI', 'GRIZZLY']
    const sovietUnits = ['CONSCRIPT', 'RHINO']
    
    return faction === Faction.ALLIES ? alliedUnits : sovietUnits
  }
}
