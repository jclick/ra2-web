/**
 * ECS 实体定义
 * 
 * 实体是游戏对象的唯一标识符，本身不包含数据
 * 所有数据通过组件附加到实体上
 */

import { Component, ComponentType } from './Component'

// 实体ID生成器
let nextEntityId = 1

export class Entity {
  // 唯一标识符
  readonly id: number

  // 实体名称（调试用）
  name: string

  // 是否激活
  active: boolean = true

  // 所属世界
  private world: World | null = null

  // 组件存储
  private components: Map<ComponentType, Component> = new Map()

  constructor(name?: string) {
    this.id = nextEntityId++
    this.name = name || `Entity_${this.id}`
  }

  /**
   * 设置所属世界（内部使用）
   */
  setWorld(world: World | null): void {
    this.world = world
  }

  /**
   * 获取所属世界
   */
  getWorld(): World | null {
    return this.world
  }

  /**
   * 添加组件
   */
  addComponent<T extends Component>(component: T): T {
    const type = component.type
    
    // 检查是否已存在相同类型的组件
    if (this.components.has(type)) {
      console.warn(`[Entity] Component of type ${type} already exists on entity ${this.name}, replacing`)
      this.removeComponent(type)
    }

    // 设置组件的实体引用
    component.entity = this
    
    // 存储组件
    this.components.set(type, component)
    
    // 调用组件的附加回调
    component.onAttach()

    // 通知世界组件添加
    if (this.world?.onComponentAdded) {
      this.world.onComponentAdded(this, component)
    }

    return component
  }

  /**
   * 移除组件
   */
  removeComponent(type: ComponentType): boolean {
    const component = this.components.get(type)
    if (!component) return false

    // 调用组件的分离回调
    component.onDetach()
    
    // 清除实体引用
    component.entity = null
    
    // 删除组件
    this.components.delete(type)

    // 通知世界组件移除
    if (this.world?.onComponentRemoved) {
      this.world.onComponentRemoved(this, type)
    }

    return true
  }

  /**
   * 获取组件
   */
  getComponent<T extends Component>(type: ComponentType): T | null {
    return (this.components.get(type) as T) || null
  }

  /**
   * 检查是否有指定类型的组件
   */
  hasComponent(type: ComponentType): boolean {
    return this.components.has(type)
  }

  /**
   * 检查是否有所有指定的组件类型
   */
  hasAllComponents(types: ComponentType[]): boolean {
    return types.every(type => this.components.has(type))
  }

  /**
   * 检查是否有任意一个指定的组件类型
   */
  hasAnyComponent(types: ComponentType[]): boolean {
    return types.some(type => this.components.has(type))
  }

  /**
   * 获取所有组件
   */
  getAllComponents(): Component[] {
    return Array.from(this.components.values())
  }

  /**
   * 获取所有组件类型
   */
  getComponentTypes(): ComponentType[] {
    return Array.from(this.components.keys())
  }

  /**
   * 销毁实体（移除所有组件）
   */
  destroy(): void {
    // 移除所有组件
    for (const [type] of this.components) {
      this.removeComponent(type)
    }
    
    // 从世界中移除
    this.world?.removeEntity(this)
    
    this.active = false
  }

  /**
   * 克隆实体
   */
  clone(newName?: string): Entity {
    const clone = new Entity(newName || `${this.name}_clone`)
    
    for (const component of this.components.values()) {
      clone.addComponent(component.clone())
    }

    return clone
  }

  /**
   * 序列化实体
   */
  serialize(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      active: this.active,
      components: this.getAllComponents().map(c => ({
        type: c.type,
        data: c.serialize()
      }))
    }
  }

  toString(): string {
    const types = this.getComponentTypes().join(', ')
    return `Entity(${this.id}: ${this.name}) [${types}]`
  }
}

// 前向声明，避免循环依赖
import type { World } from './World'
