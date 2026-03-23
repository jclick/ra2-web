/**
 * ECS 组件库
 * 
 * Week 2: 基础组件定义
 */

// Transform - 位置、旋转、缩放
export {
  TransformComponent,
  TRANSFORM_TYPE
} from './TransformComponent'

// Health - 生命值、护甲、老兵等级
export {
  HealthComponent,
  HEALTH_TYPE,
  ArmorType,
  VeterancyLevel
} from './HealthComponent'

// Owner - 所属玩家、阵营
export {
  OwnerComponent,
  OWNER_TYPE,
  Faction,
  Relationship
} from './OwnerComponent'

// Vision - 视野、隐形、探测
export {
  VisionComponent,
  VISION_TYPE
} from './VisionComponent'

// Render - 渲染信息
export {
  RenderComponent,
  RENDER_TYPE,
  RenderType,
  RenderLayer
} from './RenderComponent'

// SuperWeapon - 超级武器组件
export {
  SuperWeaponComponent,
  SUPER_WEAPON_TYPE,
  SuperWeaponType,
  SuperWeaponState,
  SUPER_WEAPON_CONFIGS
} from './SuperWeaponComponent'
export type { SuperWeaponConfig } from './SuperWeaponComponent'

// Effect - 特效组件
export {
  EffectComponent,
  EFFECT_TYPE,
  EffectType,
  EFFECT_CONFIGS
} from './EffectComponent'
export type { EffectConfig } from './EffectComponent'

// FogOfWar - 战争迷雾组件
export {
  FogOfWarComponent,
  FOG_OF_WAR_TYPE,
  FogCellState
} from './FogOfWarComponent'
export type { FogLayer } from './FogOfWarComponent'

// AI - AI行为树组件
export {
  AIComponent,
  AI_TYPE,
  AIBehaviorType,
  AIState
} from './AIComponent'

// Movement - 移动组件
export {
  MovementComponent,
  MOVEMENT_TYPE,
  MovementType,
  MovementState
} from './MovementComponent'

// Weapon - 武器组件
export {
  WeaponComponent,
  WEAPON_TYPE,
  WeaponInstance,
  DamageType,
  ProjectileType
} from './WeaponComponent'
export type { WeaponConfig } from './WeaponComponent'

// Combat - 战斗组件
export {
  CombatComponent,
  COMBAT_TYPE,
  CombatState,
  TargetPriority,
  TargetType
} from './CombatComponent'

// Construction - 建造组件
export {
  ConstructionComponent,
  CONSTRUCTION_TYPE,
  ConstructionState,
  BuildingCategory
} from './ConstructionComponent'

// Economy - 经济组件
export {
  EconomyComponent,
  ECONOMY_TYPE,
  ResourceType,
  HarvesterState
} from './EconomyComponent'
