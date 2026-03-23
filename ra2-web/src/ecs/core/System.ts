/**
 * ECS 系统基类
 * 
 * 系统包含处理组件的逻辑，没有状态
 */

import { World } from './World'
import { Entity } from './Entity'
import { ComponentType } from './Component'

// 系统优先级（数值越小优先级越高）
export enum SystemPriority {
  CRITICAL = 0,    // 输入处理、网络同步
  HIGH = 100,      // 物理、移动
  NORMAL = 200,    // 游戏逻辑、AI
  LOW = 300,       // 渲染、UI
  BACKGROUND = 400 // 日志、统计
}

// 系统接口
export interface ISystem {
  readonly priority: number
  enabled: boolean
  
  initialize(world: World): void
  update(deltaTime: number): void
  dispose(): void
}

// 系统基类
export abstract class System implements ISystem {
  // 系统优先级（子类可覆盖）
  readonly priority: number = SystemPriority.NORMAL

  // 是否启用
  enabled: boolean = true

  // 所属世界
  protected world: World | null = null

  // 系统关注的组件类型（可选，用于查询优化）
  protected componentTypes: ComponentType[] = []

  /**
   * 系统初始化
   * 在添加到世界时调用
   */
  initialize(world: World): void {
    this.world = world
  }

  /**
   * 系统更新
   * 每帧调用
   */
  abstract update(deltaTime: number): void

  /**
   * 系统释放
   * 从世界移除时调用
   */
  dispose(): void {
    this.world = null
  }

  /**
   * 获取具有指定组件类型的所有实体
   */
  protected queryEntities(...componentTypes: ComponentType[]): Entity[] {
    if (!this.world) return []
    return this.world.queryEntities(...componentTypes)
  }

  /**
   * 获取单个实体
   */
  protected getEntity(entityId: number): Entity | null {
    if (!this.world) return null
    return this.world.getEntity(entityId)
  }
}

// 实体过滤系统基类
// 自动追踪具有特定组件组合的实体
export abstract class EntitySystem extends System {
  // 当前匹配的实体
  protected entities: Set<Entity> = new Set()

  constructor(...componentTypes: ComponentType[]) {
    super()
    this.componentTypes = componentTypes
  }

  initialize(world: World): void {
    super.initialize(world)
    
    // 初始查询
    this.refreshEntities()
    
    // 监听组件变化
    world.onComponentAdded = (entity, _component) => {
      this.onEntityChanged(entity)
    }
    
    world.onComponentRemoved = (entity, _componentType) => {
      this.onEntityChanged(entity)
    }
  }

  /**
   * 刷新实体列表
   */
  protected refreshEntities(): void {
    this.entities.clear()
    const matching = this.queryEntities(...this.componentTypes)
    for (const entity of matching) {
      this.entities.add(entity)
      this.onEntityAdded(entity)
    }
  }

  /**
   * 实体变化处理
   */
  protected onEntityChanged(entity: Entity): void {
    const matches = entity.hasAllComponents(this.componentTypes)
    const currentlyTracked = this.entities.has(entity)

    if (matches && !currentlyTracked) {
      this.entities.add(entity)
      this.onEntityAdded(entity)
    } else if (!matches && currentlyTracked) {
      this.entities.delete(entity)
      this.onEntityRemoved(entity)
    }
  }

  /**
   * 实体加入系统时调用
   */
  protected onEntityAdded(_entity: Entity): void {
    // 子类重写
  }

  /**
   * 实体从系统移除时调用
   */
  protected onEntityRemoved(_entity: Entity): void {
    // 子类重写
  }

  update(deltaTime: number): void {
    if (!this.enabled) return
    
    for (const entity of this.entities) {
      if (entity.active) {
        this.updateEntity(entity, deltaTime)
      }
    }
  }

  /**
   * 更新单个实体
   */
  protected abstract updateEntity(entity: Entity, deltaTime: number): void
}
