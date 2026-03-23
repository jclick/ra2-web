/**
 * 核心ECS框架 - 组件定义
 * 
 * 组件是纯数据结构，不包含任何方法
 */

// 组件类型枚举 - 用于快速查找
export enum ComponentType {
  TRANSFORM = 'transform',
  HEALTH = 'health',
  MOVEMENT = 'movement',
  COMBAT = 'combat',
  VISION = 'vision',
  OWNER = 'owner',
  CONSTRUCTION = 'construction',
  PRODUCTION = 'production',
  POWER = 'power',
  RESOURCE = 'resource',
  HARVESTER = 'harvester',
  REFINERY = 'refinery',
  PLACEMENT = 'placement',
  SELECTABLE = 'selectable',
  RENDER = 'render',
  AUDIO = 'audio',
  ORE_FIELD = 'ore_field'
}

// 基础组件接口
export interface Component {
  readonly type: ComponentType
}

// ============================================
// Transform 组件 - 位置与旋转
// ============================================
export interface Transform extends Component {
  type: ComponentType.TRANSFORM
  x: number
  y: number
  z: number
  rotation: number  // 弧度
}

export function createTransform(x = 0, y = 0, z = 0, rotation = 0): Transform {
  return { type: ComponentType.TRANSFORM, x, y, z, rotation }
}

// ============================================
// Health 组件 - 生命值
// ============================================
export type ArmorType = 'none' | 'flak' | 'plate' | 'heavy' | 'concrete'

export interface Health extends Component {
  type: ComponentType.HEALTH
  current: number
  max: number
  armor: ArmorType
}

export function createHealth(max: number, armor: ArmorType = 'none'): Health {
  return { type: ComponentType.HEALTH, current: max, max, armor }
}

// ============================================
// Movement 组件 - 移动能力
// ============================================
export type MovementType = 'foot' | 'track' | 'wheel' | 'hover' | 'fly'

export interface PathNode {
  x: number
  y: number
  g?: number
  h?: number
  f?: number
}

export interface Movement extends Component {
  type: ComponentType.MOVEMENT
  speed: number           // 单位/秒
  turnRate: number        // 度/秒
  movementType: MovementType
  path: PathNode[]
  targetPosition?: { x: number; y: number; z: number }
  isMoving: boolean
}

export function createMovement(
  speed: number,
  turnRate: number,
  movementType: MovementType
): Movement {
  return {
    type: ComponentType.MOVEMENT,
    speed,
    turnRate,
    movementType,
    path: [],
    isMoving: false
  }
}

// ============================================
// Combat 组件 - 战斗能力
// ============================================
export interface WeaponConfig {
  id: string
  name: string
  damage: number
  range: number
  cooldown: number        // 毫秒
  damageType: string
  isTurret: boolean
  turretRotationSpeed?: number
}

export interface WeaponInstance {
  config: WeaponConfig
  cooldownRemaining: number
  turretRotation: number
}

export type VeterancyLevel = 'rookie' | 'veteran' | 'elite' | 'heroic'

export interface Combat extends Component {
  type: ComponentType.COMBAT
  weapons: WeaponInstance[]
  targetEntityId?: string
  veterancy: VeterancyLevel
  kills: number
  isAttacking: boolean
}

export function createCombat(weapons: WeaponConfig[]): Combat {
  return {
    type: ComponentType.COMBAT,
    weapons: weapons.map(w => ({
      config: w,
      cooldownRemaining: 0,
      turretRotation: 0
    })),
    veterancy: 'rookie',
    kills: 0,
    isAttacking: false
  }
}

// ============================================
// Vision 组件 - 视野
// ============================================
export interface Vision extends Component {
  type: ComponentType.VISION
  range: number
  revealsShroud: boolean
}

export function createVision(range: number, revealsShroud = true): Vision {
  return { type: ComponentType.VISION, range, revealsShroud }
}

// ============================================
// Owner 组件 - 所属玩家
// ============================================
export enum Faction {
  ALLIES = 'Allies',
  SOVIET = 'Soviet',
  YURI = 'Yuri'
}

export interface Owner extends Component {
  type: ComponentType.OWNER
  playerId: string
  faction: Faction
}

export function createOwner(playerId: string, faction: Faction): Owner {
  return { type: ComponentType.OWNER, playerId, faction }
}

// ============================================
// Construction 组件 - 建造状态
// ============================================
export interface Construction extends Component {
  type: ComponentType.CONSTRUCTION
  state: 'placement' | 'building' | 'completed'
  progress: number       // 0-1
  buildTime: number      // 毫秒
  cost: number
  builderId?: string
}

export function createConstruction(cost: number, buildTime: number): Construction {
  return {
    type: ComponentType.CONSTRUCTION,
    state: 'placement',
    progress: 0,
    buildTime,
    cost
  }
}

// ============================================
// Production 组件 - 生产队列
// ============================================
export interface ProductionItem {
  id: string
  name: string
  buildTime: number
  cost: number
  type: string
}

export interface Production extends Component {
  type: ComponentType.PRODUCTION
  queue: ProductionItem[]
  current?: ProductionItem
  progress: number
  rallyPoint?: { x: number; y: number; z: number }
  isProducing: boolean
}

export function createProduction(): Production {
  return {
    type: ComponentType.PRODUCTION,
    queue: [],
    progress: 0,
    isProducing: false
  }
}

// ============================================
// Power 组件 - 电力
// ============================================
export interface Power extends Component {
  type: ComponentType.POWER
  consumption: number
  production: number
  active: boolean
}

export function createPower(consumption = 0, production = 0): Power {
  return {
    type: ComponentType.POWER,
    consumption,
    production,
    active: true
  }
}

// ============================================
// Resource 组件 - 资源携带
// ============================================
export enum ResourceType {
  ORE = 'ore',
  GEMS = 'gems'
}

export interface Resource extends Component {
  type: ComponentType.RESOURCE
  amount: number
  capacity: number
  type: ResourceType
  state: 'idle' | 'harvesting' | 'moving_to_resource' | 'moving_to_refinery' | 'unloading'
  targetResourceId?: string
  targetRefineryId?: string
}

export function createResource(capacity: number, type: ResourceType = ResourceType.ORE): Resource {
  return {
    type: ComponentType.RESOURCE,
    amount: 0,
    capacity,
    type,
    state: 'idle'
  }
}

// ============================================
// OreField 组件 - 矿石矿场
// ============================================
export interface OreField extends Component {
  type: ComponentType.ORE_FIELD
  amount: number
  maxAmount: number
  resourceType: ResourceType
  regenRate: number
}

export function createOreField(amount: number, type: ResourceType = ResourceType.ORE): OreField {
  return {
    type: ComponentType.ORE_FIELD,
    amount,
    maxAmount: amount,
    resourceType: type,
    regenRate: 0
  }
}

// ============================================
// Placement 组件 - 放置验证
// ============================================
export interface Placement extends Component {
  type: ComponentType.PLACEMENT
  size: { width: number; height: number }
  valid: boolean
  blockedCells: { x: number; y: number }[]
}

export function createPlacement(width: number, height: number): Placement {
  return {
    type: ComponentType.PLACEMENT,
    size: { width, height },
    valid: false,
    blockedCells: []
  }
}

// ============================================
// Selectable 组件 - 可被选择
// ============================================
export interface Selectable extends Component {
  type: ComponentType.SELECTABLE
  selected: boolean
  priority: number
}

export function createSelectable(priority = 1): Selectable {
  return { type: ComponentType.SELECTABLE, selected: false, priority }
}

// ============================================
// Render 组件 - 渲染信息
// ============================================
export interface Render extends Component {
  type: ComponentType.RENDER
  modelId: string
  tint: number
  scale: number
  opacity: number
}

export function createRender(modelId: string, tint = 0xFFFFFF, scale = 1): Render {
  return { type: ComponentType.RENDER, modelId, tint, scale, opacity: 1 }
}
