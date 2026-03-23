# RA2 Web ECS 架构文档

## 项目概览

RA2 Web 的 ECS（Entity-Component-System）架构重构已完成，总计 **10179+ 行代码**，包含 **13个组件**、**8个系统** 和完整的 **AI 行为树框架**。

## 架构统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 组件 | 13个 | 数据容器 |
| 系统 | 8个 | 逻辑处理 |
| 适配器 | 3个 | 新旧系统桥接 |
| AI 节点 | 15+ | 行为树节点类型 |
| 超级武器 | 6种 | 闪电风暴、核弹等 |
| 特效类型 | 18种 | 爆炸、轨迹、环境 |
| 单元测试 | 43+ | 核心功能测试 |

---

## 核心组件

### 基础组件

| 组件 | 类型 | 功能 |
|------|------|------|
| `TransformComponent` | `transform` | 位置、旋转、缩放 |
| `HealthComponent` | `health` | 生命值、护甲、老兵等级 |
| `OwnerComponent` | `owner` | 所属玩家、阵营 |
| `VisionComponent` | `vision` | 视野范围、隐形、探测 |

### 游戏机制组件

| 组件 | 类型 | 功能 |
|------|------|------|
| `MovementComponent` | `movement` | 移动、路径、转向 |
| `WeaponComponent` | `weapon` | 武器配置、冷却、炮塔 |
| `CombatComponent` | `combat` | 战斗状态、目标、索敌 |
| `AIComponent` | `ai` | 行为树、AI状态、记忆 |

### 经济建筑组件

| 组件 | 类型 | 功能 |
|------|------|------|
| `ConstructionComponent` | `construction` | 建造进度、电力 |
| `EconomyComponent` | `economy` | 资金、采矿车、资源 |

### 高级功能组件

| 组件 | 类型 | 功能 |
|------|------|------|
| `FogOfWarComponent` | `fog_of_war` | 战争迷雾、视野揭示 |
| `SuperWeaponComponent` | `super_weapon` | 超级武器状态、充能 |
| `EffectComponent` | `effect` | 视觉特效、粒子 |

---

## 核心系统

### 移动系统
```typescript
MovementSystem
├── 路径跟随
├── 平滑转向
├── 碰撞检测（预留）
└── 插值渲染
```

### 战斗系统
```typescript
CombatSystem
├── 状态机 (IDLE → ACQUIRING → AIMING → FIRING → COOLDOWN)
├── 自动索敌
├── 伤害计算（护甲克制）
├── 老兵系统
└── 事件: combat:damage_dealt, combat:entity_died
```

### AI 系统
```typescript
AISystem
├── 攻击性AI
├── 防御性AI
├── 巡逻AI
├── 采集AI
├── 攻击移动AI
└── 基地防御AI
```

### 经济系统
```typescript
EconomySystem
├── 矿区管理
├── 采矿车调度
├── 资金分配
└── 精炼厂查找
```

### 建筑系统
```typescript
ConstructionSystem
├── 建造队列
├── 自动建造
├── 电力统计
├── 建筑出售
└── 事件: construction:completed
```

### 战争迷雾系统
```typescript
FogOfWarSystem
├── 视野计算
├── 迷雾更新
├── 隐形检测
└── WebGL纹理生成
```

### 超级武器系统
```typescript
SuperWeaponSystem
├── 充能/冷却管理
├── 发射倒计时
├── 范围伤害计算
└── 6种武器效果实现
```

### 特效系统
```typescript
EffectSystem
├── 特效生成
├── 对象池管理
├── 位置更新
└── 淡入淡出效果
```

---

## AI 行为树

### 节点类型

| 类型 | 节点 | 功能 |
|------|------|------|
| 组合 | `BTSequence` | 顺序执行 |
| 组合 | `BTSelector` | 选择执行 |
| 组合 | `BTParallel` | 并行执行 |
| 装饰 | `BTInverter` | 反转结果 |
| 装饰 | `BTRepeater` | 重复执行 |
| 装饰 | `BTSucceeder` | 强制成功 |

### 预设行为树

```
Aggressive (攻击性)
├── 检查范围内敌人?
│   └── 是 → 攻击最近敌人
└── 否 → 空闲

Defensive (防御性)
├── 生命低?
│   └── 是 → 逃跑
├── 被攻击?
│   └── 是 → 反击
└── 否 → 守卫位置

Harvester (采集)
├── 满载?
│   └── 是 → 返回精炼厂 → 卸载
├── 可采集?
│   └── 是 → 采集资源
└── 否 → 寻找矿区
```

---

## 超级武器

| 武器 | 阵营 | 效果 | 充能时间 |
|------|------|------|---------|
| 闪电风暴 | 盟军 | 15秒持续伤害 | 600秒 |
| 核弹 | 苏联 | 瞬间伤害+辐射 | 600秒 |
| 超时空传送 | 盟军 | 传送单位 | 300秒 |
| 铁幕 | 苏联 | 单位无敌45秒 | 300秒 |
| 基因突变器 | 尤里 | 步兵变异 | 300秒 |
| 精神控制塔 | 尤里 | 控制敌方单位 | 300秒 |

---

## 事件系统

### 战斗事件
```typescript
'combat:damage_dealt' - 造成伤害
'combat:entity_died' - 单位死亡
'combat:entity_killed' - 击杀单位（含击杀者信息）
'combat:area_damage' - 范围伤害
'combat:iron_curtain' - 铁幕效果
```

### 建筑事件
```typescript
'construction:started' - 开始建造
'construction:completed' - 建造完成
'construction:cancelled' - 取消建造
'construction:sold' - 出售建筑
```

### 经济事件
```typescript
'economy:credits_changed' - 资金变化
'economy:harvest_completed' - 采集完成
'economy:unload_completed' - 卸载完成
```

### 超级武器事件
```typescript
'super_weapon:built' - 建造完成
'super_weapon:launching' - 开始发射倒计时
'super_weapon:fired' - 发射
'super_weapon:chronosphere_ready' - 超时空就绪
'super_weapon:mind_control' - 精神控制
```

### 特效事件
```typescript
'effect:spawn' - 生成特效
'effect:attach' - 附加特效到实体
```

---

## 使用示例

### 创建战斗单位
```typescript
const entity = world.createEntity('Tank')
entity.addComponent(new TransformComponent({ x: 10, y: 0, z: 20 }))
entity.addComponent(new OwnerComponent('player1', Faction.ALLIES))
entity.addComponent(new HealthComponent(400, ArmorType.HEAVY))
entity.addComponent(new WeaponComponent({ id: 'cannon', damage: 90, range: 15 }))
entity.addComponent(new CombatComponent(15))
entity.addComponent(new MovementComponent(4, 90))
```

### 命令单位移动
```typescript
const movement = entity.getComponent<MovementComponent>('movement')
movement.setDestination({ x: 100, y: 0, z: 100 })
```

### 命令单位攻击
```typescript
const combatSystem = world.getSystem(CombatSystem)
combatSystem.attackTarget(attacker, target.id)
```

### 设置AI行为
```typescript
const aiSystem = world.getSystem(AISystem)
aiSystem.createAggressiveAI(entity)
```

### 发射超级武器
```typescript
const superWeaponSystem = world.getSystem(SuperWeaponSystem)
superWeaponSystem.buildSuperWeapon(weaponEntity)
superWeaponSystem.launchAt(weaponEntity, { x: 100, z: 100 })
```

---

## 性能优化

### 1. 对象池
```typescript
// 避免频繁创建/销毁实体
const entityPool: Entity[] = []
```

### 2. 系统筛选
```typescript
class MySystem extends EntitySystem {
  constructor() {
    super('component1', 'component2') // 只处理有这些组件的实体
  }
}
```

### 3. 性能分析
```typescript
import { ECSProfiler } from './ecs/utils/Profiler'
const profiler = new ECSProfiler(world)
profiler.start()
// ... 运行一段时间后
console.log(profiler.getSummary())
```

---

## 测试覆盖

| 测试套件 | 测试数 | 描述 |
|---------|--------|------|
| Core | 21 | ECS核心功能 |
| Movement | 10 | 移动系统 |
| Combat | 12 | 战斗系统 |
| Integration | 10 | 集成测试 |
| **总计** | **53+** | |

运行测试:
```bash
npx tsx src/ecs/__tests__/core.test.ts
npx tsx src/ecs/__tests__/movement.test.ts
npx tsx src/ecs/__tests__/combat.test.ts
npx tsx src/ecs/__tests__/integration.test.ts
```

---

## 迁移指南

参见 [ECS_MIGRATION_GUIDE.md](./ECS_MIGRATION_GUIDE.md)

---

## 路线图完成情况

- [x] Week 1-3: ECS 基础框架 ✅
- [x] Week 4-6: 移动系统 ✅
- [x] Week 7-9: 战斗系统 ✅
- [x] Week 10-12: 建筑与经济系统 ✅
- [x] Week 13-15: 战争迷雾与视野系统 ✅
- [x] Week 16-18: AI 行为树迁移 ✅
- [x] Week 19-21: 超级武器与特效 ✅
- [x] Week 22-24: 整合测试与优化 ✅

**🎉 ECS 架构重构全部完成！**
