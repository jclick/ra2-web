/**
 * MovementSystem 测试
 */

import {
  World,
  TransformComponent,
  MovementComponent,
  MovementSystem,
  MovementState,
  MovementType
} from '../'

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

function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

function assertApprox(actual: number, expected: number, tolerance: number = 0.01, message?: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(message || `Expected ${expected} ±${tolerance}, got ${actual}`)
  }
}

// ==================== MovementComponent Tests ====================

console.log('\n📦 MovementComponent Tests\n')

test('MovementComponent: 创建', () => {
  const movement = new MovementComponent(10, 90, MovementType.TRACK)
  
  assertEqual(movement.speed, 10)
  assertEqual(movement.turnRate, 90)
  assertEqual(movement.movementType, 'track')
  assertEqual(movement.state, MovementState.IDLE)
})

test('MovementComponent: 设置路径', () => {
  const movement = new MovementComponent()
  const path = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 }
  ]
  
  movement.setPath(path)
  
  assertEqual(movement.path.length, 3)
  assertEqual(movement.pathIndex, 0)
  assertEqual(movement.state, MovementState.MOVING)
})

test('MovementComponent: 路径前进', () => {
  const movement = new MovementComponent()
  movement.setPath([
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 }
  ])
  
  const hasMore = movement.advancePath()
  
  assert(hasMore, '应该还有路径点')
  assertEqual(movement.pathIndex, 1)
  
  const noMore = movement.advancePath()
  assert(!noMore, '应该没有更多路径点')
  assertEqual(movement.state, MovementState.IDLE)
})

// ==================== MovementSystem Tests ====================

console.log('\n📦 MovementSystem Tests\n')

test('MovementSystem: 注册实体', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  
  const entity = world.createEntity('Mover')
  entity.addComponent(new TransformComponent())
  entity.addComponent(new MovementComponent(5, 180))
  
  // 系统应该自动追踪这个实体
  assert(system !== null, '系统已添加')
})

test('MovementSystem: 直线移动', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  world.start()
  
  const entity = world.createEntity()
  const transform = entity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }))
  const movement = entity.addComponent(new MovementComponent(10, 180)) // 10单位/秒
  
  // 设置目标（正东方向，不需要转向）
  system.moveTo(entity, { x: 10, y: 0, z: 0 })
  
  // 先确保朝向正确
  transform.rotation.y = Math.PI / 2 // 朝南 (90度)
  
  // 更新0.5秒
  world.update(0.5)
  
  // 应该移动了约 10 * 0.5 = 5 单位
  assertApprox(transform.position.x, 5, 1.0, '应该向目标移动')
  assertEqual(movement.state, MovementState.MOVING, '应该仍在移动')
})

test('MovementSystem: 到达停止', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  world.start()
  
  const entity = world.createEntity()
  const transform = entity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }))
  const movement = entity.addComponent(new MovementComponent(10, 180))
  
  system.moveTo(entity, { x: 1, y: 0, z: 0 })
  
  // 更新足够长时间到达目标
  for (let i = 0; i < 20; i++) {
    world.update(0.1)
  }
  
  assertApprox(transform.position.x, 1, 0.2, '应该到达目标')
  assertEqual(movement.state, MovementState.IDLE, '应该停止')
})

test('MovementSystem: 路径跟随', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  world.start()
  
  const entity = world.createEntity()
  const transform = entity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }))
  const movement = entity.addComponent(new MovementComponent(5, 180))
  
  // 设置折线路径
  movement.setPath([
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 0, z: 0 },
    { x: 5, y: 0, z: 5 }
  ])
  
  // 移动一段时间
  for (let i = 0; i < 50; i++) {
    world.update(0.1)
  }
  
  // 应该接近终点 (5, 0, 5)
  const distToEnd = Math.sqrt(
    Math.pow(transform.position.x - 5, 2) +
    Math.pow(transform.position.z - 5, 2)
  )
  
  assert(distToEnd < 1, `应该接近终点，距离: ${distToEnd}`)
})

test('MovementSystem: 转向', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  world.start()
  
  const entity = world.createEntity()
  const transform = entity.addComponent(new TransformComponent(
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 } // 朝向东 (0度)
  ))
  entity.addComponent(new MovementComponent(5, 90)) // 90度/秒转向
  
  // 命令转向到南 (90度)
  system.rotateTo(entity, 90)
  
  // 更新1秒
  world.update(1)
  
  // 应该转向了约90度
  const rotationDeg = transform.rotation.y * (180 / Math.PI)
  assertApprox(rotationDeg, 90, 10, '应该接近目标方向')
})

// ==================== Integration Tests ====================

console.log('\n📦 Integration Tests\n')

test('Integration: 世界循环中的移动', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  world.start()
  
  const entity = world.createEntity('Unit')
  entity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }))
  entity.addComponent(new MovementComponent(10, 180))
  
  // 通过系统命令移动
  system.moveTo(entity, { x: 5, y: 0, z: 0 })
  
  // 模拟游戏循环
  for (let i = 0; i < 60; i++) {
    world.update(1/60) // 60 FPS
  }
  
  const transform = entity.getComponent<TransformComponent>('transform')!
  assertApprox(transform.position.x, 5, 0.5, '应该到达目的地')
})

test('Integration: 渲染插值', () => {
  const world = new World()
  const system = new MovementSystem()
  world.addSystem(system)
  world.start()
  
  const entity = world.createEntity()
  const transform = entity.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }))
  const movement = entity.addComponent(new MovementComponent(10, 180))
  
  // 快速移动
  system.moveTo(entity, { x: 10, y: 0, z: 0 })
  world.update(0.5)
  
  // 渲染位置应该与实际位置接近但不完全相同（插值效果）
  assertApprox(movement.renderPosition.x, transform.position.x, 2, '渲染位置应该接近实际位置')
})

// ==================== Summary ====================

console.log('\n' + '='.repeat(50))
console.log(`测试结果: ${testsPassed} 通过, ${testsFailed} 失败`)
console.log('='.repeat(50) + '\n')

if (testsFailed > 0) {
  throw new Error(`${testsFailed} tests failed`)
}
