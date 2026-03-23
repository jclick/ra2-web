/**
 * Economy 组件
 * 
 * 管理实体的经济能力
 * 用于玩家和采矿单位
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'
import { Vector3 } from '../../game/types'

export const ECONOMY_TYPE: ComponentType = 'economy'

// 资源类型
export enum ResourceType {
  ORE = 'ore',       // 矿石
  GEMS = 'gems'      // 宝石
}

// 采矿车状态
export enum HarvesterState {
  IDLE = 'idle',           // 空闲
  MOVING_TO_FIELD = 'moving_to_field', // 前往矿区
  HARVESTING = 'harvesting', // 采集中
  FULL = 'full',           // 满载
  RETURNING = 'returning', // 返回
  UNLOADING = 'unloading'  // 卸载中
}

export class EconomyComponent extends Component {
  readonly type = ECONOMY_TYPE

  // 当前资金
  credits: number

  // 最大资金上限
  maxCredits: number

  // 是否是采矿车
  isHarvester: boolean

  // 采矿车状态
  harvesterState: HarvesterState

  // 载货容量
  capacity: number

  // 当前载货量
  currentLoad: number

  // 采集速度（单位/秒）
  harvestRate: number

  // 卸载速度（单位/秒）
  unloadRate: number

  // 当前资源类型
  currentResourceType: ResourceType

  // 关联的精炼厂ID
  refineryId: number | null

  // 当前目标矿区位置
  targetOreField: Vector3 | null

  constructor(
    initialCredits: number = 0,
    isHarvester: boolean = false
  ) {
    super()
    this.credits = initialCredits
    this.maxCredits = 999999
    this.isHarvester = isHarvester
    this.harvesterState = HarvesterState.IDLE
    this.capacity = isHarvester ? 20 : 0
    this.currentLoad = 0
    this.harvestRate = isHarvester ? 2 : 0
    this.unloadRate = isHarvester ? 5 : 0
    this.currentResourceType = ResourceType.ORE
    this.refineryId = null
    this.targetOreField = null
  }

  /**
   * 增加资金
   */
  addCredits(amount: number): number {
    const actualAdd = Math.min(amount, this.maxCredits - this.credits)
    this.credits += actualAdd
    return actualAdd
  }

  /**
   * 消费资金
   */
  spendCredits(amount: number): boolean {
    if (this.credits >= amount) {
      this.credits -= amount
      return true
    }
    return false
  }

  /**
   * 检查是否有足够资金
   */
  canAfford(amount: number): boolean {
    return this.credits >= amount
  }

  /**
   * 采集资源
   */
  harvest(deltaTime: number): number {
    if (!this.isHarvester || this.harvesterState !== HarvesterState.HARVESTING) {
      return 0
    }

    const amount = this.harvestRate * deltaTime
    const actualHarvest = Math.min(amount, this.capacity - this.currentLoad)
    this.currentLoad += actualHarvest

    if (this.currentLoad >= this.capacity) {
      this.harvesterState = HarvesterState.FULL
    }

    return actualHarvest
  }

  /**
   * 卸载资源
   */
  unload(deltaTime: number): number {
    if (!this.isHarvester || this.harvesterState !== HarvesterState.UNLOADING) {
      return 0
    }

    const amount = this.unloadRate * deltaTime
    const actualUnload = Math.min(amount, this.currentLoad)
    this.currentLoad -= actualUnload

    if (this.currentLoad <= 0) {
      this.currentLoad = 0
      this.harvesterState = HarvesterState.IDLE
    }

    return actualUnload
  }

  /**
   * 获取载货百分比
   */
  getLoadPercent(): number {
    if (this.capacity <= 0) return 0
    return this.currentLoad / this.capacity
  }

  /**
   * 是否满载
   */
  isFull(): boolean {
    return this.currentLoad >= this.capacity
  }

  /**
   * 是否空载
   */
  isEmpty(): boolean {
    return this.currentLoad <= 0
  }

  /**
   * 设置目标矿区
   */
  setTargetOreField(position: Vector3 | null): void {
    this.targetOreField = position
  }

  /**
   * 设置精炼厂
   */
  setRefinery(refineryId: number | null): void {
    this.refineryId = refineryId
  }

  /**
   * 开始采集
   */
  startHarvesting(): void {
    if (this.isHarvester && !this.isFull()) {
      this.harvesterState = HarvesterState.HARVESTING
    }
  }

  /**
   * 停止采集
   */
  stopHarvesting(): void {
    if (this.isHarvester) {
      this.harvesterState = HarvesterState.IDLE
    }
  }

  /**
   * 开始卸载
   */
  startUnloading(): void {
    if (this.isHarvester && !this.isEmpty()) {
      this.harvesterState = HarvesterState.UNLOADING
    }
  }

  /**
   * 开始返回
   */
  startReturning(): void {
    if (this.isHarvester) {
      this.harvesterState = HarvesterState.RETURNING
    }
  }

  clone(): EconomyComponent {
    const clone = new EconomyComponent(this.credits, this.isHarvester)
    clone.maxCredits = this.maxCredits
    clone.harvesterState = this.harvesterState
    clone.capacity = this.capacity
    clone.currentLoad = this.currentLoad
    clone.harvestRate = this.harvestRate
    clone.unloadRate = this.unloadRate
    clone.currentResourceType = this.currentResourceType
    clone.refineryId = this.refineryId
    clone.targetOreField = this.targetOreField ? { ...this.targetOreField } : null
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      credits: this.credits,
      maxCredits: this.maxCredits,
      isHarvester: this.isHarvester,
      harvesterState: this.harvesterState,
      capacity: this.capacity,
      currentLoad: this.currentLoad,
      harvestRate: this.harvestRate,
      unloadRate: this.unloadRate,
      currentResourceType: this.currentResourceType,
      refineryId: this.refineryId,
      targetOreField: this.targetOreField
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.credits !== undefined) this.credits = data.credits as number
    if (data.maxCredits !== undefined) this.maxCredits = data.maxCredits as number
    if (data.isHarvester !== undefined) this.isHarvester = data.isHarvester as boolean
    if (data.harvesterState !== undefined) this.harvesterState = data.harvesterState as HarvesterState
    if (data.capacity !== undefined) this.capacity = data.capacity as number
    if (data.currentLoad !== undefined) this.currentLoad = data.currentLoad as number
    if (data.harvestRate !== undefined) this.harvestRate = data.harvestRate as number
    if (data.unloadRate !== undefined) this.unloadRate = data.unloadRate as number
    if (data.currentResourceType !== undefined) this.currentResourceType = data.currentResourceType as ResourceType
    if (data.refineryId !== undefined) this.refineryId = data.refineryId as number | null
    if (data.targetOreField !== undefined) this.targetOreField = data.targetOreField as Vector3 | null
  }
}

// 注册组件类型
registerComponentType(ECONOMY_TYPE, EconomyComponent)
