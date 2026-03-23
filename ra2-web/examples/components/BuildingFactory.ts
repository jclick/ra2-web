/**
 * 建筑工厂
 * 
 * 创建带有完整组件的建筑实体
 */

import { World } from '../core/World'
import { EntityId } from '../core/Entity'
import { Faction } from '../core/Component'
import * as Components from '../core/Component'

// 建筑配置
const buildingConfigs: Record<string, {
  name: string
  health: number
  armor: Components.ArmorType
  width: number
  height: number
  powerConsumption: number
  powerProduction: number
  sight: number
  buildTime: number
  cost: number
  canProduce?: string[]
  modelId: string
}> = {
  // 盟军建筑
  'GAPOWR': {
    name: '发电厂',
    health: 750,
    armor: 'heavy',
    width: 2,
    height: 2,
    powerConsumption: 0,
    powerProduction: 200,
    sight: 4,
    buildTime: 10000,
    cost: 800,
    modelId: 'allied_power_plant'
  },
  'GAREFN': {
    name: '矿石精炼厂',
    health: 1000,
    armor: 'heavy',
    width: 3,
    height: 3,
    powerConsumption: 50,
    powerProduction: 0,
    sight: 6,
    buildTime: 20000,
    cost: 2000,
    modelId: 'allied_refinery'
  },
  'GAPILE': {
    name: '兵营',
    health: 500,
    armor: 'heavy',
    width: 2,
    height: 2,
    powerConsumption: 10,
    powerProduction: 0,
    sight: 5,
    buildTime: 8000,
    cost: 500,
    canProduce: ['infantry'],
    modelId: 'allied_barracks'
  },
  'GAWEAP': {
    name: '战车工厂',
    health: 1000,
    armor: 'heavy',
    width: 3,
    height: 4,
    powerConsumption: 25,
    powerProduction: 0,
    sight: 4,
    buildTime: 20000,
    cost: 2000,
    canProduce: ['vehicles'],
    modelId: 'allied_war_factory'
  },
  
  // 苏联建筑
  'NAPOWR': {
    name: '磁能反应堆',
    health: 750,
    armor: 'heavy',
    width: 2,
    height: 2,
    powerConsumption: 0,
    powerProduction: 200,
    sight: 4,
    buildTime: 10000,
    cost: 800,
    modelId: 'soviet_power_plant'
  },
  'NAREFN': {
    name: '矿石精炼厂',
    health: 1000,
    armor: 'heavy',
    width: 3,
    height: 3,
    powerConsumption: 50,
    powerProduction: 0,
    sight: 6,
    buildTime: 20000,
    cost: 2000,
    modelId: 'soviet_refinery'
  },
  'NAHAND': {
    name: '兵营',
    health: 500,
    armor: 'heavy',
    width: 2,
    height: 2,
    powerConsumption: 10,
    powerProduction: 0,
    sight: 5,
    buildTime: 8000,
    cost: 500,
    canProduce: ['infantry'],
    modelId: 'soviet_barracks'
  },
  'NAWEAP': {
    name: '战车工厂',
    health: 1000,
    armor: 'heavy',
    width: 3,
    height: 4,
    powerConsumption: 25,
    powerProduction: 0,
    sight: 4,
    buildTime: 20000,
    cost: 2000,
    canProduce: ['vehicles'],
    modelId: 'soviet_war_factory'
  }
}

export class BuildingFactory {
  /**
   * 创建建筑（放置模式）
   * 创建后的建筑处于 placement 状态，需要调用 ConstructionSystem.startConstruction 开始建造
   */
  static createBuilding(
    world: World,
    buildingType: string,
    position: { x: number; z: number },
    playerId: string,
    faction: Faction
  ): EntityId | null {
    const config = buildingConfigs[buildingType]
    if (!config) {
      console.warn(`[BuildingFactory] Unknown building type: ${buildingType}`)
      return null
    }
    
    // 创建实体
    const entity = world.createEntity('BUILDING')
    
    // 基础组件
    world.addComponent(entity.id, Components.ComponentType.TRANSFORM,
      Components.createTransform(position.x, 0, position.z))
    
    world.addComponent(entity.id, Components.ComponentType.HEALTH,
      Components.createHealth(config.health, config.armor))
    
    world.addComponent(entity.id, Components.ComponentType.OWNER,
      Components.createOwner(playerId, faction))
    
    world.addComponent(entity.id, Components.ComponentType.VISION,
      Components.createVision(config.sight))
    
    world.addComponent(entity.id, Components.ComponentType.POWER,
      Components.createPower(config.powerConsumption, config.powerProduction))
    
    world.addComponent(entity.id, Components.ComponentType.CONSTRUCTION,
      Components.createConstruction(config.cost, config.buildTime))
    
    world.addComponent(entity.id, Components.ComponentType.PLACEMENT,
      Components.createPlacement(config.width, config.height))
    
    world.addComponent(entity.id, Components.ComponentType.SELECTABLE,
      Components.createSelectable(2)) // 建筑选择优先级较高
    
    world.addComponent(entity.id, Components.ComponentType.RENDER,
      Components.createRender(config.modelId))
    
    // 如果有生产功能，添加生产组件
    if (config.canProduce) {
      world.addComponent(entity.id, Components.ComponentType.PRODUCTION,
        Components.createProduction())
    }
    
    return entity.id
  }
  
  /**
   * 创建矿石矿场
   */
  static createOreField(
    world: World,
    position: { x: number; z: number },
    amount: number,
    type: Components.ResourceType = Components.ResourceType.ORE
  ): EntityId {
    const entity = world.createEntity('RESOURCE')
    
    world.addComponent(entity.id, Components.ComponentType.TRANSFORM,
      Components.createTransform(position.x, 0, position.z))
    
    world.addComponent(entity.id, Components.ComponentType.ORE_FIELD,
      Components.createOreField(amount, type))
    
    world.addComponent(entity.id, Components.ComponentType.RENDER,
      Components.createRender(type === Components.ResourceType.GEMS ? 'gem_field' : 'ore_field'))
    
    return entity.id
  }
  
  /**
   * 获取建筑配置
   */
  static getConfig(buildingType: string) {
    return buildingConfigs[buildingType]
  }
  
  /**
   * 获取某阵营所有可用建筑类型
   */
  static getFactionBuildings(faction: Faction): string[] {
    const alliedBuildings = ['GAPOWR', 'GAREFN', 'GAPILE', 'GAWEAP']
    const sovietBuildings = ['NAPOWR', 'NAREFN', 'NAHAND', 'NAWEAP']
    
    return faction === Faction.ALLIES ? alliedBuildings : sovietBuildings
  }
  
  /**
   * 检查建筑是否可以生产某类单位
   */
  static canProduce(buildingType: string, category: string): boolean {
    const config = buildingConfigs[buildingType]
    return config?.canProduce?.includes(category) ?? false
  }
}
