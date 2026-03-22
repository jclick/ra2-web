import { Vector3, GameObject, UnitType, Faction, UnitState, Player } from '../types'

/**
 * 武器配置
 */
export interface WeaponConfig {
  id: string
  name: string
  damage: number
  range: number
  cooldown: number // 毫秒
  projectileSpeed?: number
  isTurret: boolean
  turretRotationSpeed?: number
}

/**
 * 单位属性配置
 */
export interface UnitStats {
  // 基础属性
  name: string
  cost: number
  buildTime: number
  techLevel: number
  
  // 生命值
  health: number
  armor: 'none' | 'flak' | 'plate' | 'heavy'
  
  // 移动
  speed: number // 像素/秒
  turnRate: number // 度/秒
  movementType: 'foot' | 'track' | 'wheel' | 'hover' | 'fly'
  
  // 视野
  sight: number
  
  // 武器
  primaryWeapon?: WeaponConfig
  secondaryWeapon?: WeaponConfig
  
  // 特殊能力
  canDeploy: boolean
  canGarrison: boolean
  canTransport: boolean
  transportCapacity?: number
  
  // 其他
  veterancy: boolean
  selfHealing: boolean
  immuneToPsionics: boolean
  
  // 渲染
  shpName?: string
  vxlName?: string
  imageSize: { width: number; height: number }
}

/**
 * 武器实例
 */
export class Weapon {
  config: WeaponConfig
  currentCooldown: number = 0
  
  constructor(config: WeaponConfig) {
    this.config = config
  }
  
  /**
   * 检查是否可以开火
   */
  canFire(): boolean {
    return this.currentCooldown <= 0
  }
  
  /**
   * 开火
   */
  fire(): void {
    this.currentCooldown = this.config.cooldown
  }
  
  /**
   * 更新冷却
   */
  update(deltaTime: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime
      if (this.currentCooldown < 0) {
        this.currentCooldown = 0
      }
    }
  }
}

/**
 * 路径节点
 */
export interface PathNode {
  x: number
  y: number
  g: number // 从起点到当前点的代价
  h: number // 启发式估计到终点的代价
  f: number // g + h
  parent?: PathNode
}

/**
 * 单位基类 - 所有游戏单位的基础
 */
export abstract class Unit implements GameObject {
  id: string
  type: UnitType
  faction: Faction
  
  // 位置
  position: Vector3
  rotation: number = 0
  
  // 渲染相关
  renderPosition: Vector3 = { x: 0, y: 0, z: 0 }
  renderRotation: number = 0
  
  // 状态
  state: UnitState = UnitState.IDLE
  health: number
  maxHealth: number
  
  // 配置
  stats: UnitStats
  
  // 武器
  primaryWeapon?: Weapon
  secondaryWeapon?: Weapon
  
  // 移动
  targetPosition?: Vector3
  currentPath: PathNode[] = []
  pathIndex: number = 0
  targetRotation?: number
  
  // 攻击
  targetUnit?: Unit
  turretRotation: number = 0
  targetTurretRotation: number = 0
  
  // 单位属性
  unitType: UnitType
  
  // 所有者
  owner: Player
  
  // 选择状态
  selected: boolean = false
  
  // 经验
  veterancyLevel: 0 | 1 | 2 | 3 = 0
  kills: number = 0
  
  // 特殊状态
  isDeployed: boolean = false
  isGarrisoned: boolean = false
  isCloaked: boolean = false
  isDisabled: boolean = false
  
  // 建造相关
  isBuilding: boolean = false
  buildProgress: number = 0
  
  constructor(
    id: string,
    type: UnitType,
    faction: Faction,
    position: Vector3,
    stats: UnitStats
  ) {
    this.id = id
    this.type = type
    this.unitType = type  // 添加 unitType
    this.faction = faction
    this.position = { ...position }
    this.renderPosition = { ...position }
    this.stats = stats
    this.health = stats.health
    this.maxHealth = stats.health
    this.owner = null as any  // 临时初始化，会在后面设置
    
    if (stats.primaryWeapon) {
      this.primaryWeapon = new Weapon(stats.primaryWeapon)
    }
    if (stats.secondaryWeapon) {
      this.secondaryWeapon = new Weapon(stats.secondaryWeapon)
    }
  }
  
  /**
   * 更新单位状态
   */
  update(deltaTime: number): void {
    // 更新武器冷却
    this.primaryWeapon?.update(deltaTime)
    this.secondaryWeapon?.update(deltaTime)
    
    // 根据状态执行对应逻辑
    switch (this.state) {
      case UnitState.MOVING:
        this.updateMoving(deltaTime)
        break
      case UnitState.ATTACKING:
        this.updateAttacking(deltaTime)
        break
      case UnitState.BUILDING:
        this.updateBuilding(deltaTime)
        break
      case UnitState.HARVESTING:
        this.updateHarvesting(deltaTime)
        break
      case UnitState.GUARDING:
        this.updateGuarding(deltaTime)
        break
      case UnitState.IDLE:
        this.updateIdle(deltaTime)
        break
    }
    
    // 插值渲染位置（平滑移动）
    this.interpolateRenderPosition(deltaTime)
    this.interpolateRotation(deltaTime)
    this.interpolateTurretRotation(deltaTime)
  }
  
  /**
   * 移动状态更新
   */
  private updateMoving(deltaTime: number): void {
    if (this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
      this.stop()
      return
    }
    
    const targetNode = this.currentPath[this.pathIndex]
    const targetPos = {
      x: targetNode.x,
      y: this.position.y,
      z: targetNode.y // 2D地图使用z作为y
    }
    
    // 计算到目标点的距离
    const dx = targetPos.x - this.position.x
    const dz = targetPos.z - this.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    if (distance < 0.5) {
      // 到达当前路径点，前往下一个
      this.pathIndex++
      if (this.pathIndex >= this.currentPath.length) {
        this.stop()
      }
      return
    }
    
    // 计算目标旋转角度
    const targetRotation = Math.atan2(dx, dz) * (180 / Math.PI)
    
    // 旋转朝向目标
    this.rotateTowards(targetRotation, deltaTime)
    
    // 如果朝向基本正确，开始移动
    const rotationDiff = Math.abs(this.normalizeAngle(targetRotation - this.rotation))
    if (rotationDiff < 30) {
      const moveDistance = this.stats.speed * deltaTime / 1000
      this.position.x += (dx / distance) * moveDistance
      this.position.z += (dz / distance) * moveDistance
    }
  }
  
  /**
   * 攻击状态更新
   */
  private updateAttacking(deltaTime: number): void {
    if (!this.targetUnit || this.targetUnit.health <= 0) {
      this.targetUnit = undefined
      this.state = UnitState.IDLE
      return
    }
    
    // 检查目标是否在射程内
    const dx = this.targetUnit.position.x - this.position.x
    const dz = this.targetUnit.position.z - this.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    const weapon = this.primaryWeapon
    if (!weapon) {
      this.state = UnitState.IDLE
      return
    }
    
    // 旋转炮塔/身体朝向目标
    const targetRotation = Math.atan2(dx, dz) * (180 / Math.PI)
    
    if (this.stats.primaryWeapon?.isTurret) {
      this.targetTurretRotation = targetRotation
    } else {
      this.rotateTowards(targetRotation, deltaTime)
    }
    
    // 检查是否可以开火
    if (weapon.canFire() && distance <= weapon.config.range) {
      // 检查朝向
      const currentRotation = this.stats.primaryWeapon?.isTurret 
        ? this.turretRotation 
        : this.rotation
      const rotationDiff = Math.abs(this.normalizeAngle(targetRotation - currentRotation))
      
      if (rotationDiff < 10) {
        this.fireWeapon()
      }
    }
    
    // 如果目标太远，追近
    if (distance > weapon.config.range * 0.8) {
      this.moveTo(this.targetUnit.position)
    }
  }
  
  /**
   * 建造状态更新
   */
  private updateBuilding(deltaTime: number): void {
    if (this.isBuilding) {
      this.buildProgress += deltaTime / this.stats.buildTime
      if (this.buildProgress >= 1) {
        this.buildProgress = 1
        this.isBuilding = false
        this.state = UnitState.IDLE
      }
    }
  }
  
  /**
   * 采集状态更新
   */
  private updateHarvesting(_deltaTime: number): void {
    // 采集逻辑在子类中实现
  }
  
  /**
   * 驻守状态更新
   */
  private updateGuarding(_deltaTime: number): void {
    // 自动索敌
    // 在子类或外部系统中实现
  }
  
  /**
   * 空闲状态更新
   */
  private updateIdle(_deltaTime: number): void {
    // 检查是否需要自动攻击范围内的敌人
  }
  
  /**
   * 移动到指定位置
   */
  moveTo(destination: Vector3): void {
    this.targetPosition = { ...destination }
    this.state = UnitState.MOVING
  }
  
  /**
   * 沿着路径移动
   */
  followPath(path: PathNode[]): void {
    if (path.length > 0) {
      this.currentPath = path
      this.pathIndex = 0
      this.state = UnitState.MOVING
    }
  }
  
  /**
   * 攻击目标
   */
  attack(target: Unit): void {
    this.targetUnit = target
    this.state = UnitState.ATTACKING
  }
  
  /**
   * 停止
   */
  stop(): void {
    this.state = UnitState.IDLE
    this.currentPath = []
    this.pathIndex = 0
    this.targetPosition = undefined
  }
  
  /**
   * 驻守
   */
  guard(): void {
    this.state = UnitState.GUARDING
    this.currentPath = []
    this.pathIndex = 0
  }
  
  /**
   * 部署
   */
  deploy(): void {
    if (this.stats.canDeploy) {
      this.isDeployed = !this.isDeployed
      // 触发部署效果（如美国大兵变成沙包模式）
    }
  }
  
  /**
   * 受到伤害
   */
  takeDamage(damage: number, attacker?: Unit): void {
    // 根据护甲类型减伤
    let actualDamage = damage
    switch (this.stats.armor) {
      case 'flak':
        actualDamage *= 0.75
        break
      case 'plate':
        actualDamage *= 0.5
        break
      case 'heavy':
        actualDamage *= 0.25
        break
    }
    
    this.health -= actualDamage
    
    if (this.health <= 0) {
      this.health = 0
      this.onDestroyed(attacker)
    }
  }
  
  /**
   * 开火
   */
  private fireWeapon(): void {
    if (this.primaryWeapon) {
      this.primaryWeapon.fire()
      // 触发开火事件，创建投射物
    }
  }
  
  /**
   * 被摧毁时的回调
   */
  protected onDestroyed(killer?: Unit): void {
    // 增加击杀者经验
    if (killer) {
      killer.onKill()
    }
    
    // 触发爆炸效果
    // 清理引用
  }
  
  /**
   * 击杀敌人
   */
  protected onKill(): void {
    this.kills++
    
    // 升级检查
    if (this.kills >= 5 && this.veterancyLevel < 1) {
      this.veterancyLevel = 1 // 老兵
    } else if (this.kills >= 10 && this.veterancyLevel < 2) {
      this.veterancyLevel = 2 // 精英
    } else if (this.kills >= 20 && this.veterancyLevel < 3) {
      this.veterancyLevel = 3 // 英雄
    }
  }
  
  /**
   * 旋转朝向目标角度
   */
  private rotateTowards(targetRotation: number, deltaTime: number): void {
    const diff = this.normalizeAngle(targetRotation - this.rotation)
    const maxRotation = this.stats.turnRate * deltaTime / 1000
    
    if (Math.abs(diff) <= maxRotation) {
      this.rotation = targetRotation
    } else {
      this.rotation += Math.sign(diff) * maxRotation
    }
  }
  
  /**
   * 插值渲染位置
   */
  private interpolateRenderPosition(_deltaTime: number): void {
    const lerpFactor = 0.3
    this.renderPosition.x += (this.position.x - this.renderPosition.x) * lerpFactor
    this.renderPosition.y += (this.position.y - this.renderPosition.y) * lerpFactor
    this.renderPosition.z += (this.position.z - this.renderPosition.z) * lerpFactor
  }
  
  /**
   * 插值旋转
   */
  private interpolateRotation(_deltaTime: number): void {
    const lerpFactor = 0.2
    let diff = this.normalizeAngle(this.rotation - this.renderRotation)
    this.renderRotation += diff * lerpFactor
  }
  
  /**
   * 插值炮塔旋转
   */
  private interpolateTurretRotation(deltaTime: number): void {
    // const lerpFactor = 0.3
    let diff = this.normalizeAngle(this.targetTurretRotation - this.turretRotation)
    
    const maxTurretRotation = (this.stats.primaryWeapon?.turretRotationSpeed || 180) * deltaTime / 1000
    if (Math.abs(diff) > maxTurretRotation) {
      diff = Math.sign(diff) * maxTurretRotation
    }
    
    this.turretRotation += diff
  }
  
  /**
   * 标准化角度到 -180 ~ 180
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }
  
  /**
   * 获取当前位置（世界坐标）
   */
  getWorldPosition(): Vector3 {
    return this.position
  }
  
  /**
   * 检查是否在射程内
   */
  isInRange(target: Unit, weapon?: WeaponConfig): boolean {
    const range = weapon?.range || this.stats.primaryWeapon?.range || 0
    const dx = target.position.x - this.position.x
    const dz = target.position.z - this.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    return distance <= range
  }
  
  /**
   * 获取健康百分比
   */
  getHealthPercent(): number {
    return this.health / this.maxHealth
  }
  
  /**
   * 检查是否为满血
   */
  isFullHealth(): boolean {
    return this.health >= this.maxHealth
  }
  
  /**
   * 治疗
   */
  heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth)
  }
}
