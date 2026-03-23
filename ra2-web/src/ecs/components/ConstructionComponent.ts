/**
 * Construction 组件
 * 
 * 管理建筑物的建造状态和进度
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const CONSTRUCTION_TYPE: ComponentType = 'construction'

// 建造状态
export enum ConstructionState {
  PLANNED = 'planned',         // 规划中
  CONSTRUCTING = 'constructing', // 建造中
  COMPLETED = 'completed',     // 完成
  DAMAGED = 'damaged',         // 受损
  DESTROYED = 'destroyed'      // 被摧毁
}

// 建筑物类型
export enum BuildingCategory {
  BASE = 'base',               // 基地建筑
  POWER = 'power',             // 电力
  BARRACKS = 'barracks',       // 兵营
  FACTORY = 'factory',         // 工厂
  DEFENSE = 'defense',         // 防御
  RESOURCE = 'resource',       // 资源
  TECH = 'tech',               // 科技
  SUPER = 'super'              // 超级武器
}

export class ConstructionComponent extends Component {
  readonly type = CONSTRUCTION_TYPE

  // 建筑物类型
  buildingType: string

  // 建筑物分类
  category: BuildingCategory

  // 建造状态
  state: ConstructionState

  // 建造进度 (0-1)
  progress: number

  // 总建造时间（秒）
  buildTime: number

  // 建造成本
  cost: number

  // 当前已投入资金（退款用）
  invested: number

  // 电力消耗
  powerConsumption: number

  // 电力产出
  powerProduction: number

  // 是否可以出售
  canSell: boolean

  // 出售价格比例
  sellRatio: number

  // 是否是基础建筑（被摧毁后游戏结束）
  isCritical: boolean

  // 占用地块大小
  footprint: { width: number; height: number }

  // 建造开始时间
  constructionStartTime: number

  constructor(
    buildingType: string,
    category: BuildingCategory,
    buildTime: number = 10,
    cost: number = 1000
  ) {
    super()
    this.buildingType = buildingType
    this.category = category
    this.state = ConstructionState.PLANNED
    this.progress = 0
    this.buildTime = buildTime
    this.cost = cost
    this.invested = 0
    this.powerConsumption = 0
    this.powerProduction = 0
    this.canSell = true
    this.sellRatio = 0.5
    this.isCritical = false
    this.footprint = { width: 1, height: 1 }
    this.constructionStartTime = 0
  }

  /**
   * 开始建造
   */
  startConstruction(): void {
    if (this.state === ConstructionState.PLANNED) {
      this.state = ConstructionState.CONSTRUCTING
      this.constructionStartTime = Date.now()
    }
  }

  /**
   * 更新建造进度
   */
  updateProgress(deltaTime: number): void {
    if (this.state !== ConstructionState.CONSTRUCTING) return

    this.progress += deltaTime / this.buildTime
    
    if (this.progress >= 1) {
      this.progress = 1
      this.completeConstruction()
    }
  }

  /**
   * 完成建造
   */
  completeConstruction(): void {
    this.state = ConstructionState.COMPLETED
    this.progress = 1
  }

  /**
   * 暂停建造
   */
  pauseConstruction(): void {
    if (this.state === ConstructionState.CONSTRUCTING) {
      this.state = ConstructionState.PLANNED
    }
  }

  /**
   * 取消建造（退款）
   */
  cancelConstruction(): number {
    const refund = this.invested
    this.invested = 0
    this.progress = 0
    this.state = ConstructionState.PLANNED
    return refund
  }

  /**
   * 出售建筑
   */
  sell(): number {
    if (!this.canSell || this.state !== ConstructionState.COMPLETED) {
      return 0
    }
    return Math.floor(this.cost * this.sellRatio)
  }

  /**
   * 受损
   */
  damage(): void {
    if (this.state === ConstructionState.COMPLETED) {
      this.state = ConstructionState.DAMAGED
    }
  }

  /**
   * 修复
   */
  repair(): void {
    if (this.state === ConstructionState.DAMAGED) {
      this.state = ConstructionState.COMPLETED
    }
  }

  /**
   * 摧毁
   */
  destroy(): void {
    this.state = ConstructionState.DESTROYED
  }

  /**
   * 是否已完成
   */
  isCompleted(): boolean {
    return this.state === ConstructionState.COMPLETED
  }

  /**
   * 是否正在建造
   */
  isConstructing(): boolean {
    return this.state === ConstructionState.CONSTRUCTING
  }

  /**
   * 获取剩余建造时间
   */
  getRemainingTime(): number {
    if (this.state !== ConstructionState.CONSTRUCTING) return 0
    return this.buildTime * (1 - this.progress)
  }

  /**
   * 获取电力净产出
   */
  getPowerNet(): number {
    return this.powerProduction - this.powerConsumption
  }

  clone(): ConstructionComponent {
    const clone = new ConstructionComponent(this.buildingType, this.category, this.buildTime, this.cost)
    clone.state = this.state
    clone.progress = this.progress
    clone.invested = this.invested
    clone.powerConsumption = this.powerConsumption
    clone.powerProduction = this.powerProduction
    clone.canSell = this.canSell
    clone.sellRatio = this.sellRatio
    clone.isCritical = this.isCritical
    clone.footprint = { ...this.footprint }
    clone.constructionStartTime = this.constructionStartTime
    return clone
  }

  serialize(): Record<string, unknown> {
    return {
      buildingType: this.buildingType,
      category: this.category,
      state: this.state,
      progress: this.progress,
      buildTime: this.buildTime,
      cost: this.cost,
      invested: this.invested,
      powerConsumption: this.powerConsumption,
      powerProduction: this.powerProduction,
      canSell: this.canSell,
      sellRatio: this.sellRatio,
      isCritical: this.isCritical,
      footprint: this.footprint,
      constructionStartTime: this.constructionStartTime
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.buildingType !== undefined) this.buildingType = data.buildingType as string
    if (data.category !== undefined) this.category = data.category as BuildingCategory
    if (data.state !== undefined) this.state = data.state as ConstructionState
    if (data.progress !== undefined) this.progress = data.progress as number
    if (data.buildTime !== undefined) this.buildTime = data.buildTime as number
    if (data.cost !== undefined) this.cost = data.cost as number
    if (data.invested !== undefined) this.invested = data.invested as number
    if (data.powerConsumption !== undefined) this.powerConsumption = data.powerConsumption as number
    if (data.powerProduction !== undefined) this.powerProduction = data.powerProduction as number
    if (data.canSell !== undefined) this.canSell = data.canSell as boolean
    if (data.sellRatio !== undefined) this.sellRatio = data.sellRatio as number
    if (data.isCritical !== undefined) this.isCritical = data.isCritical as boolean
    if (data.footprint !== undefined) this.footprint = data.footprint as { width: number; height: number }
    if (data.constructionStartTime !== undefined) this.constructionStartTime = data.constructionStartTime as number
  }
}

// 注册组件类型
registerComponentType(CONSTRUCTION_TYPE, ConstructionComponent)
