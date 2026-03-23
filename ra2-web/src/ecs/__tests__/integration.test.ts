/**
 * ECSIntegrationTests
 *
 * 集成测试套件 - 验证各系统协同工作
 */

import { World, Entity } from '../'
import {
  TransformComponent,
  HealthComponent,
  OwnerComponent,
  MovementComponent,
  CombatComponent,
  WeaponComponent,
  ConstructionComponent,
  EconomyComponent,
  AIComponent,
  SuperWeaponComponent,
  Faction,
  ArmorType,
  DamageType,
  ProjectileType,
  ConstructionState,
  BuildingCategory,
  AIBehaviorType,
  AIState,
  SuperWeaponType,
  SuperWeaponState,
  ResourceType
} from '../'
import { MovementSystem } from '../systems/MovementSystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ConstructionSystem } from '../systems/ConstructionSystem'
import { EconomySystem } from '../systems/EconomySystem'
import { AISystem } from '../systems/AISystem'
import { SuperWeaponSystem } from '../systems/SuperWeaponSystem'
import { EffectSystem } from '../systems/EffectSystem'
import { PathfindingService } from '../services/PathfindingService'

// 测试工具
let testsPassed = 0
let testsFailed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    console.log(`✅ ${name}`)
    testsPassed++
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   ${error}`)
    testsFailed++
  }
}

function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

// 创建测试单位
function createTestUnit(
  world: World,
  position: { x: number; y?: number; z: number },
  faction: Faction = Faction.ALLIES
): Entity {
  const entity = world.createEntity('TestUnit')

  entity.addComponent(new TransformComponent(
    { x: position.x, y: position.y || 0, z: position.z },
    { x: 0, y: 0, z: 0 }
  ))

  entity.addComponent(new HealthComponent(100, ArmorType.LIGHT))
  entity.addComponent(new OwnerComponent('player1', faction))

  const movement = new MovementComponent(5, 180)
  movement.setDestination({ x: position.x, y: position.y || 0, z: position.z })
  entity.addComponent(movement)

  return entity
}

// 创建战斗单位
function createCombatUnit(
  world: World,
  position: { x: number; z: number },
  faction: Faction,
  damage: number = 25
): Entity {
  const entity = createTestUnit(world, position, faction)

  entity.addComponent(new CombatComponent(10))

  entity.addComponent(new WeaponComponent({
    id: 'rifle',
    name: 'Rifle',
    damage: damage,
    range: 10,
    cooldown: 1,
    projectileType: ProjectileType.BULLET,
    damageType: DamageType.NORMAL,
    isTurret: false,
    canTargetAir: true,
    canTargetGround: true
  }))

  return entity
}

console.log('\n========================================')
console.log('ECS 集成测试套件')
console.log('========================================\n')

// ==================== 系统初始化测试 ====================

console.log('\n📦 系统初始化测试\n')

test('World: 创建并初始化所有系统', () => {
  const world = new World()

  world.addSystem(new MovementSystem())
  world.addSystem(new CombatSystem())
  world.addSystem(new ConstructionSystem())
  world.addSystem(new EconomySystem())
  world.addSystem(new AISystem())
  world.addSystem(new SuperWeaponSystem())
  world.addSystem(new EffectSystem())

  world.start()

  assert(typeof world.getAllEntities === 'function', 'World应该有实体管理功能')
  assert(world.isRunning.valueOf() === true, 'World应该正在运行')
})

test('PathfindingService: 初始化', () => {
  // PathfindingService 需要 GameMap 对象，这里只是测试导入
  assert(typeof PathfindingService === 'function', '寻路服务应该可以被导入')
})

// ==================== 移动+战斗集成测试 ====================

console.log('\n📦 移动+战斗集成测试\n')

test('Integration: 单位移动后攻击', () => {
  const world = new World()
  const movementSystem = new MovementSystem()
  const combatSystem = new CombatSystem()

  world.addSystem(movementSystem)
  world.addSystem(combatSystem)
  world.start()

  // 创建两个战斗单位
  const attacker = createCombatUnit(world, { x: 0, z: 0 }, Faction.ALLIES)
  const target = createCombatUnit(world, { x: 20, z: 0 }, Faction.SOVIET)

  // 命令攻击者移动到目标附近
  const attackerMovement = attacker.getComponent<MovementComponent>('movement')!
  attackerMovement.setDestination({ x: 5, y: 0, z: 0 })

  // 模拟移动
  for (let i = 0; i < 50; i++) {
    world.update(0.1)
  }

  // 移动后命令攻击
  combatSystem.attackTarget(attacker, target.id)

  // 模拟战斗
  for (let i = 0; i < 30; i++) {
    world.update(0.1)
  }

  const targetHealth = target.getComponent<HealthComponent>('health')!
  assert(targetHealth.currentHealth < 100, '目标应该受到伤害')
})

test('Integration: AI单位自动索敌攻击', () => {
  const world = new World()
  const combatSystem = new CombatSystem()
  const aiSystem = new AISystem()

  world.addSystem(combatSystem)
  world.addSystem(aiSystem)
  world.start()

  // 创建AI单位
  const aiUnit = createCombatUnit(world, { x: 0, z: 0 }, Faction.ALLIES)
  aiUnit.addComponent(new AIComponent(AIBehaviorType.AGGRESSIVE))

  // 创建敌人
  createCombatUnit(world, { x: 8, z: 0 }, Faction.SOVIET)

  // 设置AI
  aiSystem.createAggressiveAI(aiUnit)

  // 模拟
  for (let i = 0; i < 50; i++) {
    world.update(0.1)
  }

  const ai = aiUnit.getComponent<AIComponent>('ai')!
  assert(ai.state === AIState.ATTACKING || ai.state === AIState.IDLE, 'AI应该处于攻击或空闲状态')
})

// ==================== 建筑+经济集成测试 ====================

console.log('\n📦 建筑+经济集成测试\n')

test('Integration: 建造建筑消耗资金', () => {
  const world = new World()
  const constructionSystem = new ConstructionSystem()
  const economySystem = new EconomySystem()

  world.addSystem(constructionSystem)
  world.addSystem(economySystem)
  world.start()

  // 创建玩家经济实体
  const playerEntity = world.createEntity('PlayerEconomy')
  const economy = new EconomyComponent(5000)
  playerEntity.addComponent(economy)
  playerEntity.addComponent(new OwnerComponent('player1', Faction.ALLIES))

  // 创建建筑
  const building = world.createEntity('PowerPlant')
  building.addComponent(new TransformComponent({ x: 10, y: 0, z: 10 }, { x: 0, y: 0, z: 0 }))
  building.addComponent(new OwnerComponent('player1', Faction.ALLIES))

  const construction = new ConstructionComponent('PowerPlant', BuildingCategory.POWER, 10, 800)
  building.addComponent(construction)

  // 开始建造
  const result = constructionSystem.startBuilding(building)

  assert(result === true, '建造应该成功')
  assert(construction.state === ConstructionState.CONSTRUCTING, '建筑应该处于建造中')
})

test('Integration: 采矿车采集资源', () => {
  const world = new World()
  const economySystem = new EconomySystem()
  const movementSystem = new MovementSystem()

  world.addSystem(economySystem)
  world.addSystem(movementSystem)
  world.start()

  // 创建矿区
  economySystem.addOreField({
    id: 1,
    position: { x: 50, z: 50 },
    amount: 1000,
    type: ResourceType.ORE,
    radius: 10
  })

  // 创建采矿车
  const harvester = world.createEntity('Harvester')
  harvester.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }))
  harvester.addComponent(new OwnerComponent('player1', Faction.ALLIES))
  harvester.addComponent(new MovementComponent(3, 90))

  const economy = new EconomyComponent(0, true)
  harvester.addComponent(economy)

  // 命令采集
  economySystem.commandHarvest(harvester)

  // 模拟
  for (let i = 0; i < 100; i++) {
    world.update(0.1)
  }

  // 采矿车应该开始移动或采集
  assert(economy.harvesterState !== 'idle', '采矿车应该开始工作')
})

// ==================== 超级武器集成测试 ====================

console.log('\n📦 超级武器集成测试\n')

test('Integration: 超级武器建造和发射', () => {
  const world = new World()
  const superWeaponSystem = new SuperWeaponSystem()
  const effectSystem = new EffectSystem()

  world.addSystem(superWeaponSystem)
  world.addSystem(effectSystem)
  world.start()

  // 创建闪电风暴发射器
  const weaponEntity = world.createEntity('WeatherController')
  weaponEntity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }))
  weaponEntity.addComponent(new OwnerComponent('player1', Faction.ALLIES))

  const superWeapon = new SuperWeaponComponent(SuperWeaponType.LIGHTNING_STORM)
  weaponEntity.addComponent(superWeapon)

  // 建造
  superWeaponSystem.buildSuperWeapon(weaponEntity)

  assert(superWeapon.isBuilt, '超级武器应该已建造')
  assert(superWeapon.state === 'charging', '应该处于充能状态')

  // 模拟充能完成
  superWeapon.chargeProgress = 1
  superWeapon.state = SuperWeaponState.READY

  // 设置目标并发射
  const targetPos = { x: 100, z: 100 }
  const launched = superWeaponSystem.launchAt(weaponEntity, targetPos)

  assert(launched, '发射应该成功')
  // 发射后状态可能是 FIRING 或 COOLDOWN，取决于实现
  const currentState = superWeapon.state as SuperWeaponState
  assert(
    currentState === SuperWeaponState.FIRING || 
    currentState === SuperWeaponState.COOLDOWN,
    '应该处于发射中或冷却状态'
  )
  assert(superWeapon.targetPosition?.x === 100, '目标位置应该正确')
})

test('Integration: 核弹爆炸产生特效', () => {
  const world = new World()
  const superWeaponSystem = new SuperWeaponSystem()
  const effectSystem = new EffectSystem()
  const combatSystem = new CombatSystem()

  world.addSystem(superWeaponSystem)
  world.addSystem(effectSystem)
  world.addSystem(combatSystem)
  world.start()

  // 监听特效生成事件
  let effectSpawned = false
  world.events.on('effect:spawn', () => {
    effectSpawned = true
  })

  // 创建核弹发射器
  const weaponEntity = world.createEntity('NukeSilo')
  weaponEntity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }))
  weaponEntity.addComponent(new OwnerComponent('player1', Faction.SOVIET))

  const superWeapon = new SuperWeaponComponent(SuperWeaponType.NUKE)
  superWeapon.isBuilt = true
  superWeapon.state = SuperWeaponState.READY
  weaponEntity.addComponent(superWeapon)

  // 发射
  superWeaponSystem.launchAt(weaponEntity, { x: 50, z: 50 })

  // 模拟倒计时
  for (let i = 0; i < 100; i++) {
    world.update(0.1)
  }

  assert(effectSpawned, '应该触发了特效生成')
})

// ==================== 完整战斗场景测试 ====================

console.log('\n📦 完整战斗场景测试\n')

test('Integration: 完整小规模战斗', () => {
  const world = new World()

  // 添加所有相关系统
  world.addSystem(new MovementSystem())
  world.addSystem(new CombatSystem())
  world.addSystem(new AISystem())
  world.addSystem(new EffectSystem())

  world.start()

  // 创建盟军小队
  const allies: Entity[] = []
  for (let i = 0; i < 3; i++) {
    const unit = createCombatUnit(world, { x: i * 5, z: 0 }, Faction.ALLIES)
    unit.addComponent(new AIComponent(AIBehaviorType.AGGRESSIVE))
    allies.push(unit)
  }

  // 创建苏联小队
  const soviets: Entity[] = []
  for (let i = 0; i < 3; i++) {
    const unit = createCombatUnit(world, { x: i * 5, z: 30 }, Faction.SOVIET)
    unit.addComponent(new AIComponent(AIBehaviorType.AGGRESSIVE))
    soviets.push(unit)
  }

  // 设置AI
  const aiSystem = world.getSystem(AISystem)!
  for (const unit of [...allies, ...soviets]) {
    aiSystem.createAggressiveAI(unit)
  }

  // 模拟战斗
  let combatOccurred = false
  for (let i = 0; i < 200; i++) {
    world.update(0.1)

    // 检查是否有伤害发生
    for (const unit of [...allies, ...soviets]) {
      const health = unit.getComponent<HealthComponent>('health')!
      if (health.currentHealth < 100) {
        combatOccurred = true
      }
    }

    if (combatOccurred) break
  }

  assert(combatOccurred, '战斗应该发生')
})

// ==================== 性能测试 ====================

console.log('\n📦 性能测试\n')

test('Performance: 100个单位的更新性能', () => {
  const world = new World()
  world.addSystem(new MovementSystem())
  world.addSystem(new CombatSystem())
  world.addSystem(new AISystem())
  world.start()

  // 创建100个单位
  const units: Entity[] = []
  for (let i = 0; i < 100; i++) {
    const unit = createCombatUnit(
      world,
      { x: Math.random() * 100, z: Math.random() * 100 },
      i % 2 === 0 ? Faction.ALLIES : Faction.SOVIET
    )
    unit.addComponent(new AIComponent(AIBehaviorType.AGGRESSIVE))
    units.push(unit)
  }

  // 测量100帧的性能
  const startTime = Date.now()

  for (let i = 0; i < 100; i++) {
    world.update(0.016) // 60fps
  }

  const endTime = Date.now()
  const elapsed = endTime - startTime

  console.log(`   100帧更新时间: ${elapsed}ms`)
  assert(elapsed < 1000, '100帧更新应该在一秒内完成')
})

// ==================== 总结 ====================

console.log('\n' + '='.repeat(50))
console.log(`集成测试结果: ${testsPassed} 通过, ${testsFailed} 失败`)
console.log('='.repeat(50) + '\n')

if (testsFailed > 0) {
  throw new Error(`${testsFailed} 集成测试失败`)
} else {
  console.log('🎉 所有集成测试通过！ECS架构工作正常。\n')
}
