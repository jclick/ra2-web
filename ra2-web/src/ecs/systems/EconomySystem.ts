/**
 * EconomySystem
 * 
 * 处理经济逻辑：采矿、精炼、资金分配
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import { EconomyComponent, HarvesterState, ECONOMY_TYPE, ResourceType } from '../components/EconomyComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { OwnerComponent, OWNER_TYPE } from '../components/OwnerComponent'
import { ConstructionComponent, CONSTRUCTION_TYPE } from '../components/ConstructionComponent'

// 矿区
export interface OreField {
  id: number
  position: { x: number; z: number }
  amount: number
  type: ResourceType
  radius: number
}

export class EconomySystem extends EntitySystem {
  readonly priority = SystemPriority.NORMAL

  // 矿区列表
  private oreFields: OreField[] = []

  // 玩家资金（全局，用于非实体玩家）
  private playerCredits: Map<string, number> = new Map()

  // 玩家精炼厂
  private playerRefineries: Map<string, number[]> = new Map()

  constructor() {
    super(ECONOMY_TYPE, OWNER_TYPE)
  }

  initialize(world: World): void {
    super.initialize(world)
  }

  /**
   * 更新单个实体
   */
  protected updateEntity(entity: Entity, deltaTime: number): void {
    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)!
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)

    if (economy.isHarvester) {
      this.updateHarvester(entity, economy, transform, deltaTime)
    }
  }

  /**
   * 更新采矿车
   */
  private updateHarvester(
    entity: Entity,
    economy: EconomyComponent,
    transform: TransformComponent | null,
    deltaTime: number
  ): void {
    switch (economy.harvesterState) {
      case HarvesterState.HARVESTING:
        this.updateHarvesting(entity, economy, transform, deltaTime)
        break
      case HarvesterState.UNLOADING:
        this.updateUnloading(entity, economy, deltaTime)
        break
    }
  }

  /**
   * 更新采集
   */
  private updateHarvesting(
    _entity: Entity,
    economy: EconomyComponent,
    _transform: TransformComponent | null,
    deltaTime: number
  ): void {
    economy.harvest(deltaTime)

    // 检查是否满载
    if (economy.isFull()) {
      economy.startReturning()
    }
  }

  /**
   * 更新卸载
   */
  private updateUnloading(
    _entity: Entity,
    economy: EconomyComponent,
    deltaTime: number
  ): void {
    const amount = economy.unload(deltaTime)

    // 将资源转换为资金
    if (amount > 0) {
      const owner = _entity.getComponent<OwnerComponent>(OWNER_TYPE)
      if (owner) {
        const value = this.calculateResourceValue(amount, economy.currentResourceType)
        this.addPlayerCredits(owner.playerId, value)
      }
    }

    // 检查是否卸载完成
    if (economy.isEmpty()) {
      economy.harvesterState = HarvesterState.IDLE
    }
  }

  /**
   * 计算资源价值
   */
  private calculateResourceValue(amount: number, type: ResourceType): number {
    const values: Record<ResourceType, number> = {
      [ResourceType.ORE]: 25,
      [ResourceType.GEMS]: 50
    }
    return amount * (values[type] || 25)
  }

  /**
   * 添加玩家资金
   */
  addPlayerCredits(playerId: string, amount: number): void {
    const current = this.playerCredits.get(playerId) || 0
    const newAmount = current + amount
    this.playerCredits.set(playerId, newAmount)

    // 发送事件
    this.world?.events.emit('economy:credits_changed', {
      playerId,
      amount: newAmount,
      delta: amount
    })
  }

  /**
   * 消费玩家资金
   */
  spendPlayerCredits(playerId: string, amount: number): boolean {
    const current = this.playerCredits.get(playerId) || 0
    if (current >= amount) {
      this.playerCredits.set(playerId, current - amount)
      
      this.world?.events.emit('economy:credits_changed', {
        playerId,
        amount: current - amount,
        delta: -amount
      })
      return true
    }
    return false
  }

  /**
   * 获取玩家资金
   */
  getPlayerCredits(playerId: string): number {
    return this.playerCredits.get(playerId) || 0
  }

  /**
   * 添加矿区
   */
  addOreField(field: OreField): void {
    this.oreFields.push(field)
  }

  /**
   * 寻找最近的矿区
   */
  findNearestOreField(position: { x: number; z: number }): OreField | null {
    let nearest: OreField | null = null
    let nearestDist = Infinity

    for (const field of this.oreFields) {
      const dx = field.position.x - position.x
      const dz = field.position.z - position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < nearestDist && field.amount > 0) {
        nearestDist = dist
        nearest = field
      }
    }

    return nearest
  }

  /**
   * 注册精炼厂
   */
  registerRefinery(playerId: string, refineryId: number): void {
    if (!this.playerRefineries.has(playerId)) {
      this.playerRefineries.set(playerId, [])
    }
    this.playerRefineries.get(playerId)!.push(refineryId)
  }

  /**
   * 获取最近的精炼厂
   */
  getNearestRefinery(playerId: string, position: { x: number; z: number }): number | null {
    const refineries = this.playerRefineries.get(playerId) || []
    let nearestId: number | null = null
    let nearestDist = Infinity

    for (const refineryId of refineries) {
      const refinery = this.world?.getEntity(refineryId)
      if (!refinery) continue

      const transform = refinery.getComponent<TransformComponent>(TRANSFORM_TYPE)
      const construction = refinery.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
      
      if (!transform || !construction?.isCompleted()) continue

      const dx = transform.position.x - position.x
      const dz = transform.position.z - position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < nearestDist) {
        nearestDist = dist
        nearestId = refineryId
      }
    }

    return nearestId
  }

  /**
   * 命令采矿车去采集
   */
  commandHarvest(harvesterEntity: Entity): boolean {
    const economy = harvesterEntity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    const transform = harvesterEntity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    
    if (!economy?.isHarvester || !transform) return false

    // 如果已经满载，去卸载
    if (economy.isFull()) {
      return this.commandReturn(harvesterEntity)
    }

    // 寻找矿区
    const oreField = this.findNearestOreField({
      x: transform.position.x,
      z: transform.position.z
    })

    if (oreField) {
      economy.setTargetOreField({
        x: oreField.position.x,
        y: 0,
        z: oreField.position.z
      })
      economy.harvesterState = HarvesterState.MOVING_TO_FIELD
      return true
    }

    return false
  }

  /**
   * 命令采矿车返回
   */
  commandReturn(harvesterEntity: Entity): boolean {
    const economy = harvesterEntity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    const transform = harvesterEntity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const owner = harvesterEntity.getComponent<OwnerComponent>(OWNER_TYPE)
    
    if (!economy?.isHarvester || !transform || !owner) return false

    // 寻找最近的精炼厂
    const refineryId = this.getNearestRefinery(owner.playerId, {
      x: transform.position.x,
      z: transform.position.z
    })

    if (refineryId) {
      economy.setRefinery(refineryId)
      economy.startReturning()
      return true
    }

    return false
  }

  /**
   * 获取玩家经济统计
   */
  getPlayerStats(playerId: string) {
    const credits = this.getPlayerCredits(playerId)
    const refineries = this.playerRefineries.get(playerId)?.length || 0

    // 统计采矿车
    let harvesterCount = 0
    let totalLoad = 0
    let harvesterCapacity = 0

    for (const entity of this.entities) {
      const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
      const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)

      if (owner?.playerId === playerId && economy?.isHarvester) {
        harvesterCount++
        totalLoad += economy.currentLoad
        harvesterCapacity += economy.capacity
      }
    }

    return {
      credits,
      refineries,
      harvesterCount,
      totalLoad,
      harvesterCapacity,
      loadPercent: harvesterCapacity > 0 ? totalLoad / harvesterCapacity : 0
    }
  }
}
