# RA2 Web 项目架构重构方案

## 文档信息
- **版本**: 1.0.0
- **日期**: 2026-03-22
- **作者**: 架构师
- **状态**: 设计阶段

---

## 目录

1. [现有架构分析](#1-现有架构分析)
2. [RA2 核心能力分析](#2-ra2-核心能力分析)
3. [新架构设计](#3-新架构设计)
4. [模块详细设计](#4-模块详细设计)
5. [重构路线图](#5-重构路线图)
6. [代码示例](#6-代码示例)

---

## 1. 现有架构分析

### 1.1 整体架构现状

```
┌─────────────────────────────────────────────────────────────────┐
│                         Engine.ts                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Rendering   │  │ Input       │  │ Game Loop               │  │
│  │ (Three.js)  │  │ Handling    │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GameManager.ts                            │
│  ┌──────────┬──────────┬──────────┬──────────┬────────────────┐ │
│  │ Map      │ Units    │ Buildings│ Players  │ EconomySystem  │ │
│  ├──────────┼──────────┼──────────┼──────────┼────────────────┤ │
│  │ Pathfind │ FogOfWar │ TechTree │ AI       │ SuperWeapon    │ │
│  └──────────┴──────────┴──────────┴──────────┴────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 主要架构问题

#### 1.2.1 上帝类问题 (God Class)

**GameManager 职责过载**：
```typescript
// 当前 GameManager 包含的职责（约 400+ 行）
class GameManager {
  // 数据管理
  map: GameMap
  units: Map<string, Unit>
  buildings: Map<string, Building>
  players: Map<string, Player>
  
  // 系统集成
  pathfinder: Pathfinder
  economySystem: EconomySystem
  fogOfWar: FogOfWar
  techTree: TechTree
  superWeaponManager: SuperWeaponManager
  aiManager: AIManager
  
  // 游戏逻辑
  selectedUnits: Set<Unit>
  buildQueue: Building[]
  
  // 方法数量：50+
  // 包括：单位创建/销毁、建筑管理、选择系统、命令系统、
  //      游戏控制、查询接口、科技解锁、资源管理...
}
```

**问题影响**：
- 违反单一职责原则 (SRP)
- 测试困难，需要mock大量依赖
- 代码变更容易引入回归bug
- 新功能开发受限于类的复杂度

#### 1.2.2 紧耦合问题

**系统间强依赖**：
```typescript
// GameManager 直接实例化所有子系统
constructor(config: GameConfig) {
  this.map = GameMap.generateTestMap(50)
  this.pathfinder = new Pathfinder(this.map)  // 紧耦合
  this.economySystem = new EconomySystem()    // 紧耦合
  this.fogOfWar = new FogOfWar(this.map)      // 紧耦合
  this.techTree = new TechTree()              // 紧耦合
  this.aiManager = new AIManager(this, this.techTree) // 双向依赖
}
```

**回调地狱**：
```typescript
// 复杂的回调链
building.onConstructionCompleted = (b) => {
  this.techTree.onBuildingConstructed(buildingId, owner)
  this.checkAndCreateSuperWeapon(buildingId, ownerId, position)
  this.onBuildingCreated?.(b)  // 通知Engine
}
```

#### 1.2.3 继承滥用

**Unit 类继承体系问题**：
```typescript
// Unit 基类过于庞大，包含所有可能的行为
class Unit {
  // 位置/渲染
  position: Vector3
  renderPosition: Vector3
  
  // 状态管理（混合了多种单位类型的状态）
  state: UnitState  // 枚举包含：IDLE, MOVING, ATTACKING, BUILDING, HARVESTING...
  
  // 武器系统
  primaryWeapon?: Weapon
  secondaryWeapon?: Weapon
  
  // 移动系统
  currentPath: PathNode[]
  targetPosition?: Vector3
  
  // 攻击系统
  targetUnit?: Unit
  turretRotation: number
  
  // 特殊能力（大部分单位用不到）
  isDeployed: boolean
  isGarrisoned: boolean
  isCloaked: boolean
  isBuilding: boolean
  buildProgress: number
  
  // update 方法包含所有状态的switch-case
  update(deltaTime: number) {
    switch(this.state) {
      case MOVING: this.updateMoving(deltaTime); break
      case ATTACKING: this.updateAttacking(deltaTime); break
      case HARVESTING: this.updateHarvesting(deltaTime); break
      // ... 更多状态
    }
  }
}
```

#### 1.2.4 状态管理混乱

**多源状态问题**：
```typescript
// 状态分散在多个地方
Unit.selected          // 在Unit类中
Building.selected      // 在Building类中
selectedUnits: Set<Unit>    // 在GameManager中
selectedBuilding?: Building // 在GameManager中

// 不同步风险
unit.selected = false  // 直接修改
// 但GameManager.selectedUnits可能仍然包含该单位
```

#### 1.2.5 渲染与逻辑耦合

**Engine.ts 职责不清晰**：
```typescript
class GameEngine {
  // 渲染相关
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  
  // 输入处理（应该属于InputSystem）
  private isDragging: boolean
  private onMouseDown = (e: MouseEvent) => { ... }
  
  // 游戏逻辑（应该属于GameLogic）
  private isPlacingBuilding: boolean
  private onBuildingPlaced: ((position: Vector3) => void) | null
  
  // 直接操作GameManager
  private gameManager: GameManager | null
}
```

### 1.3 可扩展性问题

| 扩展需求 | 当前难度 | 问题描述 |
|---------|---------|---------|
| 添加新单位类型 | 高 | 需要修改Unit基类、UnitDatabase、GameManager |
| 添加新建筑功能 | 高 | 需要修改Building类、BuildingSystem、TechTree |
| 添加新游戏模式 | 高 | 需要修改GameManager多个方法 |
| 多人游戏支持 | 很高 | 系统间紧耦合，难以序列化状态 |
| 模组支持 | 很高 | 代码与数据高度耦合 |

---

## 2. RA2 核心能力分析

### 2.1 能力地图

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RA2 Core Capabilities                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Map System │  │  Fog of War  │  │   Resource   │              │
│  │              │  │              │  │   System     │              │
│  │ • Multi-layer│  │ • Visibility │  │ • Ore Fields │              │
│  │ • Height     │  │ • Exploration│  │ • Harvesting │              │
│  │ • Occlusion  │  │ • Line of    │  │ • Refining   │              │
│  │ • Tiberium/  │  │   Sight      │  │ • Credit Mgmt│              │
│  │   Ore        │  │ • Shroud     │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Building   │  │     Unit     │  │   Combat     │              │
│  │    System    │  │    System    │  │    System    │              │
│  │              │  │              │  │              │              │
│  │ • Build Queue│  │ • Behavior   │  │ • Targeting  │              │
│  │ • Power Grid │  │   Tree       │  │ • Damage Calc│              │
│  │ • Tech Tree  │  │ • Formation  │  │ • Veterancy  │              │
│  │ • Production │  │ • Pathfinding│  │ • Super      │              │
│  │ • Placement  │  │ • Combat AI  │  │   Weapons    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 各系统详细分析

#### 2.2.1 地图系统 (Map System)

**核心需求**：
- **多层地形**：地面、水域、悬崖、可破坏地形
- **高度系统**：影响视野、投射物轨迹
- **遮挡关系**：地形和单位之间的遮挡计算
- **资源分布**：矿石和宝石矿的生成与管理
- **通行性**：不同单位类型的通行规则

**性能考虑**：
- 地图大小：典型 100x100 ~ 200x200 单元格
- 需要支持快速查询（O(1)）
- 支持区域查询（AOI）

#### 2.2.2 战争迷雾 (Fog of War)

**状态定义**：
```typescript
enum FogState {
  UNEXPLORED = 0,  // 黑色，从未见过
  EXPLORED = 1,    // 灰色，曾经见过
  VISIBLE = 2,     // 正常，当前可见
}
```

**视野规则**：
- 单位视野半径（sight range）
- 地形高度影响视野
- 障碍物阻挡视线
- 建筑提供视野

**性能优化**：
- 使用纹理数组或GPU计算
- 增量更新而非全量重算
- 分层更新（近处高频，远处低频）

#### 2.2.3 建筑系统 (Building System)

**核心功能**：
- **建造队列**：多个建筑的并行建造
- **电力系统**：发电与耗电的平衡
- **科技树**：前置条件检查
- **生产系统**：单位/建筑的生产队列
- **放置规则**：地形检查、间距检查

**状态机**：
```
[PLACEMENT] → [CONSTRUCTION] → [IDLE] → [PRODUCING] → [SELLING]
                  ↑                ↓
                  └──────── [POWER_DOWN] ←── 电力不足
```

#### 2.2.4 单位系统 (Unit System)

**行为需求**：
- **移动**：寻路、避障、编队、地形适应
- **攻击**：目标选择、武器冷却、弹道计算
- **特殊能力**：部署、进驻、隐形、治疗
- **AI**：自动索敌、撤退判断、阵型保持

**单位类型差异**：

| 类型 | 移动 | 攻击 | 特殊 |
|-----|------|------|------|
| 步兵 | 步行，可进驻 | 轻武器 | 可部署 |
| 载具 | 履带/轮式 | 重武器 | 可碾压 |
| 飞行器 | 飞行 | 空对地/空对空 | 弹药限制 |
| 海军 | 水面/水下 | 舰炮/鱼雷 | 不可上岸 |

#### 2.2.5 经济系统 (Economy System)

**资源流**：
```
[Ore Field] → [Harvesting] → [Ore Miner] → [Refinery] → [Credits]
                                                   ↓
                                            [Buildings/Units]
```

**核心机制**：
- 矿石采集速率
- 运输路径优化
- 资金管理与花费
- 矿物再生（可选）

#### 2.2.6 战斗系统 (Combat System)

**伤害计算**：
```
Damage = BaseDamage 
       × (1 + VeterancyBonus) 
       × ArmorMultiplier 
       × RandomFactor
       × DistanceFalloff
```

**老兵系统**：
- Rookie → Veteran → Elite → Heroic
- 属性提升：攻击、防御、自愈、速度

---

## 3. 新架构设计

### 3.1 架构原则

1. **ECS (Entity-Component-System)**：数据与逻辑分离
2. **事件驱动**：系统间通过事件通信，降低耦合
3. **单一职责**：每个系统只负责一个领域
4. **可测试性**：依赖注入，接口隔离
5. **可扩展性**：新功能通过添加组件/系统实现

### 3.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RA2 ECS Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Presentation Layer                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │  Renderer  │  │   Input    │  │    UI      │  │  Camera    │   │   │
│  │  │  System    │  │   System   │  │   System   │  │  System    │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Game Simulation Layer                       │   │
│  │                                                                     │   │
│  │   ┌───────────────────────────────────────────────────────────┐    │   │
│  │   │                    Entity Manager                          │    │   │
│  │   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │    │   │
│  │   │  │Entity 1 │ │Entity 2 │ │Entity 3 │ │  ...    │          │    │   │
│  │   │  │[C1,C2..]│ │[C3,C4..]│ │[C1,C5..]│ │         │          │    │   │
│  │   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │    │   │
│  │   └───────────────────────────────────────────────────────────┘    │   │
│  │                              │                                      │   │
│  │   ┌────────────┬────────────┼────────────┬────────────┐            │   │
│  │   │            │            │            │            │            │   │
│  │   ▼            ▼            ▼            ▼            ▼            │   │
│  │ ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐  │   │
│  │ │Move  │   │Combat│   │Build │   │Econom│   │FogOfW│   │TechTr│  │   │
│  │ │System│   │System│   │System│   │System│   │System│   │System│  │   │
│  │ └──┬───┘   └──┬───┘   └──┬───┘   └──┬───┘   └──┬───┘   └──┬───┘  │   │
│  │    │          │          │          │          │          │      │   │
│  │    └──────────┴──────────┴──────────┴──────────┴──────────┘      │   │
│  │                         │                                         │   │
│  │                         ▼                                         │   │
│  │              ┌─────────────────────┐                              │   │
│  │              │    Event Bus        │                              │   │
│  │              │  (Pub/Sub Channel)  │                              │   │
│  │              └─────────────────────┘                              │   │
│  │                         │                                         │   │
│  │   ┌────────────┬────────┼────────┬────────────┐                   │   │
│  │   ▼            ▼        ▼        ▼            ▼                   │   │
│  │ ┌──────┐   ┌──────┐ ┌──────┐ ┌──────┐   ┌──────┐                │   │
│  │ │Path  │   │AISyst│ │Audio │ │Effect│   │MultiP│                │   │
│  │ │finder│   │em    │ │System│ │System│   │layer │                │   │
│  │ └──────┘   └──────┘ └──────┘ └──────┘   └──────┘                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Data Layer                                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ Component  │  │   Event    │  │   State    │  │   Asset    │   │   │
│  │  │  Storage   │  │   Store    │  │  Snapshots │  │   Cache    │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 ECS 核心设计

#### 3.3.1 Entity (实体)

```typescript
// 实体只是一个唯一标识符
interface Entity {
  readonly id: EntityId  // 如 "unit_001", "building_005"
  readonly type: EntityType  // 用于快速分类
}

type EntityId = string
type EntityType = 'UNIT' | 'BUILDING' | 'PROJECTILE' | 'RESOURCE'
```

#### 3.3.2 Component (组件) - 纯数据

```typescript
// 组件只有数据，没有方法
namespace Components {
  // 位置组件
  interface Position {
    x: number
    y: number
    z: number
    rotation: number
  }

  // 生命值组件
  interface Health {
    current: number
    max: number
    armor: ArmorType
  }

  // 移动组件
  interface Movable {
    speed: number
    turnRate: number
    movementType: MovementType
    path: PathNode[]
    targetPosition?: Vector3
  }

  // 武器组件
  interface Weapon {
    primary: WeaponConfig
    secondary?: WeaponConfig
    turretRotation: number
    targetEntity?: EntityId
  }

  // 所有者组件
  interface Owner {
    playerId: string
    faction: Faction
  }

  // 视野组件
  interface Sight {
    range: number
    revealsShroud: boolean
  }

  // 生产组件
  interface Production {
    queue: ProductionItem[]
    current?: ProductionItem
    progress: number
    rallyPoint?: Vector3
  }

  // 电力组件
  interface Power {
    consumption: number
    production: number
  }

  // 建造组件
  interface Constructible {
    buildTime: number
    progress: number
    cost: number
    prerequisites: string[]
  }

  // 资源组件
  interface Resource {
    type: ResourceType
    amount: number
    capacity: number
  }

  // 采集组件
  interface Harvester {
    targetResource?: EntityId
    targetRefinery?: EntityId
    state: 'idle' | 'moving_to_resource' | 'harvesting' | 'moving_to_refinery' | 'unloading'
  }

  // 可建造位置组件（用于建筑幽灵）
  interface Placement {
    size: { width: number; height: number }
    valid: boolean
    blockedCells: Vector2[]
  }
}
```

#### 3.3.3 System (系统) - 纯逻辑

```typescript
// 系统处理具有特定组件的实体
abstract class System {
  protected world: World
  
  constructor(world: World) {
    this.world = world
  }
  
  // 每帧更新
  abstract update(deltaTime: number): void
  
  // 返回这个系统关心的组件类型
  abstract getRequiredComponents(): ComponentType[]
}

// 移动系统示例
class MovementSystem extends System {
  getRequiredComponents() {
    return [ComponentType.POSITION, ComponentType.MOVABLE]
  }
  
  update(deltaTime: number): void {
    const query = this.world.query([
      ComponentType.POSITION, 
      ComponentType.MOVABLE
    ])
    
    for (const entity of query) {
      const pos = this.world.getComponent<Position>(entity, ComponentType.POSITION)!
      const movable = this.world.getComponent<Movable>(entity, ComponentType.MOVABLE)!
      
      if (!movable.path.length) continue
      
      // 执行移动逻辑...
      this.moveEntity(entity, pos, movable, deltaTime)
    }
  }
}
```

### 3.4 事件系统设计

```typescript
// 事件定义
interface GameEvents {
  // 实体生命周期
  'entity:created': { entityId: EntityId; type: EntityType }
  'entity:destroyed': { entityId: EntityId; type: EntityType; killer?: EntityId }
  
  // 战斗事件
  'combat:damage': { 
    source: EntityId
    target: EntityId
    damage: number
    damageType: DamageType
  }
  'combat:killed': { killer: EntityId; victim: EntityId }
  'combat:veterancy': { entityId: EntityId; newLevel: VeterancyLevel }
  
  // 建造事件
  'build:started': { entityId: EntityId; builderId: EntityId; cost: number }
  'build:completed': { entityId: EntityId }
  'build:canceled': { entityId: EntityId; refund: number }
  
  // 生产事件
  'production:queued': { producerId: EntityId; item: ProductionItem }
  'production:started': { producerId: EntityId; item: ProductionItem }
  'production:completed': { producerId: EntityId; item: ProductionItem }
  'production:canceled': { producerId: EntityId; item: ProductionItem; refund: number }
  
  // 经济事件
  'economy:credits_changed': { playerId: string; newAmount: number; delta: number }
  'economy:harvested': { harvesterId: EntityId; resourceId: EntityId; amount: number }
  'economy:refined': { refineryId: EntityId; playerId: string; credits: number }
  
  // 电力事件
  'power:changed': { playerId: string; production: number; consumption: number }
  'power:low': { playerId: string; deficit: number }
  'power:restored': { playerId: string }
  
  // 科技事件
  'tech:unlocked': { playerId: string; techId: string }
  'tech:infiltrated': { playerId: string; targetFaction: Faction; unlockedTechs: string[] }
  
  // 输入事件
  'input:select': { playerId: string; entityIds: EntityId[] }
  'input:command': { playerId: string; command: Command; targets: EntityId[] }
  
  // 游戏状态
  'game:started': { mapName: string; players: PlayerConfig[] }
  'game:paused': { byPlayer?: string }
  'game:resumed': {}
  'game:victory': { winner: string }
  'game:defeat': { loser: string }
}

// 事件总线实现
class EventBus {
  private listeners: Map<string, Set<Function>> = new Map()
  
  on<K extends keyof GameEvents>(
    event: K, 
    handler: (data: GameEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    
    return () => this.off(event, handler)
  }
  
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(h => h(data))
    }
  }
  
  off<K extends keyof GameEvents>(
    event: K, 
    handler: (data: GameEvents[K]) => void
  ): void {
    this.listeners.get(event)?.delete(handler)
  }
}
```

### 3.5 模块划分

```
src/
├── core/                          # 核心ECS框架
│   ├── Entity.ts                  # 实体定义
│   ├── Component.ts               # 组件基类与类型
│   ├── System.ts                  # 系统基类
│   ├── World.ts                   # 世界/场景管理
│   └── EventBus.ts                # 事件总线
│
├── components/                    # 组件定义
│   ├── Transform.ts               # 位置、旋转
│   ├── Health.ts                  # 生命值
│   ├── Movement.ts                # 移动相关
│   ├── Combat.ts                  # 战斗相关
│   ├── Production.ts              # 生产相关
│   ├── Economy.ts                 # 经济相关
│   ├── Power.ts                   # 电力相关
│   ├── Vision.ts                  # 视野相关
│   └── Special.ts                 # 特殊能力
│
├── systems/                       # 系统实现
│   ├── MovementSystem.ts          # 移动系统
│   ├── CombatSystem.ts            # 战斗系统
│   ├── ConstructionSystem.ts      # 建造系统
│   ├── ProductionSystem.ts        # 生产系统
│   ├── EconomySystem.ts           # 经济系统
│   ├── PowerSystem.ts             # 电力系统
│   ├── FogOfWarSystem.ts          # 战争迷雾系统
│   ├── TechSystem.ts              # 科技系统
│   ├── VisionSystem.ts            # 视野计算系统
│   └── AISystem.ts                # AI系统
│
├── services/                      # 服务层
│   ├── PathfindingService.ts      # 寻路服务
│   ├── PhysicsService.ts          # 物理服务
│   ├── SerializationService.ts    # 序列化服务
│   └── ReplayService.ts           # 回放服务
│
├── presentation/                  # 表现层
│   ├── renderer/                  # 渲染器
│   ├── ui/                        # UI系统
│   └── input/                     # 输入处理
│
├── data/                          # 数据层
│   ├── configs/                   # 配置数据
│   ├── assets/                    # 资源管理
│   └── parsers/                   # 文件解析
│
└── networking/                    # 网络层（未来）
    ├── Client.ts
    ├── Server.ts
    └── Synchronization.ts
```

---

## 4. 模块详细设计

### 4.1 核心 ECS 框架

#### 4.1.1 World - 世界管理器

```typescript
class World {
  private entities: Map<EntityId, Entity> = new Map()
  private components: Map<ComponentType, Map<EntityId, Component>> = new Map()
  private systems: System[] = []
  private eventBus: EventBus
  
  // 创建实体
  createEntity(type: EntityType): Entity {
    const id = `${type}_${generateId()}`
    const entity = { id, type }
    this.entities.set(id, entity)
    this.eventBus.emit('entity:created', { entityId: id, type })
    return entity
  }
  
  // 销毁实体
  destroyEntity(entityId: EntityId): void {
    // 移除所有组件
    for (const [type, storage] of this.components) {
      storage.delete(entityId)
    }
    this.entities.delete(entityId)
    this.eventBus.emit('entity:destroyed', { entityId, type: entity.type })
  }
  
  // 添加组件
  addComponent<T extends Component>(
    entityId: EntityId, 
    type: ComponentType, 
    component: T
  ): void {
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
    }
    this.components.get(type)!.set(entityId, component)
  }
  
  // 获取组件
  getComponent<T extends Component>(
    entityId: EntityId, 
    type: ComponentType
  ): T | undefined {
    return this.components.get(type)?.get(entityId) as T
  }
  
  // 查询实体（基于组件）
  query(requiredComponents: ComponentType[]): EntityId[] {
    const result: EntityId[] = []
    
    for (const [entityId, entity] of this.entities) {
      const hasAll = requiredComponents.every(type => 
        this.components.get(type)?.has(entityId)
      )
      if (hasAll) {
        result.push(entityId)
      }
    }
    
    return result
  }
  
  // 注册系统
  registerSystem(system: System): void {
    this.systems.push(system)
  }
  
  // 主循环
  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(deltaTime)
    }
  }
}
```

#### 4.1.2 System - 系统基类

```typescript
abstract class System {
  protected world: World
  protected eventBus: EventBus
  
  constructor(world: World, eventBus: EventBus) {
    this.world = world
    this.eventBus = eventBus
    this.subscribeToEvents()
  }
  
  // 子类实现：返回需要的组件类型
  abstract getRequiredComponents(): ComponentType[]
  
  // 子类实现：每帧更新
  abstract update(deltaTime: number): void
  
  // 子类可重写：订阅事件
  protected subscribeToEvents(): void {}
  
  // 获取所有符合要求的实体
  protected getEntities(): EntityId[] {
    return this.world.query(this.getRequiredComponents())
  }
}
```

### 4.2 核心系统实现

#### 4.2.1 MovementSystem - 移动系统

```typescript
class MovementSystem extends System {
  private pathfinding: PathfindingService
  
  constructor(world: World, eventBus: EventBus, pathfinding: PathfindingService) {
    super(world, eventBus)
    this.pathfinding = pathfinding
  }
  
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.MOVEMENT]
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const transform = this.world.getComponent<Transform>(entityId, ComponentType.TRANSFORM)!
      const movement = this.world.getComponent<Movement>(entityId, ComponentType.MOVEMENT)!
      
      if (!movement.path.length && !movement.targetPosition) {
        continue
      }
      
      // 如果需要新路径
      if (!movement.path.length && movement.targetPosition) {
        this.calculatePath(entityId, transform, movement)
      }
      
      // 沿路径移动
      if (movement.path.length > 0) {
        this.followPath(entityId, transform, movement, deltaTime)
      }
    }
  }
  
  private calculatePath(
    entityId: EntityId, 
    transform: Transform, 
    movement: Movement
  ): void {
    const startX = Math.floor(transform.x)
    const startY = Math.floor(transform.z)
    const endX = Math.floor(movement.targetPosition!.x)
    const endY = Math.floor(movement.targetPosition!.z)
    
    const path = this.pathfinding.findPath(startX, startY, endX, endY, {
      movementType: movement.movementType,
      entityId
    })
    
    if (path.length > 0) {
      movement.path = path
    }
  }
  
  private followPath(
    entityId: EntityId,
    transform: Transform,
    movement: Movement,
    deltaTime: number
  ): void {
    const nextNode = movement.path[0]
    const targetX = nextNode.x + 0.5
    const targetZ = nextNode.y + 0.5
    
    const dx = targetX - transform.x
    const dz = targetZ - transform.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    const moveDistance = movement.speed * deltaTime / 1000
    
    if (distance <= moveDistance) {
      // 到达路径点
      transform.x = targetX
      transform.z = targetZ
      movement.path.shift()
      
      if (movement.path.length === 0) {
        this.eventBus.emit('movement:completed', { entityId })
      }
    } else {
      // 继续移动
      transform.x += (dx / distance) * moveDistance
      transform.z += (dz / distance) * moveDistance
      transform.rotation = Math.atan2(dx, dz)
    }
  }
}
```

#### 4.2.2 CombatSystem - 战斗系统

```typescript
class CombatSystem extends System {
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.COMBAT]
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const combat = this.world.getComponent<Combat>(entityId, ComponentType.COMBAT)!
      
      // 更新武器冷却
      for (const weapon of combat.weapons) {
        if (weapon.cooldownRemaining > 0) {
          weapon.cooldownRemaining -= deltaTime
        }
      }
      
      // 如果有目标，尝试攻击
      if (combat.targetEntityId) {
        this.processAttack(entityId, combat)
      }
    }
  }
  
  private processAttack(attackerId: EntityId, combat: Combat): void {
    const targetId = combat.targetEntityId!
    const transform = this.world.getComponent<Transform>(attackerId, ComponentType.TRANSFORM)!
    const targetTransform = this.world.getComponent<Transform>(targetId, ComponentType.TRANSFORM)
    
    if (!targetTransform) {
      // 目标已销毁
      combat.targetEntityId = undefined
      return
    }
    
    const weapon = combat.weapons[0]
    if (!weapon || weapon.cooldownRemaining > 0) return
    
    // 检查距离
    const dx = targetTransform.x - transform.x
    const dz = targetTransform.z - transform.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    if (distance > weapon.config.range) {
      // 目标超出射程，需要移动接近
      return
    }
    
    // 开火
    weapon.cooldownRemaining = weapon.config.cooldown
    
    const damage = this.calculateDamage(weapon, targetId)
    
    this.eventBus.emit('combat:damage', {
      source: attackerId,
      target: targetId,
      damage,
      damageType: weapon.config.damageType
    })
  }
  
  private calculateDamage(weapon: WeaponInstance, targetId: EntityId): number {
    const baseDamage = weapon.config.damage
    const targetHealth = this.world.getComponent<Health>(targetId, ComponentType.HEALTH)
    
    if (!targetHealth) return baseDamage
    
    // 护甲减免
    let armorMultiplier = 1.0
    switch (targetHealth.armor) {
      case 'flak': armorMultiplier = 0.75; break
      case 'plate': armorMultiplier = 0.5; break
      case 'heavy': armorMultiplier = 0.25; break
      case 'concrete': armorMultiplier = 0.1; break
    }
    
    // 老兵加成
    // const veterancyBonus = ...
    
    return baseDamage * armorMultiplier
  }
}
```

#### 4.2.3 ConstructionSystem - 建造系统

```typescript
class ConstructionSystem extends System {
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.CONSTRUCTION]
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const construction = this.world.getComponent<Construction>(entityId, ComponentType.CONSTRUCTION)!
      
      if (construction.state !== 'building') continue
      
      // 增加进度
      construction.progress += deltaTime / construction.buildTime
      
      // 同步更新生命值（建造中从10%开始）
      const health = this.world.getComponent<Health>(entityId, ComponentType.HEALTH)
      if (health) {
        health.current = health.max * (0.1 + construction.progress * 0.9)
      }
      
      if (construction.progress >= 1) {
        this.completeConstruction(entityId, construction)
      }
    }
  }
  
  private completeConstruction(entityId: EntityId, construction: Construction): void {
    construction.progress = 1
    construction.state = 'completed'
    
    const health = this.world.getComponent<Health>(entityId, ComponentType.HEALTH)!
    health.current = health.max
    
    // 启用电力组件
    const power = this.world.getComponent<Power>(entityId, ComponentType.POWER)
    if (power) {
      power.active = true
    }
    
    this.eventBus.emit('build:completed', { entityId })
  }
  
  // 开始建造（外部调用）
  startConstruction(entityId: EntityId): void {
    const construction = this.world.getComponent<Construction>(entityId, ComponentType.CONSTRUCTION)
    if (!construction) return
    
    construction.state = 'building'
    construction.progress = 0
    
    this.eventBus.emit('build:started', {
      entityId,
      builderId: construction.builderId,
      cost: construction.cost
    })
  }
}
```

#### 4.2.4 FogOfWarSystem - 战争迷雾系统

```typescript
class FogOfWarSystem extends System {
  private mapWidth: number
  private mapHeight: number
  private fogGrid: Map<string, FogState[][]> = new Map() // playerId -> grid
  
  constructor(world: World, eventBus: EventBus, mapWidth: number, mapHeight: number) {
    super(world, eventBus)
    this.mapWidth = mapWidth
    this.mapHeight = mapHeight
  }
  
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.VISION]
  }
  
  initializePlayer(playerId: string): void {
    const grid: FogState[][] = []
    for (let x = 0; x < this.mapWidth; x++) {
      grid[x] = []
      for (let y = 0; y < this.mapHeight; y++) {
        grid[x][y] = FogState.UNEXPLORED
      }
    }
    this.fogGrid.set(playerId, grid)
  }
  
  update(deltaTime: number): void {
    for (const [playerId, grid] of this.fogGrid) {
      // 1. 将所有可见变为已探索
      for (let x = 0; x < this.mapWidth; x++) {
        for (let y = 0; y < this.mapHeight; y++) {
          if (grid[x][y] === FogState.VISIBLE) {
            grid[x][y] = FogState.EXPLORED
          }
        }
      }
      
      // 2. 计算所有该玩家单位的视野
      const entities = this.getEntities()
      for (const entityId of entities) {
        const owner = this.world.getComponent<Owner>(entityId, ComponentType.OWNER)
        if (!owner || owner.playerId !== playerId) continue
        
        const transform = this.world.getComponent<Transform>(entityId, ComponentType.TRANSFORM)!
        const vision = this.world.getComponent<Vision>(entityId, ComponentType.VISION)!
        
        this.revealArea(grid, transform, vision.range)
      }
    }
  }
  
  private revealArea(grid: FogState[][], transform: Transform, range: number): void {
    const centerX = Math.floor(transform.x)
    const centerY = Math.floor(transform.z)
    const rangeSq = range * range
    
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx * dx + dy * dy > rangeSq) continue
        
        const x = centerX + dx
        const y = centerY + dy
        
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
          grid[x][y] = FogState.VISIBLE
        }
      }
    }
  }
  
  getVisibility(x: number, y: number, playerId: string): FogState {
    return this.fogGrid.get(playerId)?.[x]?.[y] ?? FogState.UNEXPLORED
  }
}
```

#### 4.2.5 EconomySystem - 经济系统

```typescript
class EconomySystem extends System {
  private playerCredits: Map<string, number> = new Map()
  
  getRequiredComponents() {
    return [ComponentType.RESOURCE, ComponentType.TRANSFORM]
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const resource = this.world.getComponent<Resource>(entityId, ComponentType.RESOURCE)!
      
      // 处理采集中的资源
      if (resource.state === 'harvesting') {
        this.processHarvesting(entityId, resource, deltaTime)
      } else if (resource.state === 'unloading') {
        this.processUnloading(entityId, resource)
      }
    }
  }
  
  private processHarvesting(entityId: EntityId, resource: Resource, deltaTime: number): void {
    if (!resource.targetResourceId) return
    
    const oreField = this.world.getComponent<OreField>(resource.targetResourceId, ComponentType.ORE_FIELD)
    if (!oreField || oreField.amount <= 0) {
      resource.state = 'idle'
      resource.targetResourceId = undefined
      return
    }
    
    // 采集速率（每秒）
    const harvestRate = 50 // 每秒采集50单位
    const amount = Math.min(
      harvestRate * deltaTime / 1000,
      oreField.amount,
      resource.capacity - resource.amount
    )
    
    oreField.amount -= amount
    resource.amount += amount
    
    if (resource.amount >= resource.capacity) {
      resource.state = 'idle'
      this.eventBus.emit('economy:harvested', {
        harvesterId: entityId,
        resourceId: resource.targetResourceId,
        amount: resource.amount
      })
    }
  }
  
  private processUnloading(entityId: EntityId, resource: Resource): void {
    if (!resource.targetRefineryId) return
    
    const refinery = this.world.getComponent<Refinery>(resource.targetRefineryId, ComponentType.REFINERY)
    if (!refinery) return
    
    // 转换矿石为资金
    const credits = Math.floor(resource.amount * refinery.conversionRate)
    const owner = this.world.getComponent<Owner>(entityId, ComponentType.OWNER)
    
    if (owner) {
      this.addCredits(owner.playerId, credits)
    }
    
    resource.amount = 0
    resource.state = 'idle'
    
    this.eventBus.emit('economy:refined', {
      refineryId: resource.targetRefineryId,
      playerId: owner?.playerId || '',
      credits
    })
  }
  
  addCredits(playerId: string, amount: number): void {
    const current = this.playerCredits.get(playerId) || 0
    const newAmount = current + amount
    this.playerCredits.set(playerId, newAmount)
    
    this.eventBus.emit('economy:credits_changed', {
      playerId,
      newAmount,
      delta: amount
    })
  }
  
  canAfford(playerId: string, cost: number): boolean {
    return (this.playerCredits.get(playerId) || 0) >= cost
  }
  
  spendCredits(playerId: string, amount: number): boolean {
    if (!this.canAfford(playerId, amount)) return false
    
    this.addCredits(playerId, -amount)
    return true
  }
}
```

### 4.3 服务层设计

#### 4.3.1 PathfindingService - 寻路服务

```typescript
interface PathfindingOptions {
  movementType: MovementType
  entityId?: EntityId
  avoidEntities?: boolean
  maxIterations?: number
}

class PathfindingService {
  private map: GameMap
  private flowFieldCache: Map<string, FlowField> = new Map()
  
  constructor(map: GameMap) {
    this.map = map
  }
  
  // A* 寻路
  findPath(
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number,
    options: PathfindingOptions
  ): PathNode[] {
    // A* 实现...
  }
  
  // 流场寻路（用于大量单位）
  generateFlowField(targetX: number, targetY: number, options: PathfindingOptions): FlowField {
    // Dijkstra 实现...
  }
  
  // 编队寻路
  findFormationPaths(
    units: EntityId[],
    targetCenter: Vector2,
    options: PathfindingOptions
  ): Map<EntityId, PathNode[]> {
    // 保持编队形状的寻路...
  }
}
```

---

## 5. 重构路线图

### 5.1 阶段规划

```
Phase 1: 基础框架搭建 (2-3周)
├── 搭建 ECS 核心框架
│   ├── Entity, Component, System 基类
│   ├── World 管理器
│   └── EventBus 事件总线
├── 创建基础组件定义
│   ├── Transform, Health
│   ├── Movement, Combat
│   └── Owner, Vision
└── 单元测试覆盖

Phase 2: 核心系统迁移 (3-4周)
├── 移动系统重构
│   ├── 迁移寻路逻辑
│   └── 实现 MovementSystem
├── 战斗系统重构
│   ├── 武器组件化
│   └── 实现 CombatSystem
├── 视野系统重构
│   └── 实现 FogOfWarSystem
└── 集成测试

Phase 3: 建筑与经济系统 (2-3周)
├── 建造系统重构
│   ├── ConstructionSystem
│   └── PlacementSystem
├── 经济系统重构
│   ├── EconomySystem
│   └── ResourceSystem
└── 电力系统重构

Phase 4: 科技树与AI (2-3周)
├── 科技系统重构
│   └── TechSystem
├── AI系统重构
│   ├── Behavior Tree
│   └── AISystem
└── 难度测试

Phase 5: 表现层与集成 (2-3周)
├── 渲染系统适配
│   ├── ECS 数据绑定
│   └── 渲染优化
├── 输入系统重构
│   └── Command Pattern
├── UI系统集成
└── 端到端测试

Phase 6: 优化与发布 (1-2周)
├── 性能优化
│   ├── System 性能分析
│   └── 内存优化
├── 存档/读档
├── 网络同步基础
└── 发布准备
```

### 5.2 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|-----|-------|------|---------|
| ECS 性能不如预期 | 中 | 高 | 早期进行性能基准测试；准备回退方案 |
| 重构周期过长 | 高 | 中 | 采用增量重构；保持旧系统并行运行 |
| 多人同步复杂化 | 中 | 高 | 提前设计网络组件；使用确定性模拟 |
| 团队学习成本 | 中 | 中 | 提供详细文档；代码示例；配对编程 |

### 5.3 迁移策略

**增量迁移策略**：

```typescript
// 在重构期间，新旧系统并行
class HybridGameManager {
  private oldGameManager: OldGameManager
  private newWorld: World
  private useNewSystem: boolean = false
  
  constructor() {
    this.oldGameManager = new OldGameManager()
    this.newWorld = new World()
    this.initializeNewSystems()
  }
  
  update(deltaTime: number): void {
    if (this.useNewSystem) {
      this.newWorld.update(deltaTime)
    } else {
      this.oldGameManager.update(deltaTime)
    }
  }
  
  // 逐步切换功能
  enableNewMovementSystem(): void {
    this.newWorld.registerSystem(new MovementSystem(...))
    // 同步旧系统数据到新系统
  }
}
```

---

## 6. 代码示例

### 6.1 创建一个完整的单位

```typescript
// 创建一个灰熊坦克
function createGrizzlyTank(world: World, position: Vector3, playerId: string): EntityId {
  const entity = world.createEntity('UNIT')
  
  // 基础组件
  world.addComponent(entity, ComponentType.TRANSFORM, {
    x: position.x,
    y: position.y,
    z: position.z,
    rotation: 0
  })
  
  world.addComponent(entity, ComponentType.HEALTH, {
    current: 300,
    max: 300,
    armor: 'heavy'
  })
  
  world.addComponent(entity, ComponentType.OWNER, {
    playerId,
    faction: Faction.ALLIES
  })
  
  // 移动组件
  world.addComponent(entity, ComponentType.MOVEMENT, {
    speed: 40,
    turnRate: 90,
    movementType: 'track',
    path: [],
    targetPosition: undefined
  })
  
  // 战斗组件
  world.addComponent(entity, ComponentType.COMBAT, {
    weapons: [{
      config: {
        id: 'grizzlyCannon',
        name: '90mm炮',
        damage: 65,
        range: 5,
        cooldown: 1200,
        damageType: 'armor_piercing'
      },
      cooldownRemaining: 0,
      turretRotation: 0
    }],
    targetEntityId: undefined,
    veterancy: 'rookie',
    kills: 0
  })
  
  // 视野组件
  world.addComponent(entity, ComponentType.VISION, {
    range: 8,
    revealsShroud: true
  })
  
  // 选择组件
  world.addComponent(entity, ComponentType.SELECTABLE, {
    selected: false,
    selectionPriority: 1
  })
  
  // 渲染组件
  world.addComponent(entity, ComponentType.RENDER, {
    modelId: 'grizzly_tank',
    scale: 1,
    tint: 0xFFFFFF
  })
  
  return entity
}
```

### 6.2 处理玩家命令

```typescript
class CommandSystem extends System {
  private inputQueue: Command[] = []
  
  queueCommand(command: Command): void {
    this.inputQueue.push(command)
  }
  
  update(deltaTime: number): void {
    // 处理所有待处理命令
    while (this.inputQueue.length > 0) {
      const command = this.inputQueue.shift()!
      this.executeCommand(command)
    }
  }
  
  private executeCommand(command: Command): void {
    switch (command.type) {
      case 'MOVE':
        this.executeMoveCommand(command as MoveCommand)
        break
      case 'ATTACK':
        this.executeAttackCommand(command as AttackCommand)
        break
      case 'BUILD':
        this.executeBuildCommand(command as BuildCommand)
        break
      case 'PRODUCE':
        this.executeProduceCommand(command as ProduceCommand)
        break
    }
  }
  
  private executeMoveCommand(command: MoveCommand): void {
    for (const entityId of command.entityIds) {
      const movement = this.world.getComponent<Movement>(entityId, ComponentType.MOVEMENT)
      if (movement) {
        movement.targetPosition = command.destination
        movement.path = [] // 清空旧路径，让MovementSystem重新计算
      }
    }
    
    this.eventBus.emit('command:move_executed', {
      entityIds: command.entityIds,
      destination: command.destination
    })
  }
  
  private executeAttackCommand(command: AttackCommand): void {
    for (const entityId of command.entityIds) {
      const combat = this.world.getComponent<Combat>(entityId, ComponentType.COMBAT)
      if (combat) {
        combat.targetEntityId = command.targetId
      }
    }
  }
}
```

### 6.3 建筑放置系统

```typescript
class PlacementSystem extends System {
  private placementGhost?: EntityId
  
  startPlacement(buildingType: string, playerId: string): void {
    // 创建放置幽灵
    this.placementGhost = world.createEntity('GHOST')
    
    const config = buildingConfigs[buildingType]
    
    world.addComponent(this.placementGhost, ComponentType.TRANSFORM, {
      x: 0, y: 0, z: 0, rotation: 0
    })
    
    world.addComponent(this.placementGhost, ComponentType.PLACEMENT, {
      size: { width: config.width, height: config.height },
      valid: false,
      blockedCells: []
    })
    
    world.addComponent(this.placementGhost, ComponentType.RENDER, {
      modelId: buildingType,
      tint: 0x00FF00,
      opacity: 0.5
    })
  }
  
  updatePlacement(position: Vector3): void {
    if (!this.placementGhost) return
    
    const transform = world.getComponent<Transform>(this.placementGhost, ComponentType.TRANSFORM)!
    const placement = world.getComponent<Placement>(this.placementGhost, ComponentType.PLACEMENT)!
    
    // 吸附到网格
    transform.x = Math.floor(position.x)
    transform.z = Math.floor(position.z)
    
    // 验证位置
    this.validatePlacement(this.placementGhost, placement)
  }
  
  private validatePlacement(entityId: EntityId, placement: Placement): void {
    const transform = world.getComponent<Transform>(entityId, ComponentType.TRANSFORM)!
    const render = world.getComponent<Render>(entityId, ComponentType.RENDER)!
    
    placement.blockedCells = []
    let valid = true
    
    // 检查所有占据的格子
    for (let dx = 0; dx < placement.size.width; dx++) {
      for (let dy = 0; dy < placement.size.height; dy++) {
        const x = transform.x + dx
        const z = transform.z + dy
        
        if (!this.isCellBuildable(x, z)) {
          placement.blockedCells.push({ x, y: z })
          valid = false
        }
      }
    }
    
    placement.valid = valid
    render.tint = valid ? 0x00FF00 : 0xFF0000
  }
  
  confirmPlacement(playerId: string, buildingType: string): EntityId | null {
    if (!this.placementGhost) return null
    
    const placement = world.getComponent<Placement>(this.placementGhost, ComponentType.PLACEMENT)!
    if (!placement.valid) return null
    
    const transform = world.getComponent<Transform>(this.placementGhost, ComponentType.TRANSFORM)!
    
    // 销毁幽灵
    world.destroyEntity(this.placementGhost)
    this.placementGhost = undefined
    
    // 创建真实建筑
    return createBuilding(world, buildingType, {
      x: transform.x,
      y: transform.y,
      z: transform.z
    }, playerId)
  }
}
```

### 6.4 简单的行为树AI

```typescript
// 行为树节点
interface BTNode {
  tick(context: AIContext): BTStatus
}

type BTStatus = 'SUCCESS' | 'FAILURE' | 'RUNNING'

// 选择器：依次执行子节点，直到有一个成功
class Selector implements BTNode {
  constructor(private children: BTNode[]) {}
  
  tick(context: AIContext): BTStatus {
    for (const child of this.children) {
      const status = child.tick(context)
      if (status !== 'FAILURE') {
        return status
      }
    }
    return 'FAILURE'
  }
}

// 序列：依次执行子节点，直到有一个失败
class Sequence implements BTNode {
  constructor(private children: BTNode[]) {}
  
  tick(context: AIContext): BTStatus {
    for (const child of this.children) {
      const status = child.tick(context)
      if (status !== 'SUCCESS') {
        return status
      }
    }
    return 'SUCCESS'
  }
}

// 条件节点
class Condition implements BTNode {
  constructor(private predicate: (ctx: AIContext) => boolean) {}
  
  tick(context: AIContext): BTStatus {
    return this.predicate(context) ? 'SUCCESS' : 'FAILURE'
  }
}

// 行动节点
class Action implements BTNode {
  constructor(private action: (ctx: AIContext) => BTStatus) {}
  
  tick(context: AIContext): BTStatus {
    return this.action(context)
  }
}

// AI上下文
interface AIContext {
  entityId: EntityId
  world: World
  eventBus: EventBus
  memory: Map<string, any>
}

// 采矿车AI行为树
function createHarvesterAI(): BTNode {
  return new Selector([
    // 如果满载，去卸货
    new Sequence([
      new Condition(ctx => isFull(ctx.entityId, ctx.world)),
      new Action(ctx => moveToRefinery(ctx))
    ]),
    // 如果空载，去采矿
    new Sequence([
      new Condition(ctx => isEmpty(ctx.entityId, ctx.world)),
      new Action(ctx => moveToOreField(ctx))
    ]),
    // 正在采矿中
    new Action(ctx => continueHarvesting(ctx))
  ])
}
```

---

## 附录

### A. 组件清单

| 组件 | 用途 | 关键字段 |
|-----|------|---------|
| Transform | 位置与旋转 | x, y, z, rotation |
| Health | 生命值 | current, max, armor |
| Movement | 移动能力 | speed, turnRate, path |
| Combat | 战斗能力 | weapons, target, veterancy |
| Vision | 视野 | range, revealsShroud |
| Owner | 所属玩家 | playerId, faction |
| Construction | 建造状态 | progress, buildTime, state |
| Production | 生产队列 | queue, current, progress |
| Power | 电力 | consumption, production |
| Resource | 资源携带 | amount, capacity, type |
| Harvester | 采集状态 | state, targetResource |
| Refinery | 精炼厂 | conversionRate, queue |
| Placement | 放置验证 | size, valid, blockedCells |
| Selectable | 可被选择 | selected, priority |
| Render | 渲染信息 | modelId, tint, scale |
| Audio | 音频 | sounds, volume |

### B. 系统清单

| 系统 | 处理组件 | 频率 |
|-----|---------|------|
| MovementSystem | Transform, Movement | 每帧 |
| CombatSystem | Transform, Combat | 每帧 |
| ConstructionSystem | Construction | 每帧 |
| ProductionSystem | Production | 每帧 |
| EconomySystem | Resource, Harvester | 每帧 |
| PowerSystem | Power | 每秒 |
| FogOfWarSystem | Transform, Vision | 每帧/事件驱动 |
| TechSystem | - | 事件驱动 |
| CommandSystem | - | 事件驱动 |
| AISystem | - | 每100ms |

### C. 事件清单

见 [3.4 事件系统设计](#34-事件系统设计)

---

**文档结束**
