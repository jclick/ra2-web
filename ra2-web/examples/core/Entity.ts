/**
 * 核心ECS框架 - 实体定义
 * 
 * 实体在ECS架构中只是一个唯一标识符，不包含任何数据或逻辑
 */

export type EntityId = string
export type EntityType = 'UNIT' | 'BUILDING' | 'PROJECTILE' | 'RESOURCE' | 'GHOST'

export interface Entity {
  readonly id: EntityId
  readonly type: EntityType
}

/**
 * 实体工厂
 */
export class EntityFactory {
  private static counters: Map<EntityType, number> = new Map()
  
  static create(type: EntityType): Entity {
    const count = (this.counters.get(type) || 0) + 1
    this.counters.set(type, count)
    
    return {
      id: `${type.toLowerCase()}_${count}_${Date.now()}`,
      type
    }
  }
  
  static reset(): void {
    this.counters.clear()
  }
}
