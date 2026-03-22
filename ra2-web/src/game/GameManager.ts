import { Unit } from './objects/Unit'
import { UnitFactory } from './objects/UnitDatabase'
import { GameMap } from './map/GameMap'
import { Pathfinder } from './pathfinding/Pathfinder'
import { EconomySystem } from './economy/EconomySystem'
import { Building, BuildingFactory } from './buildings/BuildingSystem'
import { FogOfWar } from './fog/FogOfWar'
import { TechTree } from './tech/TechTree'
import { SuperWeaponManager } from './superweapon/SuperWeaponManager'
import { AIManager } from './ai/AIManager'
import { Player, Faction, Vector3, GameConfig, BuildingType } from './types'

/**
 * 游戏管理器 - 协调所有游戏系统
 */
export class GameManager {
  // 地图
  map: GameMap

  // 寻路
  pathfinder: Pathfinder

  // 玩家
  players: Map<string, Player> = new Map()

  // 单位
  units: Map<string, Unit> = new Map()

  // 建筑
  buildings: Map<string, Building> = new Map()

  // 经济系统
  economySystem: EconomySystem

  // 战争迷雾
  fogOfWar: FogOfWar

  // 科技树系统
  techTree: TechTree

  // 超级武器管理器
  superWeaponManager: SuperWeaponManager

  // AI管理器
  aiManager: AIManager

  // 选中的单位
  selectedUnits: Set<Unit> = new Set()

  // 选中的建筑
  selectedBuilding?: Building

  // 建造队列
  buildQueue: Building[] = []

  // 鼠标位置（用于建造预览）
  mousePosition: Vector3 = { x: 0, y: 0, z: 0 }

  // 游戏状态
  isRunning: boolean = false
  isPaused: boolean = false
  gameTime: number = 0

  // 游戏配置
  config: GameConfig

  // 回调
  private onUnitCreated?: (unit: Unit) => void
  private onUnitDestroyed?: (unit: Unit) => void
  private onBuildingCreated?: (building: Building) => void
  private onBuildingDestroyed?: (building: Building) => void
  private onSelectionChanged?: (units: Unit[]) => void

  constructor(config: GameConfig) {
    this.config = config
    this.map = GameMap.generateTestMap(50)
    this.pathfinder = new Pathfinder(this.map)
    this.economySystem = new EconomySystem()
    this.fogOfWar = new FogOfWar(this.map)
    this.techTree = new TechTree()
    this.superWeaponManager = new SuperWeaponManager()
    this.aiManager = new AIManager(this, this.techTree)
  }

  /**
   * 初始化游戏
   */
  initialize(): void {
    this.setupPlayers()
    this.setupInitialBuildings()
    this.setupInitialUnits()
    this.economySystem.initializeOreFields(this.map.getWidth(), this.map.getHeight())
    this.isRunning = true
  }

  /**
   * 设置玩家
   */
  private setupPlayers(): void {
    // 玩家1
    const player1: Player = {
      id: 'player1',
      name: '玩家',
      faction: Faction.ALLIES,
      color: '#0066CC',
      money: 10000,
      power: 100,
      powerDrain: 0,
      units: [],
      buildings: [],
    }

    // AI玩家
    const player2: Player = {
      id: 'player2',
      name: '电脑',
      faction: Faction.SOVIET,
      color: '#CC0000',
      money: 10000,
      power: 100,
      powerDrain: 0,
      units: [],
      buildings: [],
    }

    this.players.set(player1.id, player1)
    this.players.set(player2.id, player2)

    // 注册AI玩家（电脑玩家）
    this.aiManager.addAIPlayer('player2', 'medium' as any)
  }

  /**
   * 设置初始建筑
   */
  private setupInitialBuildings(): void {
    const player1 = this.players.get('player1')!
    const player2 = this.players.get('player2')!

    // 玩家1建筑（左下角）
    this.createBuilding('GACNST', { x: 3, y: 0, z: 3 }, player1.id)
    this.createBuilding('GAPOWR', { x: 8, y: 0, z: 3 }, player1.id)
    this.createBuilding('GAREFN', { x: 3, y: 0, z: 8 }, player1.id)
    this.createBuilding('GAPILE', { x: 8, y: 0, z: 8 }, player1.id)
    this.createBuilding('GAWEAP', { x: 3, y: 0, z: 13 }, player1.id)

    // 玩家2建筑（右上角）
    this.createBuilding('NACNST', { x: 47, y: 0, z: 47 }, player2.id)
    this.createBuilding('NAPOWR', { x: 42, y: 0, z: 47 }, player2.id)
    this.createBuilding('NAREFN', { x: 47, y: 0, z: 42 }, player2.id)
    this.createBuilding('NAHAND', { x: 42, y: 0, z: 42 }, player2.id)
    this.createBuilding('NAWEAP', { x: 47, y: 0, z: 37 }, player2.id)
  }

  /**
   * 创建建筑
   */
  createBuilding(
    buildingId: string,
    position: Vector3,
    ownerId: string
  ): Building | null {
    const owner = this.players.get(ownerId)
    if (!owner) return null
    
    const building = BuildingFactory.createBuilding(buildingId, position, owner)
    if (!building) return null

    this.buildings.set(building.id, building)
    
    // 添加到玩家的建筑列表
    owner.buildings.push(building)

    // 如果是精炼厂，注册到经济系统
    if (building.stats.type === BuildingType.ORE_REFINERY) {
      this.economySystem.registerRefinery(building as any)
    }

    // 设置回调
    building.onBuildingDestroyed = (b) => this.destroyBuilding(b)
    building.onConstructionCompleted = (b) => {
      // 通知科技树
      const owner = this.players.get(ownerId)
      if (owner) {
        this.techTree.onBuildingConstructed(buildingId, owner)
      }
      
      // 检查是否是超级武器建筑，创建对应的超级武器
      this.checkAndCreateSuperWeapon(buildingId, ownerId, position)
      
      this.onBuildingCreated?.(b)
    }
    building.onUnitProduced = (item) => {
      // 生产完成，在附近创建单位
      const spawnPos = {
        x: position.x + 3,
        y: 0,
        z: position.z + 3
      }
      this.createUnit(item.id, this.players.get(ownerId)!.faction, spawnPos, ownerId)
    }

    building.startConstruction()

    return building
  }

  /**
   * 销毁建筑
   */
  destroyBuilding(building: Building): void {
    const owner = this.players.get(building.owner.id)
    if (owner) {
      const index = owner.buildings.indexOf(building)
      if (index > -1) {
        owner.buildings.splice(index, 1)
      }
    }

    this.buildings.delete(building.id)

    // 清理选择
    if (this.selectedBuilding === building) {
      this.selectedBuilding = undefined
    }

    this.onBuildingDestroyed?.(building)
  }

  private setupInitialUnits(): void {
    const player1 = this.players.get('player1')!
    const player2 = this.players.get('player2')!

    // 玩家1初始单位（左下角）
    this.createUnit('GRIZZLY', player1.faction, { x: 5, y: 0, z: 5 }, player1.id)
    this.createUnit('GRIZZLY', player1.faction, { x: 7, y: 0, z: 5 }, player1.id)
    this.createUnit('GI', player1.faction, { x: 5, y: 0, z: 7 }, player1.id)
    this.createUnit('GI', player1.faction, { x: 7, y: 0, z: 7 }, player1.id)

    // 玩家2初始单位（右上角）
    this.createUnit('RHINO', player2.faction, { x: 45, y: 0, z: 45 }, player2.id)
    this.createUnit('RHINO', player2.faction, { x: 43, y: 0, z: 45 }, player2.id)
    this.createUnit('CONSCRIPT', player2.faction, { x: 45, y: 0, z: 43 }, player2.id)
    this.createUnit('CONSCRIPT', player2.faction, { x: 43, y: 0, z: 43 }, player2.id)
  }

  /**
   * 创建单位
   */
  createUnit(
    unitId: string,
    faction: Faction,
    position: Vector3,
    ownerId: string
  ): Unit | null {
    const unit = UnitFactory.createUnit(unitId, faction, position)
    if (!unit) return null

    // 设置所有者
    const owner = this.players.get(ownerId)
    if (owner) {
      ;(unit as any).owner = owner
      owner.units.push(unit)
    }

    this.units.set(unit.id, unit)

    // 更新地图
    const cellX = Math.floor(position.x)
    const cellY = Math.floor(position.z)
    this.map.setObject(cellX, cellY, unit)

    // 回调
    this.onUnitCreated?.(unit)

    return unit
  }

  /**
   * 销毁单位
   */
  destroyUnit(unit: Unit): void {
    // 从所有者移除
    const owner = this.players.get((unit as any).owner?.id)
    if (owner) {
      const index = owner.units.indexOf(unit)
      if (index > -1) {
        owner.units.splice(index, 1)
      }
    }

    // 从选中移除
    this.selectedUnits.delete(unit)

    // 从地图移除
    const cellX = Math.floor(unit.position.x)
    const cellY = Math.floor(unit.position.z)
    const cell = this.map.getCell(cellX, cellY)
    if (cell?.object === unit) {
      this.map.setObject(cellX, cellY, null)
    }

    // 从单位列表移除
    this.units.delete(unit.id)

    // 回调
    this.onUnitDestroyed?.(unit)
    this.onSelectionChanged?.(Array.from(this.selectedUnits))
  }

  /**
   * 游戏主更新
   */
  update(deltaTime: number): void {
    if (!this.isRunning || this.isPaused) return

    this.gameTime += deltaTime

    // 更新所有建筑
    for (const building of this.buildings.values()) {
      building.update(deltaTime)
    }

    // 更新所有单位
    for (const unit of this.units.values()) {
      const oldX = Math.floor(unit.position.x)
      const oldY = Math.floor(unit.position.z)

      unit.update(deltaTime)

      // 如果单位移动了，更新地图
      const newX = Math.floor(unit.position.x)
      const newY = Math.floor(unit.position.z)

      if (oldX !== newX || oldY !== newY) {
        this.map.setObject(oldX, oldY, null)
        this.map.setObject(newX, newY, unit)
      }
    }

    // 更新经济系统
    this.economySystem.update(deltaTime)

    // 更新战争迷雾
    this.fogOfWar.update(this.getAllUnits(), 'player1')

    // 更新超级武器
    this.superWeaponManager.update(deltaTime)

    // 更新AI
    this.aiManager.update(deltaTime)

    // 清理已死亡单位
    for (const unit of this.units.values()) {
      if (unit.health <= 0) {
        this.destroyUnit(unit)
      }
    }

    // 清理已摧毁建筑
    for (const building of this.buildings.values()) {
      if (building.health <= 0) {
        this.destroyBuilding(building)
      }
    }
  }

  // ==================== 选择系统 ====================

  /**
   * 选择建筑
   */
  selectBuilding(building: Building): void {
    this.clearSelection()
    this.selectedBuilding = building
    building.selected = true
    this.onSelectionChanged?.(Array.from(this.selectedUnits))
  }

  /**
   * 获取选中建筑
   */
  getSelectedBuilding(): Building | undefined {
    return this.selectedBuilding
  }

  /**
   * 选择单个单位
   */
  selectUnit(unit: Unit): void {
    this.clearSelection()
    unit.selected = true
    this.selectedUnits.add(unit)
    this.onSelectionChanged?.(Array.from(this.selectedUnits))
  }

  /**
   * 添加选择
   */
  addToSelection(unit: Unit): void {
    if (!unit.selected) {
      unit.selected = true
      this.selectedUnits.add(unit)
      this.onSelectionChanged?.(Array.from(this.selectedUnits))
    }
  }

  /**
   * 移除选择
   */
  removeFromSelection(unit: Unit): void {
    unit.selected = false
    this.selectedUnits.delete(unit)
    this.onSelectionChanged?.(Array.from(this.selectedUnits))
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    for (const unit of this.selectedUnits) {
      unit.selected = false
    }
    this.selectedUnits.clear()
    this.onSelectionChanged?.([])
  }

  /**
   * 框选
   */
  selectInArea(start: Vector3, end: Vector3, ownerId?: string): void {
    this.clearSelection()

    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minZ = Math.min(start.z, end.z)
    const maxZ = Math.max(start.z, end.z)

    for (const unit of this.units.values()) {
      if (ownerId && (unit as any).owner?.id !== ownerId) continue

      if (
        unit.position.x >= minX &&
        unit.position.x <= maxX &&
        unit.position.z >= minZ &&
        unit.position.z <= maxZ
      ) {
        unit.selected = true
        this.selectedUnits.add(unit)
      }
    }

    this.onSelectionChanged?.(Array.from(this.selectedUnits))
  }

  // ==================== 命令系统 ====================

  /**
   * 移动选中的单位
   */
  moveSelectedUnits(destination: Vector3): void {
    if (this.selectedUnits.size === 0) return

    const units = Array.from(this.selectedUnits)

    if (units.length === 1) {
      // 单个单位
      const unit = units[0]
      const startX = Math.floor(unit.position.x)
      const startY = Math.floor(unit.position.z)
      const endX = Math.floor(destination.x)
      const endY = Math.floor(destination.z)

      const path = this.pathfinder.findPath(startX, startY, endX, endY, unit)
      if (path.length > 0) {
        unit.followPath(path)
      }
    } else {
      // 多个单位 - 编队移动
      const paths = this.pathfinder.findFormationPaths(
        units,
        Math.floor(destination.x),
        Math.floor(destination.z)
      )

      for (const [unit, path] of paths) {
        if (path.length > 0) {
          unit.followPath(path)
        }
      }
    }
  }

  /**
   * 攻击移动
   */
  attackMove(destination: Vector3): void {
    for (const _ of this.selectedUnits) {
      // 先移动
      this.moveSelectedUnits(destination)
      // 标记为攻击移动状态
      // 在移动过程中会自动攻击遇到的敌人
    }
  }

  /**
   * 攻击目标
   */
  attackTarget(target: Unit): void {
    for (const unit of this.selectedUnits) {
      if (unit !== target && unit.primaryWeapon) {
        unit.attack(target)
      }
    }
  }

  /**
   * 停止
   */
  stopSelectedUnits(): void {
    for (const unit of this.selectedUnits) {
      unit.stop()
    }
  }

  /**
   * 驻守
   */
  guardSelectedUnits(): void {
    for (const unit of this.selectedUnits) {
      unit.guard()
    }
  }

  /**
   * 部署
   */
  deploySelectedUnits(): void {
    for (const unit of this.selectedUnits) {
      unit.deploy()
    }
  }

  // ==================== 游戏控制 ====================

  /**
   * 暂停游戏
   */
  pause(): void {
    this.isPaused = true
  }

  /**
   * 恢复游戏
   */
  resume(): void {
    this.isPaused = false
  }

  /**
   * 结束游戏
   */
  end(): void {
    this.isRunning = false
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: {
    onUnitCreated?: (unit: Unit) => void
    onUnitDestroyed?: (unit: Unit) => void
    onBuildingCreated?: (building: Building) => void
    onBuildingDestroyed?: (building: Building) => void
    onSelectionChanged?: (units: Unit[]) => void
  }): void {
    this.onUnitCreated = callbacks.onUnitCreated
    this.onUnitDestroyed = callbacks.onUnitDestroyed
    this.onBuildingCreated = callbacks.onBuildingCreated
    this.onBuildingDestroyed = callbacks.onBuildingDestroyed
    this.onSelectionChanged = callbacks.onSelectionChanged
  }

  /**
   * 检查并创建超级武器
   */
  private checkAndCreateSuperWeapon(buildingId: string, ownerId: string, position: Vector3): void {
    const superWeaponMap: Record<string, string> = {
      'NANRCT': 'nuclear_missile',
      'GAWEAT': 'lightning_storm',
      'GACSPH': 'chronosphere',
      'NAIRON': 'iron_curtain',
    }

    const superWeaponType = superWeaponMap[buildingId]
    if (superWeaponType) {
      this.superWeaponManager.createSuperWeapon(
        superWeaponType as any,
        ownerId,
        position
      )
    }
  }

  // ==================== 查询 ====================

  /**
   * 获取建筑
   */
  getBuilding(id: string): Building | undefined {
    return this.buildings.get(id)
  }

  /**
   * 获取所有建筑
   */
  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values())
  }

  /**
   * 获取玩家建筑
   */
  getPlayerBuildings(playerId: string): Building[] {
    return this.getAllBuildings().filter(b => b.owner.id === playerId)
  }

  /**
   * 获取单位
   */
  getUnit(id: string): Unit | undefined {
    return this.units.get(id)
  }

  /**
   * 获取所有单位
   */
  getAllUnits(): Unit[] {
    return Array.from(this.units.values())
  }

  /**
   * 获取玩家单位
   */
  getPlayerUnits(playerId: string): Unit[] {
    return this.getAllUnits().filter(u => (u as any).owner?.id === playerId)
  }

  /**
   * 获取选中单位
   */
  getSelectedUnits(): Unit[] {
    return Array.from(this.selectedUnits)
  }

  /**
   * 获取玩家
   */
  getPlayer(id: string): Player | undefined {
    return this.players.get(id)
  }

  /**
   * 在位置查找单位
   */
  getUnitAt(position: Vector3, radius: number = 2): Unit | null {
    for (const unit of this.units.values()) {
      const dx = unit.position.x - position.x
      const dz = unit.position.z - position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance <= radius) {
        return unit
      }
    }
    return null
  }
}
