import { Faction, BuildCategory, ProducibleItem } from '../types'
import { Player } from '../types'
import { Building } from '../buildings/BuildingSystem'

/**
 * 科技树节点
 * 表示一个可解锁的项目（建筑、单位、科技）
 */
export interface TechNode {
  id: string
  name: string
  category: BuildCategory
  
  // 科技等级要求
  techLevel: number
  
  // 前置建筑要求（需要建造哪些建筑才能解锁）
  requiredBuildings: string[]
  
  // 前置科技要求（需要先研究哪些科技）
  requiredTechs: string[]
  
  // 阵营限制（null表示所有阵营可用）
  faction: Faction | null
  
  // 是否被间谍渗透解锁（特殊解锁方式）
  infiltrationUnlock?: {
    targetBuilding: string  // 渗透哪个建筑
    originalFaction: Faction  // 原属阵营
  }
  
  // 互斥科技（选择其一后不能选择另一个）
  mutuallyExclusive?: string[]
  
  // 图标和描述
  icon: string
  description: string
}

/**
 * 科技树解锁状态
 */
export interface TechUnlockStatus {
  nodeId: string
  isUnlocked: boolean
  isVisible: boolean  // 是否显示在菜单中（部分科技需要前置条件满足才显示）
  reason?: string  // 未解锁的原因说明
}

/**
 * 科技树系统
 * 管理所有科技解锁逻辑
 */
export class TechTree {
  // 科技节点数据库
  private techNodes: Map<string, TechNode> = new Map()
  
  // 玩家已解锁的科技
  private unlockedTechs: Map<string, Set<string>> = new Map()
  
  // 玩家已渗透解锁的科技（间谍特殊解锁）
  private infiltrationUnlocks: Map<string, Set<string>> = new Map()
  
  // 玩家选择的互斥科技路径
  private chosenPaths: Map<string, Map<string, string>> = new Map()
  
  constructor() {
    this.initializeTechTree()
  }
  
  /**
   * 初始化科技树数据
   */
  private initializeTechTree(): void {
    // === 盟军建筑科技 ===
    this.registerTech({
      id: 'GAPOWR',
      name: '发电厂',
      category: BuildCategory.BUILDINGS,
      techLevel: 1,
      requiredBuildings: [],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '⚡',
      description: '提供基础电力'
    })
    
    this.registerTech({
      id: 'GAREFN',
      name: '矿石精炼厂',
      category: BuildCategory.BUILDINGS,
      techLevel: 1,
      requiredBuildings: ['GAPOWR'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '⛏️',
      description: '采集矿石获取资金'
    })
    
    this.registerTech({
      id: 'GAPILE',
      name: '兵营',
      category: BuildCategory.BUILDINGS,
      techLevel: 1,
      requiredBuildings: ['GAPOWR'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🏛️',
      description: '训练步兵单位'
    })
    
    this.registerTech({
      id: 'GAWEAP',
      name: '战车工厂',
      category: BuildCategory.BUILDINGS,
      techLevel: 2,
      requiredBuildings: ['GAPILE', 'GAREFN'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🔧',
      description: '生产载具单位'
    })
    
    this.registerTech({
      id: 'GAHPAD',
      name: '空指部',
      category: BuildCategory.BUILDINGS,
      techLevel: 3,
      requiredBuildings: ['GAWEAP', 'GAREFN'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🚁',
      description: '生产飞行器'
    })
    
    this.registerTech({
      id: 'GATECH',
      name: '作战实验室',
      category: BuildCategory.BUILDINGS,
      techLevel: 4,
      requiredBuildings: ['GAWEAP', 'GAHPAD'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🔬',
      description: '解锁高级科技和超级武器'
    })
    
    // 盟军超级武器
    this.registerTech({
      id: 'GAWEAT',
      name: '天气控制机',
      category: BuildCategory.BUILDINGS,
      techLevel: 10,
      requiredBuildings: ['GATECH'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '⛈️',
      description: '超级武器：闪电风暴'
    })
    
    this.registerTech({
      id: 'GACSPH',
      name: '超时空传送仪',
      category: BuildCategory.BUILDINGS,
      techLevel: 10,
      requiredBuildings: ['GATECH'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🔮',
      description: '超级武器：超时空传送'
    })
    
    // 盟军防御建筑
    this.registerTech({
      id: 'GAPILL',
      name: '光棱塔',
      category: BuildCategory.DEFENSES,
      techLevel: 3,
      requiredBuildings: ['GAPILE'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🔮',
      description: '先进防御塔'
    })
    
    // === 苏联建筑科技 ===
    this.registerTech({
      id: 'NAPOWR',
      name: '磁能反应堆',
      category: BuildCategory.BUILDINGS,
      techLevel: 1,
      requiredBuildings: [],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '⚡',
      description: '提供基础电力'
    })
    
    this.registerTech({
      id: 'NAREFN',
      name: '矿石精炼厂',
      category: BuildCategory.BUILDINGS,
      techLevel: 1,
      requiredBuildings: ['NAPOWR'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '⛏️',
      description: '采集矿石获取资金'
    })
    
    this.registerTech({
      id: 'NAHAND',
      name: '兵营',
      category: BuildCategory.BUILDINGS,
      techLevel: 1,
      requiredBuildings: ['NAPOWR'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '🏛️',
      description: '训练步兵单位'
    })
    
    this.registerTech({
      id: 'NAWEAP',
      name: '战车工厂',
      category: BuildCategory.BUILDINGS,
      techLevel: 2,
      requiredBuildings: ['NAHAND', 'NAREFN'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '🔧',
      description: '生产载具单位'
    })
    
    this.registerTech({
      id: 'NARADR',
      name: '雷达站',
      category: BuildCategory.BUILDINGS,
      techLevel: 3,
      requiredBuildings: ['NAWEAP'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '📡',
      description: '提供雷达小地图'
    })
    
    this.registerTech({
      id: 'NATECH',
      name: '作战实验室',
      category: BuildCategory.BUILDINGS,
      techLevel: 4,
      requiredBuildings: ['NAWEAP', 'NARADR'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '🔬',
      description: '解锁高级科技和超级武器'
    })
    
    // 苏联超级武器
    this.registerTech({
      id: 'NANRCT',
      name: '核弹发射井',
      category: BuildCategory.BUILDINGS,
      techLevel: 10,
      requiredBuildings: ['NATECH'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '☢️',
      description: '超级武器：核弹攻击'
    })
    
    this.registerTech({
      id: 'NAIRON',
      name: '铁幕装置',
      category: BuildCategory.BUILDINGS,
      techLevel: 10,
      requiredBuildings: ['NATECH'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '🛡️',
      description: '超级武器：铁幕'
    })
    
    // 苏联防御建筑
    this.registerTech({
      id: 'NALASR',
      name: '特斯拉线圈',
      category: BuildCategory.DEFENSES,
      techLevel: 3,
      requiredBuildings: ['NAHAND'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '⚡',
      description: '先进防御塔'
    })
    
    // === 盟军单位科技 ===
    this.registerTech({
      id: 'GI',
      name: '美国大兵',
      category: BuildCategory.INFANTRY,
      techLevel: 1,
      requiredBuildings: ['GAPILE'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '👤',
      description: '基础步兵单位'
    })
    
    this.registerTech({
      id: 'ENGINEER',
      name: '工程师',
      category: BuildCategory.INFANTRY,
      techLevel: 1,
      requiredBuildings: ['GAPILE'],
      requiredTechs: [],
      faction: null, // 双方都有
      icon: '🔧',
      description: '占领和修复建筑'
    })
    
    this.registerTech({
      id: 'SPY',
      name: '间谍',
      category: BuildCategory.INFANTRY,
      techLevel: 3,
      requiredBuildings: ['GAPILE'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🕵️',
      description: '渗透敌方建筑获取科技'
    })
    
    this.registerTech({
      id: 'GRIZZLY',
      name: '灰熊坦克',
      category: BuildCategory.VEHICLES,
      techLevel: 1,
      requiredBuildings: ['GAWEAP'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      icon: '🛡️',
      description: '主战坦克'
    })
    
    // === 苏联单位科技 ===
    this.registerTech({
      id: 'CONSCRIPT',
      name: '动员兵',
      category: BuildCategory.INFANTRY,
      techLevel: 1,
      requiredBuildings: ['NAHAND'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '👤',
      description: '基础步兵单位'
    })
    
    this.registerTech({
      id: 'RHINO',
      name: '犀牛坦克',
      category: BuildCategory.VEHICLES,
      techLevel: 1,
      requiredBuildings: ['NAWEAP'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      icon: '🛡️',
      description: '主战坦克'
    })
    
    // === 渗透解锁科技（间谍特殊功能）===
    this.registerTech({
      id: 'RHINO_ALLIED',
      name: '犀牛坦克',
      category: BuildCategory.VEHICLES,
      techLevel: 1,
      requiredBuildings: ['GAWEAP'],
      requiredTechs: [],
      faction: Faction.ALLIES,
      infiltrationUnlock: {
        targetBuilding: 'NAWEAP',
        originalFaction: Faction.SOVIET
      },
      icon: '🛡️',
      description: '渗透苏联战车工厂解锁'
    })
    
    this.registerTech({
      id: 'GRIZZLY_SOVIET',
      name: '灰熊坦克',
      category: BuildCategory.VEHICLES,
      techLevel: 1,
      requiredBuildings: ['NAWEAP'],
      requiredTechs: [],
      faction: Faction.SOVIET,
      infiltrationUnlock: {
        targetBuilding: 'GAWEAP',
        originalFaction: Faction.ALLIES
      },
      icon: '🛡️',
      description: '渗透盟军战车工厂解锁'
    })
  }
  
  /**
   * 注册科技节点
   */
  private registerTech(node: TechNode): void {
    this.techNodes.set(node.id, node)
  }
  
  /**
   * 获取科技节点
   */
  getTechNode(id: string): TechNode | undefined {
    return this.techNodes.get(id)
  }
  
  /**
   * 检查科技是否已解锁
   */
  isUnlocked(techId: string, player: Player): boolean {
    const node = this.techNodes.get(techId)
    if (!node) return false
    
    // 阵营检查
    if (node.faction !== null && node.faction !== player.faction) {
      // 检查是否通过渗透解锁
      if (!this.isInfiltrationUnlocked(techId, player.id)) {
        return false
      }
    }
    
    // 检查前置建筑
    for (const requiredBuildingId of node.requiredBuildings) {
      // 检查玩家是否已有对应建筑
      const hasBuilding = player.buildings.some((building) => {
        return (building as unknown as Building).buildingId === requiredBuildingId
      })
      
      if (!hasBuilding) {
        return false
      }
    }
    
    // 检查前置科技
    const playerUnlocked = this.unlockedTechs.get(player.id) || new Set()
    for (const requiredTech of node.requiredTechs) {
      if (!playerUnlocked.has(requiredTech)) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * 检查是否通过渗透解锁
   */
  private isInfiltrationUnlocked(techId: string, playerId: string): boolean {
    const infiltrationSet = this.infiltrationUnlocks.get(playerId)
    return infiltrationSet?.has(techId) ?? false
  }
  
  /**
   * 渗透解锁科技（间谍功能）
   */
  infiltrationUnlock(targetBuildingType: string, player: Player, targetFaction: Faction): string[] {
    const unlockedTechs: string[] = []
    
    // 查找所有可以通过渗透该建筑解锁的科技
    for (const [id, node] of this.techNodes) {
      if (node.infiltrationUnlock && 
          node.infiltrationUnlock.targetBuilding === targetBuildingType &&
          node.infiltrationUnlock.originalFaction === targetFaction &&
          node.faction === player.faction) {
        
        // 解锁该科技
        if (!this.infiltrationUnlocks.has(player.id)) {
          this.infiltrationUnlocks.set(player.id, new Set())
        }
        this.infiltrationUnlocks.get(player.id)!.add(id)
        unlockedTechs.push(id)
      }
    }
    
    return unlockedTechs
  }
  
  /**
   * 获取所有可解锁项目的状态
   */
  getUnlockStatuses(player: Player, category?: BuildCategory): TechUnlockStatus[] {
    const statuses: TechUnlockStatus[] = []
    
    for (const [id, node] of this.techNodes) {
      // 过滤类别
      if (category && node.category !== category) continue
      
      // 检查阵营
      if (node.faction !== null && node.faction !== player.faction) {
        // 检查是否可以通过渗透解锁
        if (!this.isInfiltrationUnlocked(id, player.id)) {
          continue
        }
      }
      
      const isUnlocked = this.isUnlocked(id, player)
      
      // 判断是否显示（部分科技需要前置条件满足才显示）
      let isVisible = true
      let reason = ''
      
      if (!isUnlocked) {
        // 检查是否满足显示条件（至少有一个前置条件接近满足）
        const hasNearPrerequisite = this.checkNearPrerequisite(node, player)
        isVisible = hasNearPrerequisite
        
        // 生成未解锁原因
        if (node.requiredBuildings.length > 0) {
          reason = `需要: ${node.requiredBuildings.map(id => this.techNodes.get(id)?.name || id).join(', ')}`
        }
      }
      
      statuses.push({
        nodeId: id,
        isUnlocked,
        isVisible,
        reason
      })
    }
    
    return statuses
  }
  
  /**
   * 检查是否接近满足前置条件（用于判断是否显示）
   */
  private checkNearPrerequisite(node: TechNode, player: Player): boolean {
    // 如果没有前置要求，始终显示
    if (node.requiredBuildings.length === 0 && node.requiredTechs.length === 0) {
      return true
    }
    
    // 如果已经满足部分前置条件，显示
    const partialMatch = node.requiredBuildings.length === 0 || node.requiredBuildings.some(() => {
      // 简化处理：前置条件为空或者有任意建筑即可
      return player.buildings.length > 0
    })
    
    return partialMatch
  }
  
  /**
   * 获取指定类别的可建造项目
   */
  getAvailableItems(player: Player, category: BuildCategory): ProducibleItem[] {
    const items: ProducibleItem[] = []
    
    for (const [id, node] of this.techNodes) {
      if (node.category !== category) continue
      
      // 检查是否解锁
      if (!this.isUnlocked(id, player)) continue
      
      items.push({
        id: node.id,
        name: node.name,
        category: node.category,
        cost: this.getItemCost(id),
        buildTime: this.getItemBuildTime(id),
        techLevel: node.techLevel,
        icon: node.icon,
        requires: node.requiredBuildings
      })
    }
    
    return items
  }
  
  /**
   * 获取建造成本（从建筑数据库查询）
   */
  private getItemCost(id: string): number {
    // 从建筑数据库查询成本
    const buildingCosts: Record<string, number> = {
      'GAPOWR': 800, 'NAPOWR': 800,
      'GAREFN': 2000, 'NAREFN': 2000,
      'GAPILE': 500, 'NAHAND': 500,
      'GAWEAP': 2000, 'NAWEAP': 2000,
      'GAHPAD': 1000, 'NARADR': 1000,
      'GAPILL': 1500, 'NALASR': 1500,
      'GATECH': 1500, 'NATECH': 1500,
      'GAWEAT': 5000, 'NANRCT': 5000,
      'GACSPH': 2500, 'NAIRON': 2500,
      'GI': 200, 'CONSCRIPT': 100,
      'ENGINEER': 500,
      'SPY': 1000,
      'GRIZZLY': 700, 'RHINO': 900,
    }
    
    return buildingCosts[id] || 1000
  }
  
  /**
   * 获取建造时间（毫秒）
   */
  private getItemBuildTime(id: string): number {
    const buildTimes: Record<string, number> = {
      'GAPOWR': 10000, 'NAPOWR': 10000,
      'GAREFN': 20000, 'NAREFN': 20000,
      'GAPILE': 8000, 'NAHAND': 8000,
      'GAWEAP': 20000, 'NAWEAP': 20000,
      'GAHPAD': 15000, 'NARADR': 15000,
      'GI': 5000, 'CONSCRIPT': 4000,
      'ENGINEER': 8000,
      'GRIZZLY': 10000, 'RHINO': 12000,
    }
    
    return buildTimes[id] || 10000
  }
  
  /**
   * 玩家建造了某个建筑后，解锁相关科技
   */
  onBuildingConstructed(_buildingId: string, _player: Player): void {
    // 可以在这里触发科技解锁事件
    // 例如：建造作战实验室后解锁超级武器
  }
  
  /**
   * 重置玩家科技（新游戏）
   */
  resetPlayerTech(playerId: string): void {
    this.unlockedTechs.delete(playerId)
    this.infiltrationUnlocks.delete(playerId)
    this.chosenPaths.delete(playerId)
  }
}

export default TechTree
