import { Player, Vector3, BuildingType, BuildingState, BuildCategory, ProducibleItem, Faction } from '../types'

/**
 * 建筑属性配置
 */
export interface BuildingStats {
  name: string
  type: BuildingType
  category: BuildCategory
  
  // 建造成本
  cost: number
  buildTime: number
  techLevel: number
  
  // 生命值
  health: number
  armor: 'none' | 'flak' | 'plate' | 'heavy' | 'concrete'
  
  // 电力
  powerConsumption: number
  powerProduction: number
  
  // 视野
  sight: number
  
  // 尺寸（占据的单元格）
  width: number
  height: number
  
  // 特殊功能
  canProduce: boolean
  produces?: BuildCategory[]
  
  // 其他
  capturable: boolean
  infiltratable: boolean
  
  // 渲染
  imageSize: { width: number; height: number }
  foundationType: 'pavement' | 'water' | 'cliff'
}

/**
 * 建筑类
 */
export class Building {
  id: string
  type: BuildingType
  stats: BuildingStats
  owner: Player
  
  // 位置
  position: Vector3
  rotation: number = 0
  
  // 阵营
  faction: Faction
  
  // 状态
  state: BuildingState = BuildingState.CONSTRUCTION
  health: number
  maxHealth: number
  
  // 建造进度
  constructionProgress: number = 0
  
  // 电力
  isPowered: boolean = true
  
  // 生产
  productionQueue: ProducibleItem[] = []
  currentProduction?: ProducibleItem
  productionProgress: number = 0
  
  // 选择状态
  selected: boolean = false
  
  // 动画
  animFrame: number = 0
  
  constructor(
    id: string,
    type: BuildingType,
    stats: BuildingStats,
    position: Vector3,
    owner: Player
  ) {
    this.id = id
    this.type = type
    this.stats = stats
    this.position = position
    this.owner = owner
    this.faction = owner.faction
    this.health = stats.health
    this.maxHealth = stats.health
  }
  
  /**
   * 更新建筑
   */
  update(deltaTime: number): void {
    // 建造中
    if (this.state === BuildingState.CONSTRUCTION) {
      this.constructionProgress += deltaTime / this.stats.buildTime
      
      if (this.constructionProgress >= 1) {
        this.constructionProgress = 1
        this.state = BuildingState.IDLE
        this.onConstructionComplete()
      }
    }
    
    // 生产中
    if (this.state === BuildingState.PRODUCING && this.currentProduction) {
      this.productionProgress += deltaTime / this.currentProduction.buildTime
      
      if (this.productionProgress >= 1) {
        this.productionProgress = 0
        this.completeProduction()
      }
    }
    
    // 动画帧
    this.animFrame += deltaTime / 100
  }
  
  /**
   * 开始建造
   */
  startConstruction(): void {
    this.state = BuildingState.CONSTRUCTION
    this.constructionProgress = 0
    this.health = this.maxHealth * 0.1 // 建造中只有10%生命值
  }
  
  /**
   * 建造完成
   */
  private onConstructionComplete(): void {
    this.health = this.maxHealth
    this.state = BuildingState.IDLE
    
    // 更新玩家电力
    this.owner.power += this.stats.powerProduction
    this.owner.powerDrain += this.stats.powerConsumption
    
    // 触发回调
    this.onConstructionCompleted?.(this)
    
    console.log(`${this.stats.name} 建造完成`)
  }
  
  /**
   * 添加到生产队列
   */
  addToQueue(item: ProducibleItem): boolean {
    if (!this.canProduce(item)) return false
    
    // 检查资金
    if (this.owner.money < item.cost) return false
    
    // 扣费
    this.owner.money -= item.cost
    
    this.productionQueue.push(item)
    
    // 如果没有在生产，开始生产
    if (this.state !== BuildingState.PRODUCING) {
      this.startNextProduction()
    }
    
    return true
  }
  
  /**
   * 取消生产
   */
  cancelProduction(index: number): void {
    if (index === 0 && this.currentProduction) {
      // 取消当前生产，退款
      this.owner.money += Math.floor(this.currentProduction.cost * 0.5)
      this.productionProgress = 0
      this.currentProduction = undefined
      this.startNextProduction()
    } else if (index > 0 && index < this.productionQueue.length) {
      // 取消队列中的项目，全额退款
      const item = this.productionQueue[index]
      this.owner.money += item.cost
      this.productionQueue.splice(index, 1)
    }
  }
  
  /**
   * 开始下一个生产
   */
  private startNextProduction(): void {
    if (this.productionQueue.length > 0) {
      this.currentProduction = this.productionQueue.shift()
      this.productionProgress = 0
      this.state = BuildingState.PRODUCING
    } else {
      this.state = BuildingState.IDLE
      this.currentProduction = undefined
    }
  }
  
  /**
   * 完成生产
   */
  private completeProduction(): void {
    if (!this.currentProduction) return
    
    console.log(`${this.currentProduction.name} 生产完成`)
    
    // 触发单位创建事件
    this.onUnitProduced?.(this.currentProduction)
    
    this.startNextProduction()
  }
  
  /**
   * 检查是否可以生产某物品
   */
  canProduce(item: ProducibleItem): boolean {
    if (!this.stats.canProduce) return false
    if (!this.stats.produces?.includes(item.category)) return false
    if (this.state === BuildingState.CONSTRUCTION) return false
    if (!this.isPowered && this.stats.powerConsumption > 0) return false
    return true
  }
  
  /**
   * 受到伤害
   */
  takeDamage(damage: number): void {
    // 根据护甲减伤
    let actualDamage = damage
    switch (this.stats.armor) {
      case 'flak':
        actualDamage *= 0.75
        break
      case 'plate':
        actualDamage *= 0.5
        break
      case 'heavy':
      case 'concrete':
        actualDamage *= 0.25
        break
    }
    
    this.health -= actualDamage
    
    if (this.health <= 0) {
      this.onDestroyed()
    }
  }
  
  /**
   * 被摧毁
   */
  private onDestroyed(): void {
    // 从玩家移除
    const index = this.owner.buildings.indexOf(this)
    if (index > -1) {
      this.owner.buildings.splice(index, 1)
    }
    
    // 更新电力
    this.owner.power -= this.stats.powerProduction
    this.owner.powerDrain -= this.stats.powerConsumption
    
    // 触发爆炸效果
    this.onBuildingDestroyed?.(this)
  }
  
  /**
   * 出售建筑
   */
  sell(): void {
    // 退款50%
    const refund = Math.floor(this.stats.cost * 0.5)
    this.owner.money += refund
    
    this.onDestroyed()
  }
  
  /**
   * 修复
   */
  repair(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth)
  }
  
  // 事件回调
  onUnitProduced?: (item: ProducibleItem) => void
  onBuildingDestroyed?: (building: Building) => void
  onConstructionCompleted?: (building: Building) => void
}

/**
 * 建筑数据库
 */
export const buildingDatabase: Record<string, BuildingStats> = {
  // === 盟军建筑 ===
  
  // 建造厂
  GACNST: {
    name: '盟军建造厂',
    type: BuildingType.CONSTRUCTION_YARD,
    category: BuildCategory.BUILDINGS,
    cost: 0,
    buildTime: 0,
    techLevel: 0,
    health: 1000,
    armor: 'concrete',
    powerConsumption: 0,
    powerProduction: 0,
    sight: 10,
    width: 4,
    height: 3,
    canProduce: true,
    produces: [BuildCategory.BUILDINGS, BuildCategory.DEFENSES],
    capturable: true,
    infiltratable: false,
    imageSize: { width: 96, height: 72 },
    foundationType: 'pavement',
  },
  
  // 发电厂
  GAPOWR: {
    name: '发电厂',
    type: BuildingType.POWER_PLANT,
    category: BuildCategory.BUILDINGS,
    cost: 800,
    buildTime: 10000,
    techLevel: 1,
    health: 750,
    armor: 'heavy',
    powerConsumption: 0,
    powerProduction: 200,
    sight: 4,
    width: 2,
    height: 2,
    canProduce: false,
    capturable: true,
    infiltratable: true,
    imageSize: { width: 64, height: 64 },
    foundationType: 'pavement',
  },
  
  // 矿石精炼厂
  GAREFN: {
    name: '矿石精炼厂',
    type: BuildingType.ORE_REFINERY,
    category: BuildCategory.BUILDINGS,
    cost: 2000,
    buildTime: 20000,
    techLevel: 1,
    health: 1000,
    armor: 'heavy',
    powerConsumption: 50,
    powerProduction: 0,
    sight: 6,
    width: 3,
    height: 3,
    canProduce: false,
    capturable: true,
    infiltratable: true,
    imageSize: { width: 96, height: 96 },
    foundationType: 'pavement',
  },
  
  // 兵营
  GAPILE: {
    name: '兵营',
    type: BuildingType.BARRACKS,
    category: BuildCategory.BUILDINGS,
    cost: 500,
    buildTime: 8000,
    techLevel: 1,
    health: 500,
    armor: 'heavy',
    powerConsumption: 10,
    powerProduction: 0,
    sight: 5,
    width: 2,
    height: 2,
    canProduce: true,
    produces: [BuildCategory.INFANTRY],
    capturable: true,
    infiltratable: true,
    imageSize: { width: 64, height: 64 },
    foundationType: 'pavement',
  },
  
  // 战车工厂
  GAWEAP: {
    name: '战车工厂',
    type: BuildingType.WAR_FACTORY,
    category: BuildCategory.BUILDINGS,
    cost: 2000,
    buildTime: 20000,
    techLevel: 2,
    health: 1000,
    armor: 'heavy',
    powerConsumption: 25,
    powerProduction: 0,
    sight: 4,
    width: 3,
    height: 4,
    canProduce: true,
    produces: [BuildCategory.VEHICLES],
    capturable: true,
    infiltratable: true,
    imageSize: { width: 96, height: 128 },
    foundationType: 'pavement',
  },
  
  // 空指部
  GAHPAD: {
    name: '空指部',
    type: BuildingType.AIRFIELD,
    category: BuildCategory.BUILDINGS,
    cost: 1000,
    buildTime: 15000,
    techLevel: 3,
    health: 600,
    armor: 'heavy',
    powerConsumption: 50,
    powerProduction: 0,
    sight: 10,
    width: 2,
    height: 2,
    canProduce: true,
    produces: [BuildCategory.AIRCRAFT],
    capturable: true,
    infiltratable: true,
    imageSize: { width: 64, height: 64 },
    foundationType: 'pavement',
  },
  
  // 光棱塔
  GAPILL: {
    name: '光棱塔',
    type: BuildingType.PRISM_TOWER,
    category: BuildCategory.DEFENSES,
    cost: 1500,
    buildTime: 15000,
    techLevel: 3,
    health: 600,
    armor: 'heavy',
    powerConsumption: 75,
    powerProduction: 0,
    sight: 10,
    width: 1,
    height: 1,
    canProduce: false,
    capturable: false,
    infiltratable: false,
    imageSize: { width: 32, height: 32 },
    foundationType: 'pavement',
  },
  
  // === 苏联建筑 ===
  
  // 苏联建造厂
  NACNST: {
    name: '苏联建造厂',
    type: BuildingType.CONSTRUCTION_YARD,
    category: BuildCategory.BUILDINGS,
    cost: 0,
    buildTime: 0,
    techLevel: 0,
    health: 1000,
    armor: 'concrete',
    powerConsumption: 0,
    powerProduction: 0,
    sight: 10,
    width: 4,
    height: 3,
    canProduce: true,
    produces: [BuildCategory.BUILDINGS, BuildCategory.DEFENSES],
    capturable: true,
    infiltratable: false,
    imageSize: { width: 96, height: 72 },
    foundationType: 'pavement',
  },
  
  // 磁能反应堆
  NAPOWR: {
    name: '磁能反应堆',
    type: BuildingType.POWER_PLANT,
    category: BuildCategory.BUILDINGS,
    cost: 800,
    buildTime: 10000,
    techLevel: 1,
    health: 750,
    armor: 'heavy',
    powerConsumption: 0,
    powerProduction: 200,
    sight: 4,
    width: 2,
    height: 2,
    canProduce: false,
    capturable: true,
    infiltratable: true,
    imageSize: { width: 64, height: 64 },
    foundationType: 'pavement',
  },
  
  // 苏联精炼厂
  NAREFN: {
    name: '苏联矿石精炼厂',
    type: BuildingType.ORE_REFINERY,
    category: BuildCategory.BUILDINGS,
    cost: 2000,
    buildTime: 20000,
    techLevel: 1,
    health: 1000,
    armor: 'heavy',
    powerConsumption: 50,
    powerProduction: 0,
    sight: 6,
    width: 3,
    height: 3,
    canProduce: false,
    capturable: true,
    infiltratable: true,
    imageSize: { width: 96, height: 96 },
    foundationType: 'pavement',
  },
  
  // 苏联兵营
  NAHAND: {
    name: '苏联兵营',
    type: BuildingType.BARRACKS,
    category: BuildCategory.BUILDINGS,
    cost: 500,
    buildTime: 8000,
    techLevel: 1,
    health: 500,
    armor: 'heavy',
    powerConsumption: 10,
    powerProduction: 0,
    sight: 5,
    width: 2,
    height: 2,
    canProduce: true,
    produces: [BuildCategory.INFANTRY],
    capturable: true,
    infiltratable: true,
    imageSize: { width: 64, height: 64 },
    foundationType: 'pavement',
  },
  
  // 苏联战车工厂
  NAWEAP: {
    name: '苏联战车工厂',
    type: BuildingType.WAR_FACTORY,
    category: BuildCategory.BUILDINGS,
    cost: 2000,
    buildTime: 20000,
    techLevel: 2,
    health: 1000,
    armor: 'heavy',
    powerConsumption: 25,
    powerProduction: 0,
    sight: 4,
    width: 3,
    height: 4,
    canProduce: true,
    produces: [BuildCategory.VEHICLES],
    capturable: true,
    infiltratable: true,
    imageSize: { width: 96, height: 128 },
    foundationType: 'pavement',
  },
  
  // 特斯拉线圈
  NALASR: {
    name: '特斯拉线圈',
    type: BuildingType.TESLA_COIL,
    category: BuildCategory.DEFENSES,
    cost: 1500,
    buildTime: 15000,
    techLevel: 3,
    health: 600,
    armor: 'heavy',
    powerConsumption: 75,
    powerProduction: 0,
    sight: 10,
    width: 1,
    height: 1,
    canProduce: false,
    capturable: false,
    infiltratable: false,
    imageSize: { width: 32, height: 32 },
    foundationType: 'pavement',
  },
}

/**
 * 建筑工厂
 */
export class BuildingFactory {
  private static idCounter = 0
  
  /**
   * 创建建筑
   */
  static createBuilding(
    buildingId: string,
    position: Vector3,
    owner: Player
  ): Building | null {
    const stats = buildingDatabase[buildingId]
    if (!stats) return null
    
    const id = `${buildingId}_${++this.idCounter}_${Date.now()}`
    return new Building(id, stats.type, stats, position, owner)
  }
  
  /**
   * 获取建筑属性
   */
  static getStats(buildingId: string): BuildingStats | null {
    return buildingDatabase[buildingId] || null
  }
  
  /**
   * 获取某阵营的建筑列表
   */
  static getFactionBuildings(faction: Faction): string[] {
    const alliedBuildings = ['GACNST', 'GAPOWR', 'GAREFN', 'GAPILE', 'GAWEAP', 'GAHPAD', 'GAPILL']
    const sovietBuildings = ['NACNST', 'NAPOWR', 'NAREFN', 'NAHAND', 'NAWEAP', 'NALASR']
    
    return faction === Faction.ALLIES ? alliedBuildings : sovietBuildings
  }
}
