# ECS 架构迁移指南

## 概述

本指南帮助你将现有的 RA2 Web 代码迁移到新的 ECS 架构。ECS（Entity-Component-System）是一种数据驱动的架构模式，更适合游戏开发。

## 目录

1. [架构对比](#架构对比)
2. [组件映射](#组件映射)
3. [系统替换](#系统替换)
4. [迁移步骤](#迁移步骤)
5. [常见问题](#常见问题)

---

## 架构对比

### 旧架构（面向对象）

```typescript
// Unit 类包含所有逻辑
class Unit {
  position: Vector3
  health: number
  target: Unit | null
  
  update() {
    this.move()
    this.attack()
    this.updateAI()
  }
}
```

### 新架构（ECS）

```typescript
// 数据（Component）
entity.addComponent(new TransformComponent(pos))
entity.addComponent(new HealthComponent(100))
entity.addComponent(new CombatComponent())

// 逻辑（System）
world.addSystem(new MovementSystem())
world.addSystem(new CombatSystem())
```

---

## 组件映射

| 旧代码属性 | ECS 组件 | 说明 |
|-----------|---------|------|
| `unit.position` | `TransformComponent` | 位置、旋转、缩放 |
| `unit.health` | `HealthComponent` | 生命值、护甲、老兵 |
| `unit.faction` | `OwnerComponent` | 所属玩家、阵营 |
| `unit.weapon` | `WeaponComponent` | 武器配置 |
| `unit.target` | `CombatComponent` | 战斗状态、目标 |
| `unit.path` | `MovementComponent` | 移动路径、状态 |
| `unit.isBuilding` | `ConstructionComponent` | 建造状态、进度 |
| `unit.harvester` | `EconomyComponent` | 采矿车状态 |
| `unit.aiEnabled` | `AIComponent` | AI行为树 |
| `unit.invisible` | `VisionComponent` | 隐形、探测 |

---

## 系统替换

### 移动系统

**旧代码：**
```typescript
unit.moveTo(targetPosition)
unit.updatePosition(deltaTime)
```

**新代码：**
```typescript
// 获取组件
const movement = entity.getComponent<MovementComponent>('movement')

// 设置目标
movement.setDestination(targetPosition)

// MovementSystem 会自动处理更新
```

### 战斗系统

**旧代码：**
```typescript
unit.setTarget(enemy)
unit.updateAttacking(deltaTime)
unit.fireWeapon()
```

**新代码：**
```typescript
// 获取系统
const combatSystem = world.getSystem(CombatSystem)

// 命令攻击
combatSystem.attackTarget(entity, targetEntity.id)

// 或使用组件
const combat = entity.getComponent<CombatComponent>('combat')
combat.setTarget(targetEntity.id)
```

### AI系统

**旧代码：**
```typescript
unit.updateAI()
unit.findNearestEnemy()
unit.attackTarget()
```

**新代码：**
```typescript
// 创建AI组件
entity.addComponent(new AIComponent(AIBehaviorType.AGGRESSIVE))

// 使用系统设置行为树
const aiSystem = world.getSystem(AISystem)
aiSystem.createAggressiveAI(entity)

// AI 自动运行
```

---

## 迁移步骤

### 步骤 1: 创建 World 和系统

```typescript
import { World } from './ecs'
import {
  MovementSystem,
  CombatSystem,
  AISystem,
  EconomySystem,
  ConstructionSystem,
  FogOfWarSystem
} from './ecs/systems'

const world = new World()

// 添加系统
world.addSystem(new MovementSystem())
world.addSystem(new CombatSystem())
world.addSystem(new AISystem())
// ... 其他系统

world.start()
```

### 步骤 2: 创建实体替代单位

```typescript
// 旧代码
const unit = new Unit({ x: 10, z: 20 }, Faction.ALLIES)

// 新代码
const entity = world.createEntity('Unit')
entity.addComponent(new TransformComponent({ x: 10, y: 0, z: 20 }))
entity.addComponent(new OwnerComponent('player1', Faction.ALLIES))
entity.addComponent(new HealthComponent(100))
```

### 步骤 3: 迁移更新循环

```typescript
// 旧代码
gameLoop(deltaTime) {
  for (const unit of units) {
    unit.update(deltaTime)
  }
}

// 新代码
gameLoop(deltaTime) {
  world.update(deltaTime)
}
```

### 步骤 4: 替换事件系统

```typescript
// 旧代码
unit.on('died', () => {
  // 处理死亡
})

// 新代码
world.events.on('entity:destroyed', (event) => {
  // 处理实体销毁
})

// 或在组件中
health.onDied = () => {
  world.events.emit('unit:died', { entityId: entity.id })
}
```

### 步骤 5: 使用适配器桥接旧代码

```typescript
import { MovementAdapter, CombatAdapter } from './ecs/adapters'

// 创建适配器
const movementAdapter = new MovementAdapter(world)
const combatAdapter = new CombatAdapter(world)

// 同步旧 Unit 到新 ECS
movementAdapter.syncFromUnit(unit, entity)
combatAdapter.syncFromUnit(unit, entity)
```

---

## 完整迁移示例

### 迁移一个战斗单位

```typescript
// ========== 旧代码 ==========
class Tank extends Unit {
  constructor(position: Vector3, faction: Faction) {
    super()
    this.position = position
    this.faction = faction
    this.health = 400
    this.maxHealth = 400
    this.weapon = new CannonWeapon()
    this.ai = new AggressiveAI()
  }
  
  update(deltaTime: number) {
    this.ai.update(this, deltaTime)
    if (this.ai.shouldAttack) {
      this.attack(this.ai.target)
    }
    this.moveAlongPath(deltaTime)
  }
}

// ========== 新代码 ==========
function createTank(world: World, position: Vector3, faction: Faction): Entity {
  const entity = world.createEntity('Tank')
  
  // 基础组件
  entity.addComponent(new TransformComponent(position))
  entity.addComponent(new OwnerComponent('player1', faction))
  entity.addComponent(new HealthComponent(400, ArmorType.HEAVY))
  
  // 武器组件
  entity.addComponent(new WeaponComponent({
    id: 'cannon',
    name: '120mm Cannon',
    damage: 90,
    range: 15,
    cooldown: 2.5,
    projectileType: ProjectileType.SHELL,
    damageType: DamageType.NORMAL,
    isTurret: true,
    turretRotationSpeed: 120,
    canTargetAir: false,
    canTargetGround: true
  }))
  
  // 战斗组件
  entity.addComponent(new CombatComponent(15))
  
  // 移动组件
  entity.addComponent(new MovementComponent(4, 90, MovementType.TRACK))
  
  // AI组件
  const ai = new AIComponent(AIBehaviorType.AGGRESSIVE)
  entity.addComponent(ai)
  
  // 设置AI行为树
  const aiSystem = world.getSystem(AISystem)!
  aiSystem.createAggressiveAI(entity)
  
  return entity
}

// 更新循环不再需要 - World 自动处理
```

---

## 常见问题

### Q: 如何访问关联实体？

```typescript
// 旧代码
const target = unit.targetUnit

// 新代码
const combat = entity.getComponent<CombatComponent>('combat')
const targetId = combat.targetId
const targetEntity = world.getEntity(targetId)
```

### Q: 如何批量查询实体？

```typescript
// 获取所有带特定组件的实体
const entities = world.getEntitiesWithComponents(['combat', 'health'])

// 过滤阵营
const allies = entities.filter(e => {
  const owner = e.getComponent<OwnerComponent>('owner')
  return owner?.faction === Faction.ALLIES
})
```

### Q: 组件之间的依赖关系？

```typescript
// 通过 System 处理依赖
class CombatSystem extends EntitySystem {
  constructor() {
    // 声明需要的组件
    super('combat', 'weapon', 'transform', 'owner')
  }
  
  protected updateEntity(entity: Entity, deltaTime: number) {
    // 获取所有需要的组件
    const combat = entity.getComponent<CombatComponent>('combat')
    const weapon = entity.getComponent<WeaponComponent>('weapon')
    const transform = entity.getComponent<TransformComponent>('transform')
    const owner = entity.getComponent<OwnerComponent>('owner')
    
    // 使用组件进行更新
  }
}
```

### Q: 如何保存/加载游戏？

```typescript
// 保存
function saveGame(world: World): string {
  const saveData = {
    entities: world.getAllEntities().map(e => ({
      id: e.id,
      name: e.name,
      components: Array.from(e.getAllComponents()).map(([type, comp]) => ({
        type,
        data: comp.serialize()
      }))
    }))
  }
  return JSON.stringify(saveData)
}

// 加载
function loadGame(world: World, saveData: string) {
  const data = JSON.parse(saveData)
  
  for (const entityData of data.entities) {
    const entity = world.createEntity(entityData.name)
    
    for (const compData of entityData.components) {
      const ComponentClass = getComponentClass(compData.type)
      const component = new ComponentClass()
      component.deserialize(compData.data)
      entity.addComponent(component)
    }
  }
}
```

---

## 性能优化建议

### 1. 使用对象池

```typescript
// 避免频繁创建/销毁实体
const entityPool: Entity[] = []

function spawnUnit(): Entity {
  if (entityPool.length > 0) {
    return entityPool.pop()!
  }
  return world.createEntity('Unit')
}

function despawnUnit(entity: Entity) {
  entity.clearComponents()
  entityPool.push(entity)
}
```

### 2. 减少组件查询

```typescript
// 不推荐：每帧查询
update(deltaTime) {
  for (const entity of entities) {
    const health = entity.getComponent('health') // 每次都查询
  }
}

// 推荐：System 自动过滤
class HealthSystem extends EntitySystem {
  constructor() {
    super('health') // 只处理有 health 组件的实体
  }
  
  protected updateEntity(entity: Entity, deltaTime) {
    // entity 保证有 health 组件
    const health = entity.getComponent<HealthComponent>('health')!
  }
}
```

### 3. 事件批量处理

```typescript
// 批量发送事件，避免每帧触发
const damageEvents: DamageEvent[] = []

// 收集所有伤害事件
function applyDamage(target: Entity, amount: number) {
  damageEvents.push({ target, amount })
}

// 一帧结束后统一处理
function processDamageEvents() {
  for (const event of damageEvents) {
    // 应用伤害
  }
  damageEvents.length = 0
}
```

---

## 调试技巧

### 启用调试模式

```typescript
world.setDebugMode(true)

// 输出实体信息
world.events.on('entity:created', (e) => console.log('Entity created:', e))
world.events.on('entity:destroyed', (e) => console.log('Entity destroyed:', e))
```

### 性能分析

```typescript
import { ECSProfiler } from './ecs/utils/Profiler'

const profiler = new ECSProfiler(world)
profiler.start()

// 运行一段时间后
console.log(profiler.getSummary())
console.log(profiler.getOptimizationSuggestions())
```

---

## 迁移检查清单

- [ ] 创建 World 并添加所有系统
- [ ] 将 Unit 类转换为 Entity + Components
- [ ] 替换 update() 循环为 world.update()
- [ ] 迁移事件系统
- [ ] 更新创建单位的工厂方法
- [ ] 迁移寻路逻辑到 PathfindingService
- [ ] 测试所有功能正常
- [ ] 运行性能分析并优化
- [ ] 更新单元测试

---

## 参考资料

- [ECS 设计模式](https://en.wikipedia.org/wiki/Entity_component_system)
- [RA2 Web 架构文档](./ARCHITECTURE.md)
- [ECS API 文档](./API.md)
