/**
 * 游戏类型定义
 */

// 阵营类型
export enum Faction {
  ALLIES = 'Allies',
  SOVIET = 'Soviet',
  YURI = 'Yuri',
}

// 单位类型
export enum UnitType {
  INFANTRY = 'Infantry',
  VEHICLE = 'Vehicle',
  AIRCRAFT = 'Aircraft',
  NAVAL = 'Naval',
  BUILDING = 'Building',
}

// 单位状态
export enum UnitState {
  IDLE = 'idle',
  MOVING = 'moving',
  ATTACKING = 'attacking',
  BUILDING = 'building',
  HARVESTING = 'harvesting',
  GUARDING = 'guarding',
  DEPLOYING = 'deploying',
  UNLOADING = 'unloading',
  DYING = 'dying',
}

// 建筑状态
export enum BuildingState {
  CONSTRUCTION = 'construction',
  IDLE = 'idle',
  PRODUCING = 'producing',
  SELLING = 'selling',
  POWER_DOWN = 'power_down',
}

// 建造类型
export enum BuildCategory {
  INFANTRY = 'infantry',
  VEHICLES = 'vehicles',
  AIRCRAFT = 'aircraft',
  NAVAL = 'naval',
  BUILDINGS = 'buildings',
  DEFENSES = 'defenses',
}

// 老兵等级
export enum VeterancyLevel {
  ROOKIE = 0,
  VETERAN = 1,
  ELITE = 2,
  HEROIC = 3,
}

// 游戏对象基础接口
export interface GameObject {
  id: string
  faction: Faction
  position: Vector3
  rotation: number
  health: number
  maxHealth: number
  selected: boolean
}

// 建筑接口
export interface Building extends GameObject {
  buildingType: BuildingType
  state: BuildingState
  constructionProgress: number
  constructionTime: number
  powerConsumption: number
  powerProduction: number
  canProduce: boolean
  productionQueue: ProducibleItem[]
}

// 建筑类型
export enum BuildingType {
  // 基地
  CONSTRUCTION_YARD = 'construction_yard',
  // 电力
  POWER_PLANT = 'power_plant',
  ADVANCED_POWER = 'advanced_power',
  // 矿场
  ORE_REFINERY = 'ore_refinery',
  // 兵营
  BARRACKS = 'barracks',
  // 工厂
  WAR_FACTORY = 'war_factory',
  AIRFIELD = 'airfield',
  NAVAL_YARD = 'naval_yard',
  // 防御
  PILLBOX = 'pillbox',
  PRISM_TOWER = 'prism_tower',
  TESLA_COIL = 'tesla_coil',
  FLAK_CANNON = 'flak_cannon',
  // 超级武器
  NUCLEAR_SILO = 'nuclear_silo',
  WEATHER_CONTROLLER = 'weather_controller',
  CHRONOSPHERE = 'chronosphere',
  IRON_CURTAIN = 'iron_curtain',
}

// 可建造项目
export interface ProducibleItem {
  id: string
  name: string
  category: BuildCategory
  cost: number
  buildTime: number
  techLevel: number
  icon: string
  requires?: string[]
  faction?: Faction[]
}

// 资源类型
export enum ResourceType {
  ORE = 'ore',
  GEMS = 'gems',
}

// 矿石/宝石矿
export interface OreField {
  id: string
  position: Vector3
  type: ResourceType
  amount: number
  maxAmount: number
}

// 3D向量
export interface Vector3 {
  x: number
  y: number
  z: number
}

// 2D向量
export interface Vector2 {
  x: number
  y: number
}

// 地图单元格
export interface MapCell {
  x: number
  y: number
  height: number
  terrainType: TerrainType
  passable: boolean
  object?: GameObject
}

// 地形类型
export enum TerrainType {
  CLEAR = 'Clear',
  WATER = 'Water',
  ROUGH = 'Rough',
  ROAD = 'Road',
  ROCK = 'Rock',
  TREE = 'Tree',
  VEIN = 'Vein',
}

// 玩家信息
export interface Player {
  id: string
  name: string
  faction: Faction
  color: string
  money: number
  power: number
  powerDrain: number
  units: GameObject[]
  buildings: GameObject[]
}

// 游戏配置
export interface GameConfig {
  mapName: string
  maxPlayers: number
  startingUnits: boolean
  crates: boolean
  superWeapons: boolean
  gameMode: GameMode
}

// 游戏模式
export enum GameMode {
  STANDARD = 'standard',
  UNHOLY_ALLIANCE = 'unholy_alliance',
  MEGAWEALTH = 'megawealth',
  CRATES = 'crates',
}

// 输入事件
export interface InputEvent {
  type: 'mousedown' | 'mouseup' | 'mousemove' | 'keydown' | 'keyup'
  button?: number
  position?: Vector2
  key?: string
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

// 渲染配置
export interface RenderConfig {
  resolution: { width: number; height: number }
  fullScreen: boolean
  vsync: boolean
  shadows: boolean
  shadowQuality: 'low' | 'medium' | 'high'
  models: 'low' | 'medium' | 'high'
}

// 音频配置
export interface AudioConfig {
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  voiceVolume: number
  ambientVolume: number
}

// 网络消息
export interface NetworkMessage {
  type: string
  timestamp: number
  playerId: string
  data: unknown
}

// 游戏事件
export interface GameEvent {
  type: string
  timestamp: number
  source?: string
  target?: string
  data: unknown
}
