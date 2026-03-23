/**
 * ECS 事件总线 - 系统间通信机制
 * 
 * 采用发布-订阅模式，实现组件和系统间的解耦通信
 */

export type EventCallback<T = unknown> = (event: T) => void

export interface EventSubscription {
  unsubscribe(): void
}

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private onceListeners: Map<string, Set<EventCallback>> = new Map()

  /**
   * 订阅事件
   */
  on<T>(eventType: string, callback: EventCallback<T>): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback as EventCallback)

    return {
      unsubscribe: () => {
        this.off(eventType, callback)
      }
    }
  }

  /**
   * 订阅一次性事件
   */
  once<T>(eventType: string, callback: EventCallback<T>): EventSubscription {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set())
    }
    this.onceListeners.get(eventType)!.add(callback as EventCallback)

    return {
      unsubscribe: () => {
        this.off(eventType, callback)
      }
    }
  }

  /**
   * 取消订阅
   */
  off<T>(eventType: string, callback: EventCallback<T>): void {
    this.listeners.get(eventType)?.delete(callback as EventCallback)
    this.onceListeners.get(eventType)?.delete(callback as EventCallback)
  }

  /**
   * 触发事件
   */
  emit<T>(eventType: string, event: T): void {
    // 触发普通监听器
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event)
        } catch (error) {
          console.error(`[EventBus] Error in event listener for ${eventType}:`, error)
        }
      }
    }

    // 触发一次性监听器
    const onceListeners = this.onceListeners.get(eventType)
    if (onceListeners) {
      for (const callback of onceListeners) {
        try {
          callback(event)
        } catch (error) {
          console.error(`[EventBus] Error in once listener for ${eventType}:`, error)
        }
      }
      // 清除已触发的一次性监听器
      onceListeners.clear()
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear()
    this.onceListeners.clear()
  }

  /**
   * 清除特定事件的所有监听器
   */
  clearEvent(eventType: string): void {
    this.listeners.delete(eventType)
    this.onceListeners.delete(eventType)
  }

  /**
   * 获取事件监听器数量（调试用）
   */
  getListenerCount(eventType: string): number {
    const count = this.listeners.get(eventType)?.size || 0
    const onceCount = this.onceListeners.get(eventType)?.size || 0
    return count + onceCount
  }
}

// 全局事件总线实例
export const globalEventBus = new EventBus()
