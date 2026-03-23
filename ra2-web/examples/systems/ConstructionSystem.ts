/**
 * 建造系统
 * 
 * 处理建筑的建造过程
 */

import { System, SystemPriority } from '../core/System'
import { World } from '../core/World'
import { EventBus } from '../core/EventBus'
import { ComponentType, Construction, Health, Power, Transform } from '../core/Component'
import { EntityId } from '../core/Entity'

export class ConstructionSystem extends System {
  constructor(world: World, eventBus: EventBus) {
    super(world, eventBus, SystemPriority.CONSTRUCTION)
  }
  
  getRequiredComponents() {
    return [ComponentType.CONSTRUCTION]
  }
  
  protected subscribeToEvents(): void {
    // 监听建造完成事件，确保电力系统更新
    this.onEvent('build:completed', ({ entityId }) => {
      const power = this.world.getComponent<Power>(entityId, ComponentType.POWER)
      if (power) {
        power.active = true
      }
    })
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const construction = this.getComponent<Construction>(entityId, ComponentType.CONSTRUCTION)!
      
      // 只处理建造中的实体
      if (construction.state !== 'building') continue
      
      // 增加进度
      const progressDelta = deltaTime / construction.buildTime
      construction.progress += progressDelta
      
      // 同步更新生命值（建造中从10%开始）
      const health = this.world.getComponent<Health>(entityId, ComponentType.HEALTH)
      if (health) {
        // 生命值从10%增长到100%
        health.current = health.max * (0.1 + construction.progress * 0.9)
      }
      
      // 建造完成
      if (construction.progress >= 1.0) {
        this.completeConstruction(entityId, construction)
      }
    }
  }
  
  private completeConstruction(entityId: EntityId, construction: Construction): void {
    construction.progress = 1.0
    construction.state = 'completed'
    
    // 恢复满血
    const health = this.world.getComponent<Health>(entityId, ComponentType.HEALTH)
    if (health) {
      health.current = health.max
    }
    
    // 激活电力组件
    const power = this.world.getComponent<Power>(entityId, ComponentType.POWER)
    if (power) {
      power.active = true
    }
    
    console.log(`[ConstructionSystem] Building ${entityId} completed!`)
    
    this.eventBus.emit('build:completed', { entityId })
  }
  
  /**
   * 开始建造（外部调用）
   */
  startConstruction(entityId: EntityId): boolean {
    const construction = this.world.getComponent<Construction>(entityId, ComponentType.CONSTRUCTION)
    if (!construction) return false
    
    if (construction.state !== 'placement') {
      console.warn(`[ConstructionSystem] Cannot start construction for ${entityId}: already ${construction.state}`)
      return false
    }
    
    construction.state = 'building'
    construction.progress = 0
    
    // 初始化生命值为10%
    const health = this.world.getComponent<Health>(entityId, ComponentType.HEALTH)
    if (health) {
      health.current = health.max * 0.1
    }
    
    this.eventBus.emit('build:started', {
      entityId,
      builderId: construction.builderId,
      cost: construction.cost
    })
    
    return true
  }
  
  /**
   * 取消建造（外部调用）
   */
  cancelConstruction(entityId: EntityId): number {
    const construction = this.world.getComponent<Construction>(entityId, ComponentType.CONSTRUCTION)
    if (!construction) return 0
    
    if (construction.state === 'completed') return 0
    
    // 计算退款（建造中的部分按比例退还）
    const refund = Math.floor(construction.cost * (1 - construction.progress) * 0.5)
    
    construction.state = 'completed' // 标记为完成以阻止进一步更新
    
    this.eventBus.emit('build:canceled', { entityId, refund })
    
    return refund
  }
  
  /**
   * 设置建造位置（从放置状态进入待建造）
   */
  placeBuilding(entityId: EntityId, position: { x: number; z: number }): boolean {
    const construction = this.world.getComponent<Construction>(entityId, ComponentType.CONSTRUCTION)
    const transform = this.world.getComponent<Transform>(entityId, ComponentType.TRANSFORM)
    
    if (!construction || !transform) return false
    
    // 更新位置
    transform.x = position.x
    transform.z = position.z
    
    return true
  }
}
