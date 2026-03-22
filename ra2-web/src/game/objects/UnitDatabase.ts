import { Unit, UnitStats, WeaponConfig } from './Unit'
import { UnitType, Faction, Vector3 } from '../types'

/**
 * 单位数据库 - 定义所有单位的属性
 */

// 通用武器定义
const weapons: Record<string, WeaponConfig> = {
  // 盟军武器
  m60: {
    id: 'm60',
    name: 'M60机枪',
    damage: 15,
    range: 4,
    cooldown: 400,
    projectileSpeed: 100,
    isTurret: false,
  },
  grizzlyCannon: {
    id: 'grizzlyCannon',
    name: '90mm炮',
    damage: 65,
    range: 5,
    cooldown: 1200,
    projectileSpeed: 80,
    isTurret: true,
    turretRotationSpeed: 180,
  },
  prismBeam: {
    id: 'prismBeam',
    name: '棱镜光束',
    damage: 100,
    range: 10,
    cooldown: 1500,
    isTurret: true,
    turretRotationSpeed: 120,
  },
  ifvCannon: {
    id: 'ifvCannon',
    name: 'IFV导弹',
    damage: 25,
    range: 6,
    cooldown: 800,
    isTurret: true,
    turretRotationSpeed: 240,
  },
  harrierMissile: {
    id: 'harrierMissile',
    name: '空空导弹',
    damage: 50,
    range: 6,
    cooldown: 600,
    projectileSpeed: 150,
    isTurret: false,
  },
  
  // 苏联武器
  makarov: {
    id: 'makarov',
    name: '马卡罗夫手枪',
    damage: 15,
    range: 4,
    cooldown: 400,
    projectileSpeed: 100,
    isTurret: false,
  },
  rhinoCannon: {
    id: 'rhinoCannon',
    name: '120mm炮',
    damage: 90,
    range: 5.75,
    cooldown: 1300,
    projectileSpeed: 80,
    isTurret: true,
    turretRotationSpeed: 150,
  },
  teslaCoil: {
    id: 'teslaCoil',
    name: '特斯拉线圈',
    damage: 150,
    range: 8,
    cooldown: 2000,
    isTurret: true,
    turretRotationSpeed: 100,
  },
  flakCannon: {
    id: 'flakCannon',
    name: '高射炮',
    damage: 30,
    range: 8,
    cooldown: 500,
    isTurret: true,
    turretRotationSpeed: 300,
  },
  kirovBomb: {
    id: 'kirovBomb',
    name: '炸弹',
    damage: 200,
    range: 1.5,
    cooldown: 1500,
    isTurret: false,
  },
}

// 单位属性数据库
export const unitDatabase: Record<string, UnitStats> = {
  // === 盟军单位 ===
  
  // 美国大兵
  GI: {
    name: '美国大兵',
    cost: 200,
    buildTime: 5000,
    techLevel: 1,
    health: 125,
    armor: 'none',
    speed: 15,
    turnRate: 180,
    movementType: 'foot',
    sight: 5,
    primaryWeapon: weapons.m60,
    canDeploy: true,
    canGarrison: true,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 24, height: 24 },
  },
  
  // 工程师
  ENGINEER: {
    name: '工程师',
    cost: 500,
    buildTime: 8000,
    techLevel: 1,
    health: 75,
    armor: 'none',
    speed: 18,
    turnRate: 180,
    movementType: 'foot',
    sight: 4,
    canDeploy: false,
    canGarrison: true,
    canTransport: false,
    veterancy: false,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 24, height: 24 },
  },
  
  // 灰熊坦克
  GRIZZLY: {
    name: '灰熊坦克',
    cost: 700,
    buildTime: 10000,
    techLevel: 2,
    health: 300,
    armor: 'heavy',
    speed: 40,
    turnRate: 90,
    movementType: 'track',
    sight: 8,
    primaryWeapon: weapons.grizzlyCannon,
    canDeploy: false,
    canGarrison: false,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 48, height: 48 },
  },
  
  // IFV多功能步兵车
  IFV: {
    name: '多功能步兵车',
    cost: 600,
    buildTime: 9000,
    techLevel: 2,
    health: 200,
    armor: 'flak',
    speed: 60,
    turnRate: 120,
    movementType: 'wheel',
    sight: 8,
    primaryWeapon: weapons.ifvCannon,
    canDeploy: false,
    canGarrison: false,
    canTransport: true,
    transportCapacity: 1,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 40, height: 40 },
  },
  
  // 光棱坦克
  PRISM: {
    name: '光棱坦克',
    cost: 1200,
    buildTime: 15000,
    techLevel: 4,
    health: 250,
    armor: 'flak',
    speed: 35,
    turnRate: 80,
    movementType: 'track',
    sight: 10,
    primaryWeapon: weapons.prismBeam,
    canDeploy: false,
    canGarrison: false,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 48, height: 48 },
  },
  
  // 入侵者战机
  HARRIER: {
    name: '入侵者战机',
    cost: 1200,
    buildTime: 18000,
    techLevel: 3,
    health: 150,
    armor: 'flak',
    speed: 150,
    turnRate: 180,
    movementType: 'fly',
    sight: 8,
    primaryWeapon: weapons.harrierMissile,
    canDeploy: false,
    canGarrison: false,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 48, height: 48 },
  },
  
  // === 苏联单位 ===
  
  // 动员兵
  CONSCRIPT: {
    name: '动员兵',
    cost: 100,
    buildTime: 4000,
    techLevel: 1,
    health: 125,
    armor: 'flak',
    speed: 15,
    turnRate: 180,
    movementType: 'foot',
    sight: 5,
    primaryWeapon: weapons.makarov,
    canDeploy: true,
    canGarrison: true,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 24, height: 24 },
  },
  
  // 犀牛坦克
  RHINO: {
    name: '犀牛坦克',
    cost: 900,
    buildTime: 12000,
    techLevel: 2,
    health: 400,
    armor: 'heavy',
    speed: 35,
    turnRate: 80,
    movementType: 'track',
    sight: 8,
    primaryWeapon: weapons.rhinoCannon,
    canDeploy: false,
    canGarrison: false,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 48, height: 48 },
  },
  
  // 磁能坦克
  TESLA: {
    name: '磁能坦克',
    cost: 1200,
    buildTime: 15000,
    techLevel: 4,
    health: 300,
    armor: 'heavy',
    speed: 30,
    turnRate: 80,
    movementType: 'track',
    sight: 10,
    primaryWeapon: weapons.teslaCoil,
    canDeploy: false,
    canGarrison: false,
    canTransport: false,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: true,
    imageSize: { width: 48, height: 48 },
  },
  
  // 防空履带车
  FLAK: {
    name: '防空履带车',
    cost: 500,
    buildTime: 8000,
    techLevel: 2,
    health: 180,
    armor: 'flak',
    speed: 50,
    turnRate: 120,
    movementType: 'track',
    sight: 8,
    primaryWeapon: weapons.flakCannon,
    canDeploy: false,
    canGarrison: false,
    canTransport: true,
    transportCapacity: 5,
    veterancy: true,
    selfHealing: false,
    immuneToPsionics: false,
    imageSize: { width: 40, height: 40 },
  },
  
  // 基洛夫飞艇
  KIROV: {
    name: '基洛夫飞艇',
    cost: 2000,
    buildTime: 25000,
    techLevel: 5,
    health: 2000,
    armor: 'heavy',
    speed: 20,
    turnRate: 45,
    movementType: 'fly',
    sight: 8,
    primaryWeapon: weapons.kirovBomb,
    canDeploy: false,
    canGarrison: false,
    canTransport: false,
    veterancy: true,
    selfHealing: true,
    immuneToPsionics: false,
    imageSize: { width: 64, height: 64 },
  },
}

/**
 * 单位工厂 - 创建单位实例
 */
export class UnitFactory {
  private static idCounter = 0
  
  /**
   * 创建单位
   */
  static createUnit(
    unitId: string,
    faction: Faction,
    position: Vector3,
    customId?: string
  ): Unit | null {
    const stats = unitDatabase[unitId]
    if (!stats) {
      console.warn(`未知单位类型: ${unitId}`)
      return null
    }
    
    const id = customId || `${unitId}_${++this.idCounter}_${Date.now()}`
    
    // 根据单位ID判断类型
    let unitType = UnitType.VEHICLE
    if (['GI', 'CONSCRIPT', 'ENGINEER'].includes(unitId)) {
      unitType = UnitType.INFANTRY
    } else if (['HARRIER', 'KIROV'].includes(unitId)) {
      unitType = UnitType.AIRCRAFT
    }
    
    // 创建单位实例
    const unit = new (class extends Unit {
      type = unitType
      faction = faction
    })(id, unitType, faction, position, stats)
    
    return unit
  }
  
  /**
   * 获取单位属性
   */
  static getStats(unitId: string): UnitStats | null {
    return unitDatabase[unitId] || null
  }
  
  /**
   * 获取某阵营的所有单位
   */
  static getFactionUnits(faction: Faction): string[] {
    const alliedUnits = ['GI', 'ENGINEER', 'GRIZZLY', 'IFV', 'PRISM', 'HARRIER']
    const sovietUnits = ['CONSCRIPT', 'ENGINEER', 'RHINO', 'TESLA', 'FLAK', 'KIROV']
    
    return faction === Faction.ALLIES ? alliedUnits : sovietUnits
  }
  
  /**
   * 获取某科技等级可建造的单位
   */
  static getAvailableUnits(faction: Faction, techLevel: number): string[] {
    const allUnits = this.getFactionUnits(faction)
    return allUnits.filter(id => {
      const stats = unitDatabase[id]
      return stats && stats.techLevel <= techLevel
    })
  }
}

export { weapons }
