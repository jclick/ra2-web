import { Unit, UnitStats } from '../objects/Unit'
import { Player, Vector3, ResourceType, Faction, UnitType } from '../types'

/**
 * 矿石矿场
 */
export interface OreField {
  id: string
  position: Vector3
  type: ResourceType
  amount: number
  maxAmount: number
}

/**
 * 采矿车 - 负责采集和运输矿石
 */
export class OreMiner extends Unit {
  // 采矿状态
  isHarvesting: boolean = false
  harvestProgress: number = 0
  
  // 运输
  oreCapacity: number = 1000
  currentOre: number = 0
  oreType: ResourceType = ResourceType.ORE
  
  // 当前目标
  targetOreField?: OreField
  targetRefinery?: OreRefinery
  
  // 采矿点
  harvestPoint?: Vector3
  
  constructor(
    id: string,
    faction: Faction,
    position: Vector3,
    stats: UnitStats
  ) {
    super(id, UnitType.VEHICLE, faction, position, stats)
  }
  
  /**
   * 开始采矿
   */
  startHarvesting(oreField: OreField, harvestPoint: Vector3): void {
    this.targetOreField = oreField
    this.harvestPoint = harvestPoint
    this.isHarvesting = true
    this.state = { type: 'harvesting' } as any
  }
  
  /**
   * 前往矿场卸货
   */
  goToRefinery(refinery: OreRefinery): void {
    this.targetRefinery = refinery
    // 移动逻辑由外部控制
  }
  
  /**
   * 卸载矿石
   */
  unloadOre(): number {
    const amount = this.currentOre
    this.currentOre = 0
    this.oreType = ResourceType.ORE
    return amount
  }
  
  /**
   * 检查矿车是否满载
   */
  isFull(): boolean {
    return this.currentOre >= this.oreCapacity
  }
  
  /**
   * 检查矿车是否空载
   */
  isEmpty(): boolean {
    return this.currentOre <= 0
  }
}

/**
 * 矿石精炼厂
 */
export class OreRefinery {
  id: string
  position: Vector3
  owner: Player
  
  // 资金转换率
  conversionRate: number = 0.5 // 50%转化率
  
  // 处理状态
  isProcessing: boolean = false
  processingQueue: Array<{ miner: OreMiner; amount: number }> = []
  
  // 动画
  harvesterAnim: number = 0
  
  constructor(id: string, position: Vector3, owner: Player) {
    this.id = id
    this.position = position
    this.owner = owner
  }
  
  /**
   * 接收矿石
   */
  receiveOre(miner: OreMiner): void {
    const amount = miner.unloadOre()
    
    if (amount > 0) {
      this.processingQueue.push({ miner, amount })
      
      // 转换为资金
      const credits = Math.floor(amount * this.conversionRate)
      this.owner.money += credits
      
      // 触发收入显示
      this.showIncomePopup(credits)
    }
  }
  
  /**
   * 显示收入提示
   */
  private showIncomePopup(amount: number): void {
    // 触发UI显示收入
    console.log(`+$${amount}`)
  }
  
  /**
   * 更新
   */
  update(deltaTime: number): void {
    // 处理动画等
    if (this.processingQueue.length > 0) {
      this.harvesterAnim += deltaTime / 1000
    }
  }
}

/**
 * 经济系统管理器
 */
export class EconomySystem {
  // 所有矿场
  oreFields: Map<string, OreField> = new Map()
  
  // 所有采矿车
  miners: Map<string, OreMiner> = new Map()
  
  // 所有精炼厂
  refineries: Map<string, OreRefinery> = new Map()
  
  // 矿物再生配置
  oreRegenRate: number = 0.1 // 每秒再生0.1单位
  oreMaxAmount: number = 5000
  
  // 回调（暂未使用）
  // private _onCreditsChanged?: (player: Player, amount: number) => void
  
  /**
   * 初始化矿场
   */
  initializeOreFields(mapWidth: number, mapHeight: number): void {
    // 在地图上生成矿场
    const numFields = Math.floor(mapWidth * mapHeight * 0.02) // 2%的地图面积
    
    for (let i = 0; i < numFields; i++) {
      const isGem = Math.random() < 0.2 // 20%是宝石矿
      
      const field: OreField = {
        id: `ore_${i}`,
        position: {
          x: Math.random() * mapWidth,
          y: 0,
          z: Math.random() * mapHeight,
        },
        type: isGem ? ResourceType.GEMS : ResourceType.ORE,
        amount: Math.random() * this.oreMaxAmount + 1000,
        maxAmount: this.oreMaxAmount,
      }
      
      this.oreFields.set(field.id, field)
    }
  }
  
  /**
   * 注册采矿车
   */
  registerMiner(miner: OreMiner): void {
    this.miners.set(miner.id, miner)
  }
  
  /**
   * 注销采矿车
   */
  unregisterMiner(minerId: string): void {
    this.miners.delete(minerId)
  }
  
  /**
   * 注册精炼厂
   */
  registerRefinery(refinery: OreRefinery): void {
    this.refineries.set(refinery.id, refinery)
  }
  
  /**
   * 找到最近的可用矿场
   */
  findNearestOreField(position: Vector3, type?: ResourceType): OreField | null {
    let nearest: OreField | null = null
    let minDistance = Infinity
    
    for (const field of this.oreFields.values()) {
      if (field.amount <= 0) continue
      if (type && field.type !== type) continue
      
      const dx = field.position.x - position.x
      const dz = field.position.z - position.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      if (distance < minDistance) {
        minDistance = distance
        nearest = field
      }
    }
    
    return nearest
  }
  
  /**
   * 找到最近的精炼厂
   */
  findNearestRefinery(position: Vector3, owner: Player): OreRefinery | null {
    let nearest: OreRefinery | null = null
    let minDistance = Infinity
    
    for (const refinery of this.refineries.values()) {
      if (refinery.owner !== owner) continue
      
      const dx = refinery.position.x - position.x
      const dz = refinery.position.z - position.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      if (distance < minDistance) {
        minDistance = distance
        nearest = refinery
      }
    }
    
    return nearest
  }
  
  /**
   * 采矿
   */
  harvest(miner: OreMiner, amount: number): number {
    if (!miner.targetOreField) return 0
    
    const field = miner.targetOreField
    const actualAmount = Math.min(
      amount,
      field.amount,
      miner.oreCapacity - miner.currentOre
    )
    
    field.amount -= actualAmount
    miner.currentOre += actualAmount
    
    return actualAmount
  }
  
  /**
   * 更新经济系统
   */
  update(deltaTime: number): void {
    // 更新精炼厂
    for (const refinery of this.refineries.values()) {
      refinery.update(deltaTime)
    }
    
    // 矿物再生
    for (const field of this.oreFields.values()) {
      if (field.amount < field.maxAmount) {
        field.amount += this.oreRegenRate * (deltaTime / 1000)
        if (field.amount > field.maxAmount) {
          field.amount = field.maxAmount
        }
      }
    }
    
    // AI自动采矿逻辑
    this.updateAIHarvesting(deltaTime)
  }
  
  /**
   * AI自动采矿逻辑
   */
  private updateAIHarvesting(_deltaTime: number): void {
    for (const miner of this.miners.values()) {
      // 如果矿车空闲
      if (miner.state === 'idle') {
        if (miner.isEmpty()) {
          // 空载 - 去找矿
          const field = this.findNearestOreField(miner.position)
          if (field) {
            miner.startHarvesting(field, field.position)
          }
        } else {
          // 满载 - 去卸货
          const owner = (miner as any).owner
          const refinery = this.findNearestRefinery(miner.position, owner)
          if (refinery) {
            miner.goToRefinery(refinery)
          }
        }
      }
    }
  }
  
  /**
   * 获取矿场
   */
  getOreField(id: string): OreField | undefined {
    return this.oreFields.get(id)
  }
  
  /**
   * 获取所有矿场
   */
  getAllOreFields(): OreField[] {
    return Array.from(this.oreFields.values())
  }
  
  /**
   * 设置回调
   */
  setCallbacks(_callbacks: {
    onCreditsChanged?: (player: Player, amount: number) => void
  }): void {
    // this._onCreditsChanged = callbacks.onCreditsChanged
  }
}
