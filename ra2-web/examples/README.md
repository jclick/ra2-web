# RA2 Web ECS 架构示例代码

本目录包含 RA2 Web 项目 ECS (Entity-Component-System) 架构重构的完整示例代码。

## 目录结构

```
examples/
├── core/                      # ECS 核心框架
│   ├── Entity.ts             # 实体定义
│   ├── Component.ts          # 组件定义（所有组件类型）
│   ├── System.ts             # 系统基类
│   ├── World.ts              # 世界/场景管理器
│   └── EventBus.ts           # 事件总线
│
├── components/               # 工厂类
│   ├── UnitFactory.ts        # 单位创建工厂
│   └── BuildingFactory.ts    # 建筑创建工厂
│
├── systems/                  # 系统实现
│   ├── MovementSystem.ts     # 移动系统
│   ├── CombatSystem.ts       # 战斗系统
│   ├── ConstructionSystem.ts # 建造系统
│   └── FogOfWarSystem.ts     # 战争迷雾系统
│
└── services/                 # 服务层
    └── PathfindingService.ts # 寻路服务
```

## 核心概念

### Entity (实体)

实体只是一个唯一标识符，不包含任何数据或逻辑：

```typescript
interface Entity {
  readonly id: EntityId      // 如 "unit_001"
  readonly type: EntityType  // 如 "UNIT", "BUILDING"
}
```

### Component (组件)

组件是纯数据结构，没有方法：

```typescript
interface Transform extends Component {
  type: ComponentType.TRANSFORM
  x: number
  y: number
  z: number
  rotation: number
}
```

### System (系统)

系统包含处理组件的逻辑，在每一帧更新：

```typescript
class MovementSystem extends System {
  update(deltaTime: number): void {
    const entities = this.getEntities()  // 获取符合条件的实体
    for (const entityId of entities) {
      const transform = this.getComponent<Transform>(entityId, ComponentType.TRANSFORM)
      const movement = this.getComponent<Movement>(entityId, ComponentType.MOVEMENT)
      // 处理移动逻辑...
    }
  }
}
```

## 使用示例

### 1. 初始化世界

```typescript
import { World } from './core/World'
import { EventBus } from './core/EventBus'

const eventBus = new EventBus()
const world = new World(eventBus, {
  mapWidth: 100,
  mapHeight: 100
})
```

### 2. 注册系统

```typescript
import { MovementSystem } from './systems/MovementSystem'
import { CombatSystem } from './systems/CombatSystem'
import { PathfindingService } from './services/PathfindingService'

const pathfinding = new PathfindingService(gameMap)

world.registerSystem(new MovementSystem(world, eventBus, pathfinding))
world.registerSystem(new CombatSystem(world, eventBus))
```

### 3. 创建单位

```typescript
import { UnitFactory } from './components/UnitFactory'
import { Faction } from './core/Component'

const unitId = UnitFactory.createUnit(
  world,
  'GRIZZLY',                          // 单位类型
  { x: 10, z: 10 },                   // 位置
  'player1',                          // 玩家ID
  Faction.ALLIES                      // 阵营
)
```

### 4. 创建建筑

```typescript
import { BuildingFactory } from './components/BuildingFactory'

const buildingId = BuildingFactory.createBuilding(
  world,
  'GAPOWR',                           // 建筑类型
  { x: 20, z: 20 },                   // 位置
  'player1',                          // 玩家ID
  Faction.ALLIES                      // 阵营
)

// 开始建造
const constructionSystem = world.getSystems()
  .find(s => s instanceof ConstructionSystem) as ConstructionSystem
constructionSystem.startConstruction(buildingId)
```

### 5. 监听事件

```typescript
eventBus.on('combat:killed', ({ killerId, victimId }) => {
  console.log(`${killerId} killed ${victimId}!`)
})

eventBus.on('build:completed', ({ entityId }) => {
  console.log(`Building ${entityId} completed!`)
})
```

### 6. 游戏主循环

```typescript
function gameLoop() {
  const deltaTime = calculateDeltaTime()
  
  // 更新所有系统
  world.update(deltaTime)
  
  // 渲染...
  
  requestAnimationFrame(gameLoop)
}

gameLoop()
```

### 7. 发送命令

```typescript
import { MovementSystem } from './systems/MovementSystem'

// 移动单位
const movementSystem = world.getSystems()
  .find(s => s instanceof MovementSystem) as MovementSystem

movementSystem.moveTo(unitId, { x: 50, z: 50 })

// 攻击目标
const combatSystem = world.getSystems()
  .find(s => s instanceof CombatSystem) as CombatSystem

combatSystem.setTarget(unitId, targetId)
```

## 组件清单

| 组件 | 说明 |
|-----|------|
| Transform | 位置与旋转 |
| Health | 生命值与护甲 |
| Movement | 移动能力与路径 |
| Combat | 武器与战斗状态 |
| Vision | 视野范围 |
| Owner | 所属玩家与阵营 |
| Construction | 建造状态与进度 |
| Production | 生产队列 |
| Power | 电力消耗与产出 |
| Resource | 资源携带 |
| Placement | 放置验证 |
| Selectable | 可被选中的状态 |
| Render | 渲染信息 |

## 系统清单

| 系统 | 优先级 | 说明 |
|-----|-------|------|
| MovementSystem | 200 | 处理单位移动 |
| CombatSystem | 300 | 处理战斗与伤害 |
| ConstructionSystem | 500 | 处理建筑建造 |
| FogOfWarSystem | 900 | 处理视野与迷雾 |

## 事件清单

### 实体生命周期
- `entity:created` - 实体创建
- `entity:destroyed` - 实体销毁

### 移动
- `movement:started` - 开始移动
- `movement:completed` - 移动完成
- `movement:blocked` - 移动受阻

### 战斗
- `combat:attack` - 发起攻击
- `combat:damage` - 造成伤害
- `combat:killed` - 击杀目标
- `combat:veterancy` - 升级

### 建造
- `build:started` - 开始建造
- `build:completed` - 建造完成
- `build:canceled` - 取消建造

## 与旧架构对比

| 特性 | 旧架构 | ECS架构 |
|-----|-------|---------|
| 单位创建 | 直接实例化Unit类 | 组合组件 |
| 状态管理 | 分散在各对象中 | 集中式组件存储 |
| 功能扩展 | 修改类继承 | 添加组件/系统 |
| 系统通信 | 直接调用/回调 | 事件总线 |
| 测试 | 难以隔离 | 组件/系统可单独测试 |
| 序列化 | 复杂 | 组件数据天然可序列化 |

## 迁移建议

1. **渐进式迁移**：新旧系统并行运行，逐步替换
2. **优先迁移独立系统**：如经济系统、战争迷雾
3. **保持接口兼容**：对外API保持不变
4. **充分测试**：每个系统单独测试通过后再集成
