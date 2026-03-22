# 红警2 Web版 - 功能完善计划

## 当前实现 vs 完整功能对比

### ✅ 已实现
- [x] 项目基础架构 (Vite + React + TS)
- [x] MIX文件解析器
- [x] SHP文件解析器 (基础)
- [x] VXL/HVA解析器 (基础)
- [x] 虚拟文件系统
- [x] 资源管理器
- [x] 基础Three.js渲染框架
- [x] 文件导入UI
- [x] 主菜单界面

### 🚧 待实现的核心功能

---

## 一、渲染系统 (engine/gfx)

### 1.1 SHP精灵渲染器
```typescript
// 需要实现
export class ShpRenderer {
  // 将SHP帧转换为Three.js纹理
  createTexture(frame: ShpFrame, palette: Palette): THREE.Texture
  
  // 批量渲染单位动画
  renderUnit(unit: Unit, deltaTime: number): void
  
  // 处理朝向和动画状态
  updateAnimation(unit: Unit, state: AnimationState): void
}
```

**复杂度**: ⭐⭐⭐⭐  
**预计工时**: 3-4天

### 1.2 VXL体素渲染器
```typescript
export class VxlRenderer {
  // 将VXL转换为Three.js Mesh
  createVoxelMesh(model: VxlModel): THREE.InstancedMesh
  
  // 应用HVA动画
  applyAnimation(mesh: THREE.Mesh, hva: HvaAnimation, frame: number): void
  
  // 处理炮塔旋转
  updateTurretRotation(unit: Unit, target: Vector3): void
}
```

**复杂度**: ⭐⭐⭐⭐⭐  
**预计工时**: 5-7天

### 1.3 TMP地形渲染器
```typescript
export class TmpRenderer {
  // 渲染地图单元格
  renderCell(cell: MapCell, x: number, y: number): void
  
  // 处理地形过渡（草地到水面等）
  renderTransitions(map: GameMap): void
  
  // 渲染悬崖、斜坡
  renderCliffs(map: GameMap): void
}
```

**复杂度**: ⭐⭐⭐⭐  
**预计工时**: 3-4天

### 1.4 战争迷雾
```typescript
export class FogOfWar {
  // 迷雾纹理更新
  updateFogTexture(visibleCells: Set<MapCell>): void
  
  // 遮罩渲染
  renderFogOverlay(): void
  
  // 已探索区域（灰色显示）
  renderShroud(): void
}
```

**复杂度**: ⭐⭐⭐  
**预计工时**: 2-3天

---

## 二、游戏逻辑系统 (game/)

### 2.1 单位系统 (game/units)
```typescript
// 单位基类
export abstract class Unit extends GameObject {
  abstract type: UnitType
  abstract faction: Faction
  
  // 状态
  health: number
  maxHealth: number
  veterancy: VeterancyLevel
  
  // 移动
  currentPath: PathNode[]
  speed: number
  rotationSpeed: number
  
  // 攻击
  weapon?: Weapon
  target?: GameObject
  cooldown: number
  
  // 方法
  moveTo(destination: Vector3): void
  attack(target: GameObject): void
  stop(): void
  guard(): void
  takeDamage(damage: number, attacker: GameObject): void
}

// 具体单位实现
export class GrizzlyTank extends Unit {
  type = UnitType.VEHICLE
  faction = Faction.ALLIES
  // ...
}
```

**需要实现的单位类型**:
- 步兵: 动员兵、美国大兵、工程师、间谍等 (约20种)
- 载具: 灰熊、犀牛、天启、V3火箭等 (约30种)
- 空军: 入侵者战机、基洛夫飞艇等 (约10种)
- 海军: 驱逐舰、潜艇、航母等 (约10种)

**复杂度**: ⭐⭐⭐⭐⭐  
**预计工时**: 10-14天

### 2.2 建筑系统 (game/buildings)
```typescript
export abstract class Building extends GameObject {
  abstract type: BuildingType
  
  // 建造状态
  constructionProgress: number
  constructionTime: number
  
  // 功能
  powerConsumption: number
  powerProduction: number
  
  // 生产队列
  productionQueue: ProducibleItem[]
  
  // 方法
  startConstruction(): void
  completeConstruction(): void
  sell(): void
  repair(): void
  addToQueue(item: ProducibleItem): void
  cancelFromQueue(index: number): void
}
```

**需要实现的建筑**:
- 基地建筑: 建造厂、电厂、矿厂、兵营等 (约15种)
- 防御建筑: 机枪碉堡、光棱塔、爱国者等 (约10种)
- 超级武器: 核弹、闪电风暴、超时空传送 (3种)

**复杂度**: ⭐⭐⭐⭐  
**预计工时**: 7-10天

### 2.3 经济系统 (game/economy)
```typescript
export class EconomySystem {
  // 玩家资金
  credits: Map<Player, number>
  
  // 矿石管理
  oreFields: OreField[]
  miners: OreMiner[]
  
  // 方法
  addCredits(player: Player, amount: number): void
  spendCredits(player: Player, amount: number): boolean
  
  // 采矿逻辑
  findNearestOreField(miner: OreMiner): OreField
  processMiningCycle(): void
}
```

**复杂度**: ⭐⭐⭐  
**预计工时**: 2-3天

### 2.4 科技树 (game/tech)
```typescript
export class TechTree {
  // 解锁条件检查
  canBuild(player: Player, item: TechItem): boolean
  
  // 依赖关系
  getPrerequisites(item: TechItem): TechItem[]
  
  // 阵营专属
  isFactionRestricted(item: TechItem, faction: Faction): boolean
}
```

**复杂度**: ⭐⭐⭐  
**预计工时**: 2-3天

### 2.5 路径寻路 (game/pathfinding)
```typescript
export class Pathfinder {
  // A*寻路
  findPath(start: Vector3, end: Vector3, unit: Unit): PathNode[]
  
  // 障碍物避让
  avoidObstacles(path: PathNode[], obstacles: GameObject[]): PathNode[]
  
  // 群体移动
  calculateFormation(units: Unit[], destination: Vector3): Map<Unit, Vector3>
}
```

**复杂度**: ⭐⭐⭐⭐  
**预计工时**: 3-4天

---

## 三、输入控制系统 (game/input)

### 3.1 鼠标输入处理
```typescript
export class InputManager {
  // 选择
  handleLeftClick(position: Vector2, modifiers: Modifiers): void
  handleLeftDrag(start: Vector2, end: Vector2): void
  
  // 移动/攻击
  handleRightClick(position: Vector2): void
  
  // 快捷键
  handleKeyDown(key: string, modifiers: Modifiers): void
  
  // 相机控制
  handleScroll(delta: number): void
  handleMiddleDrag(delta: Vector2): void
}
```

**需要实现的操作**:
- [ ] 左键单击选择
- [ ] 左键拖拽框选
- [ ] Ctrl+点击添加选择
- [ ] 右键移动
- [ ] A键攻击移动
- [ ] H键驻守
- [ ] D键部署
- [ ] 数字键编队

**复杂度**: ⭐⭐⭐  
**预计工时**: 3-4天

---

## 四、音频系统 (engine/sound)

### 4.1 音频管理器
```typescript
export class AudioSystem {
  // 音量控制
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  
  // 播放
  playSound(soundId: string, position?: Vector3): void
  playTheme(themeId: string): void
  
  // 单位语音
  playUnitVoice(unit: Unit, voiceType: VoiceType): void
  
  // 背景音乐
  playRandomTrack(): void
}
```

**复杂度**: ⭐⭐⭐  
**预计工时**: 2-3天

---

## 五、AI系统 (game/ai)

### 5.1 AI控制器
```typescript
export class AIController {
  // 难度级别
  difficulty: AIDifficulty
  
  // 行为树
  behaviorTree: BehaviorTree
  
  // 决策循环
  update(deltaTime: number): void
  
  // 具体行为
  manageEconomy(): void
  buildBase(): void
  trainUnits(): void
  attackEnemy(): void
  defendBase(): void
}
```

**AI难度级别**:
- 简单: 基础建筑，少量进攻
- 中等: 完整经济，定期进攻
- 冷酷: 优化建造，持续压力，微操

**复杂度**: ⭐⭐⭐⭐⭐  
**预计工时**: 7-14天

---

## 六、网络系统 (network/)

### 6.1 多人对战
```typescript
export class NetworkManager {
  // 连接
  connect(serverUrl: string): Promise<void>
  disconnect(): void
  
  // 房间
  createRoom(config: GameConfig): Promise<Room>
  joinRoom(roomId: string): Promise<void>
  
  // 同步
  sendCommand(command: GameCommand): void
  receiveCommand(command: GameCommand): void
  
  // 帧同步
  lockstepFrame(frame: number): void
}
```

**复杂度**: ⭐⭐⭐⭐⭐  
**预计工时**: 14-21天

---

## 七、UI系统 (gui/)

### 7.1 游戏界面
```typescript
// 需要实现的UI组件
export class GameUI {
  // 侧边栏
  sidebar: Sidebar
  
  // 雷达
  radar: RadarMap
  
  // 资源显示
  resourceDisplay: ResourceDisplay
  
  // 选中单位信息
  selectionPanel: SelectionPanel
  
  // 建造菜单
  buildMenu: BuildMenu
  
  // 聊天框
  chatBox: ChatBox
}
```

**需要实现的界面**:
- [ ] 侧边栏建造菜单
- [ ] 雷达小地图
- [ ] 资金/电力显示
- [ ] 选中单位状态面板
- [ ] 任务提示面板
- [ ] 游戏菜单（暂停、设置、退出）

**复杂度**: ⭐⭐⭐⭐  
**预计工时**: 5-7天

---

## 八、地图系统 (game/map)

### 8.1 地图解析
```typescript
export class MapParser {
  // 解析MAP/INI格式
  parseMapFile(data: Uint8Array): GameMap
  
  // 加载地形
  loadTerrain(map: GameMap): void
  
  // 放置初始单位
  placeStartingUnits(map: GameMap, players: Player[]): void
}
```

**复杂度**: ⭐⭐⭐⭐  
**预计工时**: 3-4天

---

## 九、战役系统 (game/campaign)

### 9.1 任务系统
```typescript
export class MissionSystem {
  // 任务目标
  objectives: MissionObjective[]
  
  // 触发器
  triggers: Trigger[]
  
  // 过场动画
  playCutscene(id: string): void
  
  // 任务完成检查
  checkObjectives(): void
}
```

**复杂度**: ⭐⭐⭐⭐⭐  
**预计工时**: 7-14天

---

## 总估算

| 模块 | 复杂度 | 预计工时 |
|------|--------|----------|
| 渲染系统 | ⭐⭐⭐⭐ | 15-20天 |
| 游戏逻辑 | ⭐⭐⭐⭐⭐ | 30-40天 |
| 输入控制 | ⭐⭐⭐ | 3-4天 |
| 音频系统 | ⭐⭐⭐ | 2-3天 |
| AI系统 | ⭐⭐⭐⭐⭐ | 7-14天 |
| 网络系统 | ⭐⭐⭐⭐⭐ | 14-21天 |
| UI系统 | ⭐⭐⭐⭐ | 5-7天 |
| 地图系统 | ⭐⭐⭐⭐ | 3-4天 |
| 战役系统 | ⭐⭐⭐⭐⭐ | 7-14天 |
| **总计** | | **~90-130天** |

---

## 建议的开发优先级

### 阶段1: 核心可玩 (4-6周)
1. 完整的单位移动和攻击
2. 基础建筑建造
3. 经济系统（采矿）
4. 战争迷雾
5. 基础AI（简单敌人）

### 阶段2: 完整功能 (6-8周)
1. 所有单位和建筑
2. 科技树
3. 超级武器
4. 地图系统
5. 完整AI

### 阶段3: 多人对战 (4-6周)
1. 网络同步
2. 房间系统
3. 观战模式
4. 回放系统

### 阶段4: 战役模式 (3-4周)
1. 任务系统
2. 触发器
3. 过场动画支持

---

## 你想优先实现哪个模块？

我可以帮你详细实现其中任何一个模块的具体代码。
