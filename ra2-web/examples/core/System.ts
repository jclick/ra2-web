/**
 * 核心ECS框架 - 系统基类
 * 
 * 系统包含处理组件的逻辑，不包含数据
 */

import { World } from './World'
import { EventBus, EventName, GameEvents } from './EventBus'
import { ComponentType, Component } from './Component'
import { EntityId } from './Entity'

/**
 * 系统优先级 - 决定系统更新顺序
 */
export enum SystemPriority {
  INPUT = 0,       // 输入处理最先
  LOGIC = 100,     // 游戏逻辑
  MOVEMENT = 200,  // 移动
  COMBAT = 300,    // 战斗
  ECONOMY = 400,   // 经济
  CONSTRUCTION = 500, // 建造
  PRODUCTION = 600,   // 生产
  POWER = 700,     // 电力
  VISION = 800,    // 视野
  FOG_OF_WAR = 900, // 战争迷雾
  RENDER = 1000    // 渲染最后
}

/**
 * 系统基类
 */
export abstract class System {
  protected world: World
  protected eventBus: EventBus
  readonly priority: number
  enabled: boolean = true
  
  constructor(world: World, eventBus: EventBus, priority: number = SystemPriority.LOGIC) {
    this.world = world
    this.eventBus = eventBus
    this.priority = priority
    this.subscribeToEvents()
  }
  
  /**
   * 系统初始化（可选重写）
   */
  initialize(): void {}
  
  /**
   * 每帧更新（必须实现）
   */
  abstract update(deltaTime: number): void
  
  /**
   * 获取系统需要的组件类型
   */
  abstract getRequiredComponents(): ComponentType[]
  
  /**
   * 订阅事件（可选重写）
   */
  protected subscribeToEvents(): void {}
  
  /**
   * 便捷方法：订阅事件
   */
  protected onEvent<T extends EventName>(
    event: T,
    handler: (data: GameEvents[T]) => void
  ): void {
    this.eventBus.on(event, handler)
  }
  
  /**
   * 便捷方法：获取符合条件的所有实体
   */
  protected getEntities(): EntityId[] {
    return this.world.query(this.getRequiredComponents())
  }
  
  /**
   * 便捷方法：获取单个组件
   */
  protected getComponent<T extends Component>(
    entityId: EntityId,
    type: ComponentType
  ): T | undefined {
    return this.world.getComponent<T>(entityId, type)
  }
  
  /**
   * 系统销毁（可选重写）
   */
  dispose(): void {}
}
