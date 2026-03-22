import { Player, Vector3, BuildCategory, Faction } from '../types'
import { Building } from '../buildings/BuildingSystem'
import { Unit } from '../objects/Unit'
import { GameManager } from '../GameManager'
import { TechTree } from '../tech/TechTree'

/**
 * AI难度级别
 */
export enum AIDifficulty {
  EASY = 'easy',       // 简单 - 慢速建造，不主动进攻
  MEDIUM = 'medium',   // 中等 - 正常节奏，定期进攻
  HARD = 'hard',       // 困难 - 快速建造，频繁进攻，会使用战术
}

/**
 * AI行为状态
 */
export enum AIState {
  IDLE = 'idle',               // 闲置
  BUILDING_ECONOMY = 'eco',    // 建设经济
  BUILDING_BASE = 'base',      // 建设基地
  BUILDING_ARMY = 'army',      // 建设军队
  ATTACKING = 'attack',        // 进攻中
  DEFENDING = 'defend',        // 防守中
  REPAIRING = 'repair',        // 修理中
}

/**
 * AI配置
 */
export interface AIConfig {
  difficulty: AIDifficulty
  buildSpeed: number          // 建造速度倍率 (0.5-2.0)
  attackInterval: number      // 进攻间隔 (毫秒)
  unitLimit: number           // 单位上限
  aggression: number          // 侵略性 (0-1)
}

/**
 * AI玩家控制器
 * 管理AI玩家的自动决策和行为
 */
export class AIController {
  private playerId: string
  private config: AIConfig
  private gameManager: GameManager
  private techTree: TechTree
  
  // AI状态
  private state: AIState = AIState.IDLE
  
  // 决策计时器
  private decisionTimer: number = 0
  private decisionInterval: number = 2000  // 每2秒做一次决策
  
  // 建造计划
  private buildQueue: string[] = []
  
  // 进攻计时
  private lastAttackTime: number = 0
  
  constructor(
    playerId: string,
    difficulty: AIDifficulty,
    gameManager: GameManager,
    techTree: TechTree
  ) {
    this.playerId = playerId
    this.gameManager = gameManager
    this.techTree = techTree
    this.config = this.getDifficultyConfig(difficulty)
  }
  
  /**
   * 获取难度配置
   */
  private getDifficultyConfig(difficulty: AIDifficulty): AIConfig {
    const configs: Record<AIDifficulty, AIConfig> = {
      [AIDifficulty.EASY]: {
        difficulty: AIDifficulty.EASY,
        buildSpeed: 0.7,
        attackInterval: 300000,  // 5分钟
        unitLimit: 30,
        aggression: 0.3,
      },
      [AIDifficulty.MEDIUM]: {
        difficulty: AIDifficulty.MEDIUM,
        buildSpeed: 1.0,
        attackInterval: 180000,  // 3分钟
        unitLimit: 50,
        aggression: 0.6,
      },
      [AIDifficulty.HARD]: {
        difficulty: AIDifficulty.HARD,
        buildSpeed: 1.5,
        attackInterval: 120000,  // 2分钟
        unitLimit: 80,
        aggression: 0.9,
      },
    }
    return configs[difficulty]
  }
  
  /**
   * 更新AI
   */
  update(deltaTime: number): void {
    this.decisionTimer += deltaTime
    
    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0
      this.makeDecision()
    }
    
    // 执行当前状态的行为
    this.executeStateBehavior(deltaTime)
  }
  
  /**
   * 做决策
   */
  private makeDecision(): void {
    const player = this.getPlayer()
    if (!player) return
    
    // 检查威胁 - 如果有敌人靠近基地，进入防守状态
    if (this.isUnderAttack()) {
      this.changeState(AIState.DEFENDING)
      return
    }
    
    // 检查经济 - 如果电力不足或资金紧张，优先发展经济
    if (this.needsMoreEconomy()) {
      this.changeState(AIState.BUILDING_ECONOMY)
      return
    }
    
    // 检查基地 - 如果关键建筑缺失，建造基地
    if (this.needsBaseBuilding()) {
      this.changeState(AIState.BUILDING_BASE)
      return
    }
    
    // 检查军队 - 如果单位不足，训练军队
    const myUnits = this.getMyUnits()
    if (myUnits.length < this.config.unitLimit * 0.7) {
      this.changeState(AIState.BUILDING_ARMY)
      return
    }
    
    // 检查是否可以进攻
    if (this.shouldAttack()) {
      this.changeState(AIState.ATTACKING)
      return
    }
    
    // 默认闲置
    this.changeState(AIState.IDLE)
  }
  
  /**
   * 执行当前状态的行为
   */
  private executeStateBehavior(_deltaTime: number): void {
    switch (this.state) {
      case AIState.BUILDING_ECONOMY:
        this.buildEconomy()
        break
        
      case AIState.BUILDING_BASE:
        this.buildBase()
        break
        
      case AIState.BUILDING_ARMY:
        this.buildArmy()
        break
        
      case AIState.ATTACKING:
        this.executeAttack()
        break
        
      case AIState.DEFENDING:
        this.executeDefense()
        break
        
      case AIState.REPAIRING:
        this.executeRepair()
        break
        
      case AIState.IDLE:
      default:
        // 闲置时检查是否需要修理
        if (this.needsRepair()) {
          this.changeState(AIState.REPAIRING)
        }
        break
    }
  }
  
  /**
   * 建设经济
   */
  private buildEconomy(): void {
    const player = this.getPlayer()
    if (!player) return
    
    // 检查电力
    if (player.power < player.powerDrain * 1.2) {
      // 需要更多电厂
      this.tryBuildBuilding('GAPOWR')  // 或 NAPOWR，根据阵营
      return
    }
    
    // 检查矿厂数量
    const refineries = this.getMyBuildingsByType('refinery')
    if (refineries.length < 2) {
      this.tryBuildBuilding('GAREFN')  // 或 NAREFN
    }
  }
  
  /**
   * 建设基地
   */
  private buildBase(): void {
    const player = this.getPlayer()
    if (!player) return
    
    const faction = player.faction
    
    // 建造顺序
    const buildOrder = this.getBuildOrder(faction)
    
    for (const buildingId of buildOrder) {
      if (this.canBuild(buildingId, player)) {
        this.tryBuildBuilding(buildingId)
        break
      }
    }
  }
  
  /**
   * 获取建造顺序
   */
  private getBuildOrder(faction: Faction): string[] {
    if (faction === Faction.ALLIES) {
      return ['GAPOWR', 'GAREFN', 'GAPILE', 'GAWEAP', 'GAHPAD', 'GATECH', 'GAWEAT', 'GACSPH']
    } else {
      return ['NAPOWR', 'NAREFN', 'NAHAND', 'NAWEAP', 'NARADR', 'NATECH', 'NANRCT', 'NAIRON']
    }
  }
  
  /**
   * 建设军队
   */
  private buildArmy(): void {
    const player = this.getPlayer()
    if (!player) return
    
    // 获取可生产的单位
    const availableUnits = this.techTree.getAvailableItems(player, BuildCategory.VEHICLES)
      .concat(this.techTree.getAvailableItems(player, BuildCategory.INFANTRY))
    
    if (availableUnits.length === 0) return
    
    // 选择要生产的单位（优先高级单位）
    const unitToBuild = availableUnits
      .filter(u => player.money >= u.cost)
      .sort((a, b) => b.cost - a.cost)[0]  // 选最贵的能负担得起的
    
    if (unitToBuild) {
      this.tryBuildUnit(unitToBuild.id)
    }
  }
  
  /**
   * 执行进攻
   */
  private executeAttack(): void {
    const now = Date.now()
    
    // 检查进攻间隔
    if (now - this.lastAttackTime < this.config.attackInterval) {
      return
    }
    
    const attackUnits = this.getAttackUnits()
    if (attackUnits.length < 5) {
      // 单位不足，回去造兵
      this.changeState(AIState.BUILDING_ARMY)
      return
    }
    
    // 选择攻击目标
    const target = this.selectAttackTarget()
    if (!target) {
      this.changeState(AIState.IDLE)
      return
    }
    
    // 发送进攻命令
    this.sendAttack(attackUnits, target)
    this.lastAttackTime = now
  }
  
  /**
   * 执行防守
   */
  private executeDefense(): void {
    // 将所有可用单位召回基地防守
    const threats = this.getThreatsNearBase()
    if (threats.length === 0) {
      // 威胁解除
      this.changeState(AIState.IDLE)
      return
    }
    
    const defenseUnits = this.getMyUnits()
      .filter(u => !u.state || u.state !== 'attacking')
      .slice(0, 10)
    
    // 向威胁位置移动
    for (const _ of defenseUnits) {
      // 命令单位攻击威胁
      // this.gameManager.attackMove(unit, threats[0].position)
    }
  }
  
  /**
   * 执行修理
   */
  private executeRepair(): void {
    const damagedBuildings = this.getMyBuildings()
      .filter(b => b.health < b.maxHealth * 0.5)
    
    if (damagedBuildings.length === 0) {
      this.changeState(AIState.IDLE)
      return
    }
    
    // 修理最受损的建筑
    for (const building of damagedBuildings.slice(0, 2)) {
      // 检查资金
      const player = this.getPlayer()
      if (player && player.money > 100) {
        // 执行修理
        const repairAmount = building.maxHealth * 0.05
        const repairCost = Math.floor(building.stats.cost * 0.01)
        if (player.money >= repairCost) {
          player.money -= repairCost
          building.repair(repairAmount)
        }
      }
    }
  }
  
  /**
   * 尝试建造建筑
   */
  private tryBuildBuilding(buildingId: string): void {
    const player = this.getPlayer()
    if (!player) return
    
    // 检查是否已在队列中
    if (this.buildQueue.includes(buildingId)) return
    
    // 检查资金
    // 这里需要获取建筑成本，简化处理
    // 实际应该查询建筑数据库
    
    // 添加到建造队列
    this.buildQueue.push(buildingId)
    
    // 建造（实际项目中需要选择建造位置）
    const position = this.findBuildPosition(buildingId)
    if (position) {
      this.gameManager.createBuilding(buildingId, position, this.playerId)
    }
  }
  
  /**
   * 尝试建造单位
   */
  private tryBuildUnit(_unitId: string): void {
    // 找到可用的生产建筑
    const productionBuildings = this.getMyBuildings()
      .filter(b => b.stats.canProduce)
    
    if (productionBuildings.length === 0) return
    
    // 选择第一个可用的生产建筑
    const factory = productionBuildings[0]
    
    // 检查生产队列是否已满
    if (factory.productionQueue.length >= 5) return
    
    // 这里需要创建ProducibleItem并添加到队列
    // 简化处理
  }
  
  /**
   * 查找建造位置
   */
  private findBuildPosition(_buildingId: string): Vector3 | null {
    // 获取基地位置
    const basePos = this.getBasePosition()
    if (!basePos) return null
    
    // 在基地周围找一个空位
    for (let offset = 5; offset < 20; offset += 3) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = basePos.x + Math.cos(angle) * offset
        const z = basePos.z + Math.sin(angle) * offset
        
        const pos = { x: Math.floor(x), y: 0, z: Math.floor(z) }
        
        // 检查是否可以建造
        // 实际项目中需要检查地形碰撞
        return pos
      }
    }
    
    return null
  }
  
  /**
   * 获取基地位置
   */
  private getBasePosition(): Vector3 | null {
    const constructionYard = this.getMyBuildings()
      .find(b => b.stats.type.toString().includes('CONSTRUCTION_YARD'))
    
    if (constructionYard) {
      return constructionYard.position
    }
    
    // 如果没有基地，使用第一个建筑的位置
    const firstBuilding = this.getMyBuildings()[0]
    return firstBuilding?.position || null
  }
  
  /**
   * 获取可用于进攻的单位
   */
  private getAttackUnits(): Unit[] {
    return this.getMyUnits()
      .filter(u => u.health > 0)
      .slice(0, 20)
  }
  
  /**
   * 选择攻击目标
   */
  private selectAttackTarget(): Vector3 | null {
    // 找到敌方基地
    for (const player of this.gameManager.players.values()) {
      if (player.id !== this.playerId) {
        // 找到敌方基地或建筑
        const enemyBuildings = Array.from(this.gameManager.buildings.values())
          .filter(b => b.owner.id === player.id)
        
        if (enemyBuildings.length > 0) {
          // 随机选择一个目标
          const target = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)]
          return target.position
        }
      }
    }
    
    return null
  }
  
  /**
   * 发送进攻命令
   */
  private sendAttack(units: Unit[], _target: Vector3): void {
    for (const _ of units) {
      // 移动到目标附近 - 使用 _target
      // const offsetX = (Math.random() - 0.5) * 10
      // const offsetZ = (Math.random() - 0.5) * 10
      // const dest = { x: _target.x + offsetX, y: 0, z: _target.z + offsetZ }
      // unit.moveTo(dest)
    }
  }
  
  /**
   * 检查是否需要更多经济
   */
  private needsMoreEconomy(): boolean {
    const player = this.getPlayer()
    if (!player) return false
    
    // 电力不足
    if (player.power <= player.powerDrain) return true
    
    // 资金少于1000
    if (player.money < 1000) return true
    
    // 矿厂少于2个
    const refineries = this.getMyBuildingsByType('refinery')
    if (refineries.length < 2) return true
    
    return false
  }
  
  /**
   * 检查是否需要建设基地
   */
  private needsBaseBuilding(): boolean {
    const hasBarracks = this.getMyBuildings()
      .some(b => b.stats.canProduce && b.stats.produces?.includes(BuildCategory.INFANTRY))
    
    const hasWarFactory = this.getMyBuildings()
      .some(b => b.stats.canProduce && b.stats.produces?.includes(BuildCategory.VEHICLES))
    
    // 如果没有兵营或战车工厂，需要建造
    return !hasBarracks || !hasWarFactory
  }
  
  /**
   * 检查是否应该进攻
   */
  private shouldAttack(): boolean {
    const attackUnits = this.getAttackUnits()
    
    // 单位足够多
    if (attackUnits.length < 10) return false
    
    // 随机因素（根据侵略性）
    if (Math.random() > this.config.aggression) return false
    
    // 检查进攻间隔
    const now = Date.now()
    return now - this.lastAttackTime >= this.config.attackInterval
  }
  
  /**
   * 检查是否受到攻击
   */
  private isUnderAttack(): boolean {
    const basePos = this.getBasePosition()
    if (!basePos) return false
    
    // 检查基地附近是否有敌方单位
    for (const unit of this.gameManager.units.values()) {
      // 使用 faction 判断是否为敌方单位
      const myFaction = this.getPlayer()?.faction
      if (unit.faction !== myFaction) {
        const dist = this.getDistance(unit.position, basePos)
        if (dist < 15) {
          return true
        }
      }
    }
    
    return false
  }
  
  /**
   * 获取基地附近的威胁
   */
  private getThreatsNearBase(): Unit[] {
    const basePos = this.getBasePosition()
    if (!basePos) return []
    
    const myFaction = this.getPlayer()?.faction
    return Array.from(this.gameManager.units.values())
      .filter(u => u.faction !== myFaction)
      .filter(u => this.getDistance(u.position, basePos) < 20)
  }
  
  /**
   * 检查是否需要修理
   */
  private needsRepair(): boolean {
    const damagedBuildings = this.getMyBuildings()
      .filter(b => b.health < b.maxHealth * 0.5)
    
    return damagedBuildings.length > 0
  }
  
  /**
   * 检查是否可以建造
   */
  private canBuild(buildingId: string, player: Player): boolean {
    // 使用科技树检查
    return this.techTree.isUnlocked(buildingId, player)
  }
  
  /**
   * 改变状态
   */
  private changeState(newState: AIState): void {
    if (this.state !== newState) {
      this.state = newState
    }
  }
  
  /**
   * 获取AI玩家
   */
  private getPlayer(): Player | null {
    return this.gameManager.players.get(this.playerId) || null
  }
  
  /**
   * 获取自己的单位
   */
  private getMyUnits(): Unit[] {
    const myFaction = this.getPlayer()?.faction
    return Array.from(this.gameManager.units.values())
      .filter(u => u.faction === myFaction)
  }
  
  /**
   * 获取自己的建筑
   */
  private getMyBuildings(): Building[] {
    return Array.from(this.gameManager.buildings.values())
      .filter(b => b.owner.id === this.playerId)
  }
  
  /**
   * 按类型获取建筑
   */
  private getMyBuildingsByType(type: string): Building[] {
    return this.getMyBuildings()
      .filter(b => b.stats.type.toString().toLowerCase().includes(type.toLowerCase()))
  }
  
  /**
   * 计算距离
   */
  private getDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dz * dz)
  }
  
  /**
   * 获取当前状态
   */
  getState(): AIState {
    return this.state
  }
  
  /**
   * 获取统计信息
   */
  getStats(): {
    state: AIState
    unitCount: number
    buildingCount: number
    lastAttackAgo: number
  } {
    return {
      state: this.state,
      unitCount: this.getMyUnits().length,
      buildingCount: this.getMyBuildings().length,
      lastAttackAgo: Date.now() - this.lastAttackTime,
    }
  }
}

export default AIController
