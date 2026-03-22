/**
 * 规则加载器
 * 从 INI 文件加载单位、建筑、武器配置
 */

import { IniParser, IniData } from '../../data/parser/IniParser'
import { ResourceManager } from './ResourceManager'

// 单位类型定义
export interface UnitRules {
  id: string
  name: string
  image?: string
  strength: number          // 生命值
  speed: number             // 速度
  cost: number              // 造价
  sight: number             // 视野
  owner: string[]           // 所属阵营
  requiredHouses?: string   // 仅限阵营
  techLevel: number         // 科技等级
  prerequisites: string[]   // 前置建筑
  primary?: string          // 主武器
  secondary?: string        // 副武器
  armor?: string            // 装甲类型
  category?: string         // 分类
  movementZone?: string     // 移动区域
  locomotor?: string        // 移动器
  pilot?: string            // 驾驶员
  canPassiveAquire?: boolean  // 自动攻击
  canRetaliate?: boolean    // 可以反击
  explosion?: string        // 爆炸效果
  veteranAbilities?: string[]
  eliteAbilities?: string[]
  crateGoodie?: boolean     // 随机箱子奖励
  isSelectableCombatant?: boolean
  points?: number
}

// 建筑类型定义
export interface BuildingRules {
  id: string
  name: string
  image?: string
  strength: number
  cost: number
  power?: number            // 发电量(负值为耗电)
  sight: number
  owner: string[]
  requiredHouses?: string
  techLevel: number
  prerequisites: string[]
  buildLimit?: number       // 建造限制
  armor?: string
  primary?: string          // 武器
  explosive?: boolean       // 是否爆炸
  capturable?: boolean      // 可占领
  occupiable?: boolean      // 可驻扎
  canBeOccupied?: boolean
  baseNormal?: boolean      // 基础建筑
  constructionYard?: boolean // 建造厂
  factory?: string          // 工厂类型 (UnitType/InfantryType/BuildingType/AircraftType)
  weaponsFactory?: boolean  // 战车工厂
  refinery?: boolean        // 矿厂
  powerPlant?: boolean      // 电厂
  barracks?: boolean        // 兵营
  radar?: boolean           // 雷达
  spySat?: boolean          // 间谍卫星
  superWeapon?: string      // 超级武器类型
  dock?: string             // 停机坪/船坞
  storage?: number          // 存储容量
  infiltrate?: boolean      // 可被渗透
}

// 武器类型定义
export interface WeaponRules {
  id: string
  damage: number
  rof: number               // 射速 (帧)
  range: number             // 射程
  projectile?: string       // 弹道
  speed?: number            // 弹速
  warhead?: string          // 弹头
  report?: string           // 音效
  anim?: string             // 动画
  bright?: boolean          // 照亮
  burst?: number            // 连发数
  decloakToFire?: boolean   // 开火显形
}

// 弹头类型定义
export interface WarheadRules {
  id: string
  verses: number[]          // 对装甲类型的伤害比 [无甲, 皮甲, 铁甲, 重甲, 木甲, 钢甲, 混凝土, 特殊1, 特殊2]
  penetrateBunker?: boolean // 穿透碉堡
  wall?: boolean            // 可摧毁围墙
  wood?: boolean            // 可摧毁树木
  sparky?: boolean          // 火花效果
  fire?: boolean            // 火焰效果
  cellSpread?: number       // 范围伤害
  percentAtMax?: number     // 边缘伤害百分比
}

// 完整的规则集
export interface GameRules {
  units: Map<string, UnitRules>
  buildings: Map<string, BuildingRules>
  weapons: Map<string, WeaponRules>
  warheads: Map<string, WarheadRules>
}

/**
 * 规则加载器
 */
export class RulesLoader {
  private resourceManager: ResourceManager
  private rules: GameRules

  constructor(resourceManager: ResourceManager) {
    this.resourceManager = resourceManager
    this.rules = {
      units: new Map(),
      buildings: new Map(),
      weapons: new Map(),
      warheads: new Map(),
    }
  }

  /**
   * 加载规则文件
   */
  loadRules(filename: string): IniData | null {
    const resource = this.resourceManager.getResource(filename)
    if (!resource) {
      console.warn(`规则文件未找到: ${filename}`)
      return null
    }

    const data = resource.rawData || resource.data
    if (data instanceof Uint8Array) {
      return IniParser.parseBuffer(data)
    }
    
    if (typeof data === 'string') {
      return IniParser.parse(data)
    }

    return null
  }

  /**
   * 解析单位配置
   */
  parseUnits(iniData: IniData): void {
    // 从 [InfantryTypes] 和 [VehicleTypes] 获取单位列表
    const infantryTypes = this.parseTypeList(iniData, 'InfantryTypes')
    const vehicleTypes = this.parseTypeList(iniData, 'VehicleTypes')
    const aircraftTypes = this.parseTypeList(iniData, 'AircraftTypes')

    // 解析每个单位
    for (const id of [...infantryTypes, ...vehicleTypes, ...aircraftTypes]) {
      const section = iniData[id]
      if (!section) continue

      const unit: UnitRules = {
        id,
        name: section.UIName || section.Name || id,
        image: section.Image,
        strength: parseInt(section.Strength, 10) || 100,
        speed: parseInt(section.Speed, 10) || 5,
        cost: parseInt(section.Cost, 10) || 0,
        sight: parseInt(section.Sight, 10) || 5,
        owner: this.parseOwner(section.Owner),
        requiredHouses: section.RequiredHouses,
        techLevel: parseInt(section.TechLevel, 10) || -1,
        prerequisites: this.parsePrerequisites(section.Prerequisite),
        primary: section.Primary,
        secondary: section.Secondary,
        armor: section.Armor,
        category: section.Category,
        movementZone: section.MovementZone,
        locomotor: section.Locomotor,
        pilot: section.Pilot,
        canPassiveAquire: section.CanPassiveAquire === 'yes',
        canRetaliate: section.CanRetaliate === 'yes',
        explosion: section.Explosion,
        veteranAbilities: section.VeteranAbilities?.split(','),
        eliteAbilities: section.EliteAbilities?.split(','),
        crateGoodie: section.CrateGoodie === 'yes',
        isSelectableCombatant: section.IsSelectableCombatant === 'yes',
        points: parseInt(section.Points, 10) || 0,
      }

      this.rules.units.set(id, unit)
    }
  }

  /**
   * 解析建筑配置
   */
  parseBuildings(iniData: IniData): void {
    const buildingTypes = this.parseTypeList(iniData, 'BuildingTypes')

    for (const id of buildingTypes) {
      const section = iniData[id]
      if (!section) continue

      const building: BuildingRules = {
        id,
        name: section.UIName || section.Name || id,
        image: section.Image,
        strength: parseInt(section.Strength, 10) || 100,
        cost: parseInt(section.Cost, 10) || 0,
        power: parseInt(section.Power, 10) || 0,
        sight: parseInt(section.Sight, 10) || 5,
        owner: this.parseOwner(section.Owner),
        requiredHouses: section.RequiredHouses,
        techLevel: parseInt(section.TechLevel, 10) || -1,
        prerequisites: this.parsePrerequisites(section.Prerequisite),
        buildLimit: parseInt(section.BuildLimit, 10) || 0,
        armor: section.Armor,
        primary: section.Primary,
        explosive: section.Explosive === 'yes',
        capturable: section.Capturable !== 'no',
        occupiable: section.Occupiable === 'yes',
        canBeOccupied: section.CanBeOccupied === 'yes',
        baseNormal: section.BaseNormal === 'yes',
        constructionYard: section.ConstructionYard === 'yes',
        factory: section.Factory,
        weaponsFactory: section.WeaponsFactory === 'yes',
        refinery: section.Refinery === 'yes',
        powerPlant: section.PowerPlant === 'yes',
        barracks: section.Barracks === 'yes',
        radar: section.Radar === 'yes',
        spySat: section.SpySat === 'yes',
        superWeapon: section.SuperWeapon,
        dock: section.Dock,
        storage: parseInt(section.Storage, 10) || 0,
        infiltrate: section.Infiltrate !== 'no',
      }

      this.rules.buildings.set(id, building)
    }
  }

  /**
   * 解析武器配置
   */
  parseWeapons(iniData: IniData): void {
    const weaponTypes = this.parseTypeList(iniData, 'WeaponTypes')

    for (const id of weaponTypes) {
      const section = iniData[id]
      if (!section) continue

      const weapon: WeaponRules = {
        id,
        damage: parseInt(section.Damage, 10) || 0,
        rof: parseInt(section.ROF, 10) || 1,
        range: parseInt(section.Range, 10) || 0,
        projectile: section.Projectile,
        speed: parseInt(section.Speed, 10),
        warhead: section.Warhead,
        report: section.Report,
        anim: section.Anim,
        bright: section.Bright === 'yes',
        burst: parseInt(section.Burst, 10) || 1,
        decloakToFire: section.DecloakToFire === 'yes',
      }

      this.rules.weapons.set(id, weapon)
    }
  }

  /**
   * 解析弹头配置
   */
  parseWarheads(iniData: IniData): void {
    const warheadTypes = this.parseTypeList(iniData, 'Warheads')

    for (const id of warheadTypes) {
      const section = iniData[id]
      if (!section) continue

      const warhead: WarheadRules = {
        id,
        verses: this.parseVerses(section.Verses),
        penetrateBunker: section.PenetratesBunker === 'yes',
        wall: section.Wall === 'yes',
        wood: section.Wood === 'yes',
        sparky: section.Sparky === 'yes',
        fire: section.Fire === 'yes',
        cellSpread: parseFloat(section.CellSpread) || 0,
        percentAtMax: parseInt(section.PercentAtMax, 10) || 0,
      }

      this.rules.warheads.set(id, warhead)
    }
  }

  /**
   * 解析类型列表
   */
  private parseTypeList(iniData: IniData, sectionName: string): string[] {
    const section = iniData[sectionName]
    if (!section) return []

    // 类型列表格式: 0=类型1, 1=类型2, ...
    return Object.values(section)
  }

  /**
   * 解析所属阵营
   */
  private parseOwner(ownerStr?: string): string[] {
    if (!ownerStr) return []
    return ownerStr.split(',').map(o => o.trim())
  }

  /**
   * 解析前置建筑
   */
  private parsePrerequisites(prereqStr?: string): string[] {
    if (!prereqStr) return []
    return prereqStr.split(',').map(p => p.trim())
  }

  /**
   * 解析装甲伤害比
   * Format: 100%,100%,100%,100%,100%,100%,100%,100%,100%
   */
  private parseVerses(versesStr?: string): number[] {
    if (!versesStr) return [100, 100, 100, 100, 100, 100, 100, 100, 100]
    
    return versesStr.split(',').map(v => {
      const clean = v.trim().replace('%', '')
      return parseInt(clean, 10) || 100
    })
  }

  /**
   * 加载所有规则
   */
  loadAll(rulesFile = 'rules.ini'): void {
    const iniData = this.loadRules(rulesFile)
    if (!iniData) return

    console.log(`解析规则文件: ${rulesFile}`)
    
    this.parseUnits(iniData)
    this.parseBuildings(iniData)
    this.parseWeapons(iniData)
    this.parseWarheads(iniData)

    console.log(`加载完成: ${this.rules.units.size} 单位, ${this.rules.buildings.size} 建筑, ${this.rules.weapons.size} 武器`)
  }

  /**
   * 获取规则
   */
  getRules(): GameRules {
    return this.rules
  }

  /**
   * 获取单位
   */
  getUnit(id: string): UnitRules | undefined {
    return this.rules.units.get(id)
  }

  /**
   * 获取建筑
   */
  getBuilding(id: string): BuildingRules | undefined {
    return this.rules.buildings.get(id)
  }

  /**
   * 获取武器
   */
  getWeapon(id: string): WeaponRules | undefined {
    return this.rules.weapons.get(id)
  }

  /**
   * 获取弹头
   */
  getWarhead(id: string): WarheadRules | undefined {
    return this.rules.warheads.get(id)
  }
}

export default RulesLoader
