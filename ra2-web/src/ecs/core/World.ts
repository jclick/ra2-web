/**
 * ECS 世界管理器
 * 
 * 管理所有实体、组件和系统
 * 是ECS架构的核心协调器
 */

import { Entity } from './Entity'
import { Component, ComponentType } from './Component'
import type { ISystem } from './System'
import { EventBus } from './EventBus'

export class World {
  // 所有实体
  private entities: Map<number, Entity> = new Map()

  // 所有系统（按优先级排序）
  private systems: ISystem[] = []

  // 事件总线
  readonly events: EventBus

  // 是否正在运行
  private running: boolean = false

  // 时间统计
  private totalTime: number = 0
  private frameCount: number = 0

  // 组件变化回调（供系统使用）
  onComponentAdded?: (entity: Entity, component: Component) => void
  onComponentRemoved?: (entity: Entity, componentType: ComponentType) => void

  constructor(eventBus?: EventBus) {
    this.events = eventBus || new EventBus()
  }

  // ==================== 实体管理 ====================

  /**
   * 创建实体
   */
  createEntity(name?: string): Entity {
    const entity = new Entity(name)
    entity.setWorld(this)
    this.entities.set(entity.id, entity)
    
    this.events.emit('entity:created', { entity })
    
    return entity
  }

  /**
   * 移除实体
   */
  removeEntity(entity: Entity | number): boolean {
    const id = typeof entity === 'number' ? entity : entity.id
    const target = this.entities.get(id)
    
    if (!target) return false

    // 清理实体
    target.setWorld(null)
    target.active = false
    
    // 从实体列表移除
    this.entities.delete(id)

    this.events.emit('entity:removed', { entity: target })

    return true
  }

  /**
   * 获取实体
   */
  getEntity(id: number): Entity | null {
    return this.entities.get(id) || null
  }

  /**
   * 获取所有实体
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }

  /**
   * 获取实体数量
   */
  getEntityCount(): number {
    return this.entities.size
  }

  /**
   * 查询具有指定组件的实体
   */
  queryEntities(...componentTypes: ComponentType[]): Entity[] {
    const result: Entity[] = []
    
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasAllComponents(componentTypes)) {
        result.push(entity)
      }
    }

    return result
  }

  /**
   * 查询具有任意一个指定组件的实体
   */
  queryEntitiesWithAny(...componentTypes: ComponentType[]): Entity[] {
    const result: Entity[] = []
    
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasAnyComponent(componentTypes)) {
        result.push(entity)
      }
    }

    return result
  }

  // ==================== 系统管理 ====================

  /**
   * 添加系统
   */
  addSystem(system: ISystem): this {
    // 检查是否已存在
    if (this.systems.includes(system)) {
      console.warn('[World] System already added')
      return this
    }

    // 按优先级插入
    const index = this.systems.findIndex(s => s.priority > system.priority)
    if (index === -1) {
      this.systems.push(system)
    } else {
      this.systems.splice(index, 0, system)
    }

    // 初始化系统
    system.initialize(this)

    return this
  }

  /**
   * 移除系统
   */
  removeSystem(system: ISystem): boolean {
    const index = this.systems.indexOf(system)
    if (index === -1) return false

    system.dispose()
    this.systems.splice(index, 1)
    return true
  }

  /**
   * 获取系统
   */
  getSystem<T extends ISystem>(constructor: new (...args: unknown[]) => T): T | null {
    return this.systems.find(s => s instanceof constructor) as T || null
  }

  /**
   * 获取所有系统
   */
  getAllSystems(): ISystem[] {
    return [...this.systems]
  }

  // ==================== 游戏循环 ====================

  /**
   * 更新所有系统
   */
  update(deltaTime: number): void {
    if (!this.running) return

    this.totalTime += deltaTime
    this.frameCount++

    for (const system of this.systems) {
      if (system.enabled) {
        try {
          system.update(deltaTime)
        } catch (error) {
          console.error(`[World] Error in system update:`, error)
        }
      }
    }
  }

  /**
   * 开始运行
   */
  start(): void {
    this.running = true
    this.events.emit('world:started', { world: this })
  }

  /**
   * 暂停
   */
  pause(): void {
    this.running = false
    this.events.emit('world:paused', { world: this })
  }

  /**
   * 恢复
   */
  resume(): void {
    this.running = true
    this.events.emit('world:resumed', { world: this })
  }

  /**
   * 停止并清理
   */
  stop(): void {
    this.running = false
    this.events.emit('world:stopped', { world: this })
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.running
  }

  // ==================== 统计信息 ====================

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      entityCount: this.entities.size,
      systemCount: this.systems.length,
      totalTime: this.totalTime,
      frameCount: this.frameCount,
      averageFPS: this.frameCount > 0 ? this.frameCount / this.totalTime : 0
    }
  }

  // ==================== 序列化 ====================

  /**
   * 序列化世界状态
   */
  serialize(): Record<string, unknown> {
    return {
      entities: this.getAllEntities().map(e => e.serialize()),
      totalTime: this.totalTime,
      frameCount: this.frameCount
    }
  }

  /**
   * 清空世界
   */
  clear(): void {
    // 停止运行
    this.stop()

    // 释放所有系统
    for (const system of this.systems) {
      system.dispose()
    }
    this.systems = []

    // 移除所有实体
    for (const entity of this.entities.values()) {
      entity.setWorld(null)
    }
    this.entities.clear()

    // 重置统计
    this.totalTime = 0
    this.frameCount = 0

    this.events.emit('world:cleared', { world: this })
  }
}
