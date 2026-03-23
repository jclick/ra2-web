/**
 * ECS 核心框架单元测试
 * 
 * 使用简单的断言函数进行测试
 */

import {
  World,
  Entity,
  System,
  EventBus,
  TransformComponent,
  HealthComponent,
  OwnerComponent,
  Faction,
  ArmorType
} from '../'

// 简单的测试框架
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

function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

// ==================== EventBus Tests ====================

console.log('\n📦 EventBus Tests\n')

test('EventBus: 基本发布订阅', () => {
  const bus = new EventBus()
  let received = false
  
  bus.on('test', () => {
    received = true
  })
  
  bus.emit('test', {})
  assert(received, '事件应该被接收')
})

test('EventBus: 带数据的事件', () => {
  const bus = new EventBus()
  let receivedData: unknown = null
  
  bus.on('data', (data) => {
    receivedData = data
  })
  
  bus.emit('data', { value: 42 })
  assertEqual((receivedData as { value: number }).value, 42, '数据应该正确传递')
})

test('EventBus: 取消订阅', () => {
  const bus = new EventBus()
  let count = 0
  
  const sub = bus.on('count', () => {
    count++
  })
  
  bus.emit('count', {})
  sub.unsubscribe()
  bus.emit('count', {})
  
  assertEqual(count, 1, '取消订阅后不应再接收事件')
})

test('EventBus: 一次性事件', () => {
  const bus = new EventBus()
  let count = 0
  
  bus.once('once', () => {
    count++
  })
  
  bus.emit('once', {})
  bus.emit('once', {})
  
  assertEqual(count, 1, '一次性事件只应触发一次')
})

// ==================== Entity Tests ====================

console.log('\n📦 Entity Tests\n')

test('Entity: 创建实体', () => {
  const entity = new Entity('TestEntity')
  assert(entity.id > 0, '实体应该有正数ID')
  assertEqual(entity.name, 'TestEntity', '实体名称应该正确')
  assert(entity.active, '实体默认应该激活')
})

test('Entity: 添加组件', () => {
  const entity = new Entity()
  const transform = new TransformComponent()
  
  entity.addComponent(transform)
  
  assert(entity.hasComponent('transform'), '应该拥有transform组件')
  assert(entity.getComponent('transform') === transform, '应该返回相同的组件')
})

test('Entity: 移除组件', () => {
  const entity = new Entity()
  entity.addComponent(new TransformComponent())
  
  const removed = entity.removeComponent('transform')
  
  assert(removed, '应该成功移除')
  assert(!entity.hasComponent('transform'), '应该不再拥有组件')
})

test('Entity: 检查多个组件', () => {
  const entity = new Entity()
  entity.addComponent(new TransformComponent())
  entity.addComponent(new HealthComponent(100))
  
  assert(entity.hasAllComponents(['transform', 'health']), '应该拥有所有指定组件')
  assert(!entity.hasAllComponents(['transform', 'vision']), '不应拥有未添加的组件')
})

test('Entity: 克隆', () => {
  const original = new Entity('Original')
  const transform = new TransformComponent({ x: 10, y: 0, z: 20 })
  original.addComponent(transform)
  
  const clone = original.clone('Clone')
  
  assertEqual(clone.name, 'Clone', '克隆应该有不同的名称')
  assert(clone.id !== original.id, '克隆应该有不同ID')
  assert(clone.hasComponent('transform'), '克隆应该拥有相同组件')
  
  const cloneTransform = clone.getComponent<TransformComponent>('transform')!
  assertEqual(cloneTransform.position.x, 10, '克隆应该复制组件数据')
})

// ==================== Component Tests ====================

console.log('\n📦 Component Tests\n')

test('TransformComponent: 位置设置', () => {
  const transform = new TransformComponent()
  transform.setPosition(5, 10, 15)
  
  assertEqual(transform.position.x, 5)
  assertEqual(transform.position.y, 10)
  assertEqual(transform.position.z, 15)
})

test('TransformComponent: 距离计算', () => {
  const t1 = new TransformComponent({ x: 0, y: 0, z: 0 })
  const t2 = new TransformComponent({ x: 3, y: 4, z: 0 })
  
  const distance = t1.distanceTo(t2)
  assertEqual(distance, 5, '距离应该是5')
})

test('TransformComponent: 朝向目标', () => {
  const transform = new TransformComponent({ x: 0, y: 0, z: 0 })
  transform.lookAt({ x: 0, y: 0, z: 10 })
  
  assert(transform.rotation.y === 0, '应该面向正Z方向')
})

test('HealthComponent: 伤害计算', () => {
  const health = new HealthComponent(100, ArmorType.LIGHT)
  
  health.takeDamage(50)
  
  assertEqual(health.currentHealth, 60, '轻甲应该减少20%伤害') // 50 * 0.8 = 40
})

test('HealthComponent: 老兵等级', () => {
  const health = new HealthComponent(100)
  
  const promoted1 = health.promote()
  const promoted2 = health.promote()
  const promoted3 = health.promote()
  
  assert(promoted1, '第一次晋升应该成功')
  assert(promoted2, '第二次晋升应该成功')
  assert(!promoted3, '第三次晋升应该失败')
  assertEqual(health.veterancy, 2, '应该是精英等级')
})

test('OwnerComponent: 阵营关系', () => {
  const player1 = new OwnerComponent('p1', Faction.ALLIES)
  const player2 = new OwnerComponent('p1', Faction.SOVIET) // 同ID
  const player3 = new OwnerComponent('p2', Faction.SOVIET) // 不同ID
  
  assert(player1.isAlly(player2), '同玩家应该是盟友')
  assert(player1.isEnemy(player3), '不同玩家应该是敌人')
})

// ==================== World Tests ====================

console.log('\n📦 World Tests\n')

test('World: 创建实体', () => {
  const world = new World()
  const entity = world.createEntity('Test')
  
  assertEqual(entity.name, 'Test')
  assert(world.getEntity(entity.id) === entity, '应该能通过ID获取实体')
})

test('World: 查询实体', () => {
  const world = new World()
  
  const e1 = world.createEntity()
  e1.addComponent(new TransformComponent())
  
  const e2 = world.createEntity()
  e2.addComponent(new TransformComponent())
  e2.addComponent(new HealthComponent(100))
  
  const withTransform = world.queryEntities('transform')
  const withBoth = world.queryEntities('transform', 'health')
  
  assertEqual(withTransform.length, 2, '应该返回2个有transform的实体')
  assertEqual(withBoth.length, 1, '应该返回1个有两个组件的实体')
})

test('World: 添加系统', () => {
  const world = new World()
  
  class TestSystem extends System {
    updateCount = 0
    update() { this.updateCount++ }
  }
  
  const system = new TestSystem()
  world.addSystem(system)
  
  assert(world.getSystem(TestSystem) === system, '应该能获取系统')
})

test('World: 游戏循环', () => {
  const world = new World()
  let updateCount = 0
  
  class CountSystem extends System {
    update() { updateCount++ }
  }
  
  world.addSystem(new CountSystem())
  world.start()
  
  world.update(0.016)
  world.update(0.016)
  
  assertEqual(updateCount, 2, '系统应该被更新两次')
})

// ==================== Integration Tests ====================

console.log('\n📦 Integration Tests\n')

test('Integration: 完整ECS流程', () => {
  const world = new World()
  
  // 创建单位
  const unit = world.createEntity('Tank')
  unit.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }))
  unit.addComponent(new HealthComponent(100, ArmorType.HEAVY))
  unit.addComponent(new OwnerComponent('player1', Faction.SOVIET))
  
  // 验证
  assert(unit.hasAllComponents(['transform', 'health', 'owner']))
  
  const health = unit.getComponent<HealthComponent>('health')!
  health.takeDamage(50)
  
  // 重甲减伤60%，50 * 0.4 = 20 伤害，剩余 80
  assertEqual(health.currentHealth, 80)
})

test('Integration: 事件通信', () => {
  const world = new World()
  let eventFired = false
  
  world.events.on('entity:created', () => {
    eventFired = true
  })
  
  world.createEntity()
  
  assert(eventFired, '创建实体应该触发事件')
})

// ==================== Summary ====================

console.log('\n' + '='.repeat(50))
console.log(`测试结果: ${testsPassed} 通过, ${testsFailed} 失败`)
console.log('='.repeat(50) + '\n')

if (testsFailed > 0) {
  throw new Error(`${testsFailed} tests failed`)
}
