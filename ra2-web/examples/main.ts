/**
 * ECS 架构主入口示例
 * 
 * 展示如何初始化ECS世界、注册系统、创建实体并运行游戏循环
 */

import { World } from './core/World'
import { EventBus, getGlobalEventBus } from './core/EventBus'
import { Faction } from './core/Component'

// 系统
import { MovementSystem } from './systems/MovementSystem'
import { CombatSystem } from './systems/CombatSystem'
import { ConstructionSystem } from './systems/ConstructionSystem'
import { FogOfWarSystem } from './systems/FogOfWarSystem'

// 服务
import { PathfindingService, GameMap } from './services/PathfindingService'

// 工厂
import { UnitFactory } from './components/UnitFactory'
import { BuildingFactory } from './components/BuildingFactory'

// ============================================
// 模拟地图实现
// ============================================
class SimpleGameMap implements GameMap {
  private width: number
  private height: number
  private passable: boolean[][]
  
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.passable = Array(width).fill(null).map(() => Array(height).fill(true))
    
    // 添加一些障碍物
    for (let i = 20; i < 30; i++) {
      for (let j = 20; j < 30; j++) {
        this.passable[i][j] = false
      }
    }
  }
  
  getWidth() { return this.width }
  getHeight() { return this.height }
  
  isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
  
  isPassable(x: number, y: number): boolean {
    return this.isValidCell(x, y) && this.passable[x][y]
  }
  
  getHeightAt(x: number, y: number): number {
    return 0
  }
}

// ============================================
// 游戏主类
// ============================================
class Game {
  private world: World
  private eventBus: EventBus
  private pathfinding: PathfindingService
  private isRunning: boolean = false
  private lastTime: number = 0
  
  // 系统引用
  private movementSystem!: MovementSystem
  private combatSystem!: CombatSystem
  private constructionSystem!: ConstructionSystem
  private fogOfWarSystem!: FogOfWarSystem
  
  constructor() {
    // 初始化事件总线
    this.eventBus = getGlobalEventBus()
    
    // 初始化地图
    const map = new SimpleGameMap(100, 100)
    this.pathfinding = new PathfindingService(map)
    
    // 初始化世界
    this.world = new World(this.eventBus, {
      mapWidth: 100,
      mapHeight: 100
    })
    
    this.setupEventListeners()
    this.registerSystems()
  }
  
  /**
   * 注册所有系统
   */
  private registerSystems(): void {
    // 创建系统实例
    this.movementSystem = new MovementSystem(this.world, this.eventBus, this.pathfinding)
    this.combatSystem = new CombatSystem(this.world, this.eventBus)
    this.constructionSystem = new ConstructionSystem(this.world, this.eventBus)
    this.fogOfWarSystem = new FogOfWarSystem(this.world, this.eventBus, 100, 100)
    
    // 注册到世界
    this.world.registerSystem(this.movementSystem)
    this.world.registerSystem(this.combatSystem)
    this.world.registerSystem(this.constructionSystem)
    this.world.registerSystem(this.fogOfWarSystem)
    
    console.log('[Game] Registered', this.world.getSystems().length, 'systems')
  }
  
  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 实体生命周期
    this.eventBus.on('entity:created', ({ entityId, type }) => {
      console.log(`[Game] Entity created: ${entityId} (${type})`)
    })
    
    this.eventBus.on('entity:destroyed', ({ entityId, type }) => {
      console.log(`[Game] Entity destroyed: ${entityId} (${type})`)
    })
    
    // 移动事件
    this.eventBus.on('movement:completed', ({ entityId }) => {
      console.log(`[Game] Unit ${entityId} arrived at destination`)
    })
    
    // 战斗事件
    this.eventBus.on('combat:killed', ({ killerId, victimId }) => {
      console.log(`[Game] ${killerId} killed ${victimId}!`)
    })
    
    this.eventBus.on('combat:veterancy', ({ entityId, newLevel }) => {
      console.log(`[Game] Unit ${entityId} promoted to ${newLevel}!`)
    })
    
    // 建造事件
    this.eventBus.on('build:completed', ({ entityId }) => {
      console.log(`[Game] Building ${entityId} completed!`)
    })
  }
  
  /**
   * 初始化游戏
   */
  initialize(): void {
    console.log('[Game] Initializing...')
    
    // 初始化玩家1的战争迷雾
    this.fogOfWarSystem.initializePlayer('player1')
    
    // 创建玩家1的单位
    const tank1 = UnitFactory.createUnit(
      this.world,
      'GRIZZLY',
      { x: 10, z: 10 },
      'player1',
      Faction.ALLIES
    )
    
    const tank2 = UnitFactory.createUnit(
      this.world,
      'GRIZZLY',
      { x: 12, z: 10 },
      'player1',
      Faction.ALLIES
    )
    
    // 创建玩家2的单位
    const enemyTank = UnitFactory.createUnit(
      this.world,
      'RHINO',
      { x: 50, z: 50 },
      'player2',
      Faction.SOVIET
    )
    
    // 创建建筑
    const powerPlant = BuildingFactory.createBuilding(
      this.world,
      'GAPOWR',
      { x: 20, z: 20 },
      'player1',
      Faction.ALLIES
    )
    
    if (powerPlant) {
      // 开始建造
      this.constructionSystem.startConstruction(powerPlant)
    }
    
    // 创建矿石矿场
    BuildingFactory.createOreField(
      this.world,
      { x: 30, z: 30 },
      5000,
      Faction.SOVIET
    )
    
    console.log('[Game] Created entities:', this.world.getAllEntities().length)
    
    // 测试：让坦克移动到敌人位置并攻击
    if (tank1 && enemyTank) {
      this.movementSystem.moveTo(tank1, { x: 48, z: 48 })
      this.combatSystem.setTarget(tank1, enemyTank)
    }
  }
  
  /**
   * 启动游戏循环
   */
  start(): void {
    this.isRunning = true
    this.lastTime = performance.now()
    console.log('[Game] Started')
    this.gameLoop()
  }
  
  /**
   * 停止游戏
   */
  stop(): void {
    this.isRunning = false
    console.log('[Game] Stopped')
  }
  
  /**
   * 游戏主循环
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return
    
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    
    // 更新世界（所有系统）
    this.world.update(deltaTime)
    
    // 继续下一帧
    requestAnimationFrame(this.gameLoop)
  }
  
  /**
   * 获取世界状态（用于调试）
   */
  getStatus(): object {
    return {
      entities: this.world.getAllEntities().length,
      systems: this.world.getSystems().length,
      stats: this.world.getStats()
    }
  }
}

// ============================================
// 运行示例
// ============================================

function main() {
  console.log('========================================')
  console.log('  RA2 Web ECS Architecture Demo')
  console.log('========================================')
  
  const game = new Game()
  game.initialize()
  game.start()
  
  // 5秒后停止
  setTimeout(() => {
    console.log('[Main] Game status:', game.getStatus())
    game.stop()
  }, 5000)
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.addEventListener('DOMContentLoaded', main)
} else {
  // Node 环境
  main()
}

export { Game }
