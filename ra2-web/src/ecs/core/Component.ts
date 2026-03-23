/**
 * ECS 组件基类与类型定义
 * 
 * 组件是纯数据容器，不包含任何逻辑
 */

import { Entity } from './Entity'

// 组件类型标识
export type ComponentType = string

// 组件基类
export abstract class Component {
  // 组件类型（由子类实现）
  abstract readonly type: ComponentType

  // 所属实体（由 World 设置）
  entity: Entity | null = null

  // 是否启用
  enabled: boolean = true

  /**
   * 组件被添加到实体时调用
   * 子类可以重写此方法进行初始化
   */
  onAttach(): void {
    // 子类重写
  }

  /**
   * 组件从实体移除时调用
   * 子类可以重写此方法进行清理
   */
  onDetach(): void {
    // 子类重写
  }

  /**
   * 克隆组件（用于复制实体）
   * 子类必须实现此方法
   */
  abstract clone(): Component

  /**
   * 序列化组件为普通对象
   * 用于保存/加载游戏状态
   */
  serialize(): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this)) {
      // 跳过内部字段
      if (key === 'entity' || key === 'type') continue
      data[key] = value
    }
    return data
  }

  /**
   * 从普通对象反序列化
   * 子类可以重写以处理复杂类型
   */
  deserialize(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) {
      if (key in this && key !== 'entity' && key !== 'type') {
        ;(this as Record<string, unknown>)[key] = value
      }
    }
  }
}

// 组件类型到组件类的映射（用于反序列化）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const componentRegistry: Map<ComponentType, new (...args: any[]) => Component> = new Map()

/**
 * 注册组件类型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerComponentType(
  type: ComponentType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor: new (...args: any[]) => Component
): void {
  componentRegistry.set(type, constructor)
}

/**
 * 创建组件实例（用于反序列化）
 */
export function createComponent(type: ComponentType): Component | null {
  const constructor = componentRegistry.get(type)
  if (constructor) {
    // 尝试无参创建，如果不成功则传递默认参数
    try {
      return new constructor()
    } catch {
      // 组件可能需要参数，返回null让调用者处理
      console.warn(`[Component] Component ${type} requires constructor arguments`)
      return null
    }
  }
  console.warn(`[Component] Unknown component type: ${type}`)
  return null
}

/**
 * 获取所有已注册的组件类型
 */
export function getRegisteredComponentTypes(): ComponentType[] {
  return Array.from(componentRegistry.keys())
}
