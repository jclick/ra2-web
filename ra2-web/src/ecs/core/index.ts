/**
 * ECS 核心框架入口
 * 
 * Week 1: ECS 核心框架
 */

export { EventBus, globalEventBus } from './EventBus'
export type { EventCallback, EventSubscription } from './EventBus'
export { Component, registerComponentType, createComponent, getRegisteredComponentTypes } from './Component'
export type { ComponentType } from './Component'
export { Entity } from './Entity'
export { System, SystemPriority, EntitySystem } from './System'
export type { ISystem } from './System'
export { World } from './World'
