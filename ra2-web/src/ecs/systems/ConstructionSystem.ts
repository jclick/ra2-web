/**
 * ConstructionSystem
 * 
 * 处理建筑物建造逻辑
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { World } from '../core/World'
import { ConstructionComponent, CONSTRUCTION_TYPE } from '../components/ConstructionComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { OwnerComponent, OWNER_TYPE } from '../components/OwnerComponent'
import { EconomyComponent, ECONOMY_TYPE } from '../components/EconomyComponent'

export class ConstructionSystem extends EntitySystem {
  readonly priority = SystemPriority.NORMAL

  // 建造队列
  private buildQueue: Map<string, Entity[]> = new Map() // playerId -> entities

  constructor() {
    super(CONSTRUCTION_TYPE, TRANSFORM_TYPE, OWNER_TYPE)
  }

  initialize(world: World): void {
    super.initialize(world)

    // 监听资金变化，自动开始建造
    world.events.on('economy:credits_changed', (event: { playerId: string; amount: number }) => {
      this.checkQueuedBuildings(event.playerId)
    })
  }

  /**
   * 更新单个实体
   */
  protected updateEntity(entity: Entity, deltaTime: number): void {
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)!

    // 更新建造进度
    if (construction.isConstructing()) {
      construction.updateProgress(deltaTime)
    }
  }

  /**
   * 尝试放置建筑
   */
  placeBuilding(
    entity: Entity,
    position: { x: number; y: number; z: number }
  ): boolean {
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
    
    if (!transform || !construction) return false

    // 设置位置
    transform.position.x = position.x
    transform.position.y = position.y
    transform.position.z = position.z

    // 开始建造
    return this.startBuilding(entity)
  }

  /**
   * 开始建造
   */
  startBuilding(entity: Entity): boolean {
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)

    if (!construction || !owner) return false

    // 检查资金
    if (economy) {
      if (!economy.canAfford(construction.cost)) {
        // 资金不足，加入队列
        this.queueBuilding(owner.playerId, entity)
        return false
      }

      // 扣除资金
      economy.spendCredits(construction.cost)
      construction.invested = construction.cost
    }

    // 开始建造
    construction.startConstruction()
    
    // 发送事件
    this.world?.events.emit('construction:started', {
      entityId: entity.id,
      buildingType: construction.buildingType
    })

    return true
  }

  /**
   * 将建筑加入建造队列
   */
  private queueBuilding(playerId: string, entity: Entity): void {
    if (!this.buildQueue.has(playerId)) {
      this.buildQueue.set(playerId, [])
    }
    this.buildQueue.get(playerId)!.push(entity)
  }

  /**
   * 检查队列中的建筑是否可以开始建造
   */
  private checkQueuedBuildings(playerId: string): void {
    const queue = this.buildQueue.get(playerId)
    if (!queue || queue.length === 0) return

    // 检查队列中的第一个建筑
    const entity = queue[0]
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)

    if (construction && economy && economy.canAfford(construction.cost)) {
      queue.shift() // 从队列移除
      this.startBuilding(entity)
    }
  }

  /**
   * 取消建造
   */
  cancelBuilding(entity: Entity): number {
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
    if (!construction) return 0

    const refund = construction.cancelConstruction()

    // 退款
    const economy = entity.getComponent<EconomyComponent>(ECONOMY_TYPE)
    if (economy) {
      economy.addCredits(refund)
    }

    // 发送事件
    this.world?.events.emit('construction:cancelled', {
      entityId: entity.id,
      refund
    })

    return refund
  }

  /**
   * 出售建筑
   */
  sellBuilding(entity: Entity): number {
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
    const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
    
    if (!construction || !owner) return 0

    const sellPrice = construction.sell()
    if (sellPrice <= 0) return 0

    // 给玩家加钱
    // 注意：这里需要获取玩家的经济组件
    // 简化处理，发送事件让外部处理
    this.world?.events.emit('construction:sold', {
      entityId: entity.id,
      playerId: owner.playerId,
      amount: sellPrice
    })

    // 销毁实体
    entity.destroy()

    return sellPrice
  }

  /**
   * 完成建造（手动触发或自动完成）
   */
  completeBuilding(entity: Entity): void {
    const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
    if (!construction) return

    construction.completeConstruction()

    // 发送事件
    this.world?.events.emit('construction:completed', {
      entityId: entity.id,
      buildingType: construction.buildingType
    })
  }

  /**
   * 获取玩家的所有建筑
   */
  getPlayerBuildings(playerId: string): Entity[] {
    const buildings: Entity[] = []
    
    for (const entity of this.entities) {
      const owner = entity.getComponent<OwnerComponent>(OWNER_TYPE)
      if (owner?.playerId === playerId) {
        buildings.push(entity)
      }
    }

    return buildings
  }

  /**
   * 获取玩家的电力统计
   */
  getPlayerPowerStats(playerId: string): { production: number; consumption: number; net: number } {
    let production = 0
    let consumption = 0

    for (const entity of this.getPlayerBuildings(playerId)) {
      const construction = entity.getComponent<ConstructionComponent>(CONSTRUCTION_TYPE)
      if (construction?.isCompleted()) {
        production += construction.powerProduction
        consumption += construction.powerConsumption
      }
    }

    return { production, consumption, net: production - consumption }
  }

  /**
   * 检查是否有足够电力
   */
  hasEnoughPower(playerId: string, requiredPower: number): boolean {
    const stats = this.getPlayerPowerStats(playerId)
    return stats.net >= requiredPower
  }
}
