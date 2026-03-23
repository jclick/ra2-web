/**
 * 核心ECS框架 - 世界管理器
 * 
 * World 是ECS的核心，管理所有实体、组件和系统
 */

import { Entity, EntityId, EntityType, EntityFactory } from './Entity'
import { Component, ComponentType } from './Component'
import { System } from './System'
import { EventBus } from './EventBus'

/**
 * 世界配置
 */
export interface WorldConfig {
  mapWidth: number
  mapHeight: number
  maxEntities?: number
}

/**
 * 世界/场景管理器
 */
export class World {
  private entities: Map<EntityId, Entity> = new Map()
  private components: Map<ComponentType, Map<EntityId, Component>> = new Map()
  private systems: System[] = []
  private eventBus: EventBus
  private config: WorldConfig
  
  // 性能统计
  private stats = {
    entityCount: 0,
    componentCount: 0,
    lastUpdateTime: 0
  }
  
  constructor(eventBus: EventBus, config: WorldConfig) {
    this.eventBus = eventBus
    this.config = config
  }
  
  // ============================================
  // 实体管理
  // ============================================
  
  /**
   * 创建实体
   */
  createEntity(type: EntityType): Entity {
    const entity = EntityFactory.create(type)
    this.entities.set(entity.id, entity)
    this.stats.entityCount++
    
    this.eventBus.emit('entity:created', { entityId: entity.id, type })
    return entity
  }
  
  /**
   * 销毁实体
   */
  destroyEntity(entityId: EntityId): void {
    const entity = this.entities.get(entityId)
    if (!entity) return
    
    // 移除所有组件
    for (const [type, storage] of this.components) {
      if (storage.has(entityId)) {
        storage.delete(entityId)
        this.stats.componentCount--
      }
    }
    
    this.entities.delete(entityId)
    this.stats.entityCount--
    
    this.eventBus.emit('entity:destroyed', { entityId, type: entity.type })
  }
  
  /**
   * 获取实体
   */
  getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId)
  }
  
  /**
   * 检查实体是否存在
   */
  hasEntity(entityId: EntityId): boolean {
    return this.entities.has(entityId)
  }
  
  /**
   * 获取所有实体
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }
  
  /**
   * 获取特定类型的实体
   */
  getEntitiesByType(type: EntityType): Entity[] {
    return this.getAllEntities().filter(e => e.type === type)
  }
  
  // ============================================
  // 组件管理
  // ============================================
  
  /**
   * 添加组件到实体
   */
  addComponent<T extends Component>(
    entityId: EntityId,
    type: ComponentType,
    component: T
  ): void {
    if (!this.hasEntity(entityId)) {
      throw new Error(`Cannot add component to non-existent entity: ${entityId}`)
    }
    
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
    }
    
    this.components.get(type)!.set(entityId, component)
    this.stats.componentCount++
  }
  
  /**
   * 获取实体的组件
   */
  getComponent<T extends Component>(
    entityId: EntityId,
    type: ComponentType
  ): T | undefined {
    return this.components.get(type)?.get(entityId) as T
  }
  
  /**
   * 检查实体是否有指定组件
   */
  hasComponent(entityId: EntityId, type: ComponentType): boolean {
    return this.components.get(type)?.has(entityId) ?? false
  }
  
  /**
   * 移除组件
   */
  removeComponent(entityId: EntityId, type: ComponentType): boolean {
    const storage = this.components.get(type)
    if (storage?.has(entityId)) {
      storage.delete(entityId)
      this.stats.componentCount--
      return true
    }
    return false
  }
  
  /**
   * 获取实体的所有组件
   */
  getEntityComponents(entityId: EntityId): Component[] {
    const components: Component[] = []
    for (const storage of this.components.values()) {
      const comp = storage.get(entityId)
      if (comp) components.push(comp)
    }
    return components
  }
  
  // ============================================
  // 查询系统
  // ============================================
  
  /**
   * 查询具有所有指定组件的实体
   */
  query(requiredComponents: ComponentType[]): EntityId[] {
    if (requiredComponents.length === 0) {
      return Array.from(this.entities.keys())
    }
    
    const result: EntityId[] = []
    const [first, ...rest] = requiredComponents
    
    // 从第一个组件类型开始（通常数据量最小）
    const firstStorage = this.components.get(first)
    if (!firstStorage) return []
    
    for (const entityId of firstStorage.keys()) {
      // 检查是否拥有所有其他必需组件
      const hasAll = rest.every(type => 
        this.components.get(type)?.has(entityId)
      )
      
      if (hasAll) {
        result.push(entityId)
      }
    }
    
    return result
  }
  
  /**
   * 查询具有任意指定组件的实体
   */
  queryAny(componentTypes: ComponentType[]): EntityId[] {
    const result = new Set<EntityId>()
    
    for (const type of componentTypes) {
      const storage = this.components.get(type)
      if (storage) {
        for (const entityId of storage.keys()) {
          result.add(entityId)
        }
      }
    }
    
    return Array.from(result)
  }
  
  // ============================================
  // 系统管理
  // ============================================
  
  /**
   * 注册系统
   */
  registerSystem(system: System): void {
    this.systems.push(system)
    // 按优先级排序
    this.systems.sort((a, b) => a.priority - b.priority)
    system.initialize()
  }
  
  /**
   * 移除系统
   */
  removeSystem(system: System): void {
    const index = this.systems.indexOf(system)
    if (index > -1) {
      this.systems[index].dispose()
      this.systems.splice(index, 1)
    }
  }
  
  /**
   * 获取所有系统
   */
  getSystems(): System[] {
    return [...this.systems]
  }
  
  // ============================================
  // 主循环
  // ============================================
  
  /**
   * 更新所有系统
   */
  update(deltaTime: number): void {
    const startTime = performance.now()
    
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime)
      }
    }
    
    this.stats.lastUpdateTime = performance.now() - startTime
  }
  
  // ============================================
  // 状态管理
  // ============================================
  
  /**
   * 序列化世界状态（用于存档/网络同步）
   */
  serialize(): object {
    const entityData: any[] = []
    
    for (const [entityId, entity] of this.entities) {
      const components = this.getEntityComponents(entityId)
      entityData.push({
        id: entityId,
        type: entity.type,
        components: components.map(c => ({
          type: c.type,
          data: c
        }))
      })
    }
    
    return {
      config: this.config,
      entities: entityData,
      timestamp: Date.now()
    }
  }
  
  /**
   * 从序列化数据恢复（用于读档/网络同步）
   */
  deserialize(data: any): void {
    // 清空当前世界
    this.clear()
    
    // 恢复配置
    this.config = data.config
    
    // 恢复实体
    for (const entityData of data.entities) {
      // 创建实体
      const entity = this.createEntity(entityData.type)
      
      // 添加组件
      for (const compData of entityData.components) {
        this.addComponent(entity.id, compData.type, compData.data)
      }
    }
  }
  
  /**
   * 清空世界
   */
  clear(): void {
    // 销毁所有实体
    for (const entityId of this.entities.keys()) {
      this.eventBus.emit('entity:destroyed', { entityId, type: 'unknown' })
    }
    
    this.entities.clear()
    this.components.clear()
    this.systems = []
    this.stats = { entityCount: 0, componentCount: 0, lastUpdateTime: 0 }
    EntityFactory.reset()
  }
  
  // ============================================
  // 统计信息
  // ============================================
  
  getStats() {
    return { ...this.stats }
  }
  
  getConfig() {
    return { ...this.config }
  }
}
