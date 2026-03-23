/**
 * 核心ECS框架 - 事件总线
 * 
 * 提供发布-订阅模式的事件通信机制
 */

// 事件定义
export interface GameEvents {
  // 实体生命周期
  'entity:created': { entityId: string; type: string }
  'entity:destroyed': { entityId: string; type: string; killerId?: string }
  
  // 移动事件
  'movement:started': { entityId: string; destination: { x: number; z: number } }
  'movement:completed': { entityId: string }
  'movement:blocked': { entityId: string; position: { x: number; z: number } }
  
  // 战斗事件
  'combat:attack': { attackerId: string; targetId: string; weaponId: string }
  'combat:damage': { source: string; target: string; damage: number; damageType: string }
  'combat:killed': { killerId: string; victimId: string }
  'combat:veterancy': { entityId: string; newLevel: string }
  
  // 建造事件
  'build:started': { entityId: string; builderId?: string; cost: number }
  'build:completed': { entityId: string }
  'build:canceled': { entityId: string; refund: number }
  
  // 生产事件
  'production:queued': { producerId: string; item: any }
  'production:started': { producerId: string; item: any }
  'production:completed': { producerId: string; item: any; entityId: string }
  'production:canceled': { producerId: string; item: any; refund: number }
  
  // 经济事件
  'economy:credits_changed': { playerId: string; newAmount: number; delta: number }
  'economy:harvested': { harvesterId: string; resourceId: string; amount: number }
  'economy:refined': { refineryId: string; playerId: string; credits: number }
  
  // 电力事件
  'power:changed': { playerId: string; production: number; consumption: number }
  'power:low': { playerId: string; deficit: number }
  'power:restored': { playerId: string }
  
  // 科技事件
  'tech:unlocked': { playerId: string; techId: string }
  'tech:infiltrated': { playerId: string; targetFaction: string; unlockedTechs: string[] }
  
  // 输入事件
  'input:select': { playerId: string; entityIds: string[] }
  'input:command': { playerId: string; command: any }
  'input:placement': { playerId: string; buildingType: string; position: { x: number; z: number } }
  
  // 游戏状态
  'game:started': { mapName: string; players: any[] }
  'game:paused': { byPlayer?: string }
  'game:resumed': {}
  'game:victory': { winner: string }
  'game:defeat': { loser: string }
  
  // 迷雾事件
  'fog:revealed': { playerId: string; cells: { x: number; y: number }[] }
  'fog:hidden': { playerId: string; cells: { x: number; y: number }[] }
}

export type EventName = keyof GameEvents

// 事件处理器类型
type EventHandler<T extends EventName> = (data: GameEvents[T]) => void

/**
 * 事件总线实现
 */
export class EventBus {
  private listeners: Map<string, Set<Function>> = new Map()
  private onceListeners: Map<string, Set<Function>> = new Map()
  
  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  on<T extends EventName>(
    event: T,
    handler: EventHandler<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    
    return () => this.off(event, handler)
  }
  
  /**
   * 订阅一次性事件
   */
  once<T extends EventName>(
    event: T,
    handler: EventHandler<T>
  ): void {
    const onceWrapper = (data: GameEvents[T]) => {
      this.off(event, onceWrapper)
      handler(data)
    }
    this.on(event, onceWrapper)
  }
  
  /**
   * 取消订阅
   */
  off<T extends EventName>(
    event: T,
    handler: EventHandler<T>
  ): void {
    this.listeners.get(event)?.delete(handler)
  }
  
  /**
   * 触发事件
   */
  emit<T extends EventName>(event: T, data: GameEvents[T]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(h => {
        try {
          h(data)
        } catch (err) {
          console.error(`Event handler error for ${event}:`, err)
        }
      })
    }
  }
  
  /**
   * 获取某事件的监听器数量
   */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size || 0
  }
  
  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: EventName): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

// 全局事件总线（单例）
let globalEventBus: EventBus | null = null

export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus()
  }
  return globalEventBus
}

export function resetGlobalEventBus(): void {
  globalEventBus = null
}
