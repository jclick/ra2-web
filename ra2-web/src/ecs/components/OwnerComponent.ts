/**
 * Owner 组件
 * 
 * 标识实体所属的玩家和阵营
 * 用于区分友方、敌方、中立
 */

import { Component, ComponentType, registerComponentType } from '../core/Component'

export const OWNER_TYPE: ComponentType = 'owner'

// 阵营类型
export enum Faction {
  ALLIES = 'allies',
  SOVIET = 'soviet',
  YURI = 'yuri',
  NEUTRAL = 'neutral',
  SPECIAL = 'special'
}

// 关系类型
export enum Relationship {
  SELF = 'self',           // 自己
  ALLY = 'ally',           // 盟友
  ENEMY = 'enemy',         // 敌人
  NEUTRAL = 'neutral'      // 中立
}

export class OwnerComponent extends Component {
  readonly type = OWNER_TYPE

  // 玩家ID
  playerId: string

  // 阵营
  faction: Faction

  // 队伍ID（用于多人游戏分组）
  teamId: number

  // 颜色（显示用）
  color: string

  constructor(
    playerId: string,
    faction: Faction = Faction.NEUTRAL,
    teamId: number = 0,
    color: string = '#ffffff'
  ) {
    super()
    this.playerId = playerId
    this.faction = faction
    this.teamId = teamId
    this.color = color
  }

  /**
   * 检查与另一个所有者的关系
   */
  getRelationshipTo(other: OwnerComponent): Relationship {
    // 同一玩家
    if (this.playerId === other.playerId) {
      return Relationship.SELF
    }

    // 同一队伍
    if (this.teamId !== 0 && this.teamId === other.teamId) {
      return Relationship.ALLY
    }

    // 中立
    if (this.faction === Faction.NEUTRAL || other.faction === Faction.NEUTRAL) {
      return Relationship.NEUTRAL
    }

    // 敌人
    return Relationship.ENEMY
  }

  /**
   * 是否是盟友
   */
  isAlly(other: OwnerComponent): boolean {
    const rel = this.getRelationshipTo(other)
    return rel === Relationship.SELF || rel === Relationship.ALLY
  }

  /**
   * 是否是敌人
   */
  isEnemy(other: OwnerComponent): boolean {
    return this.getRelationshipTo(other) === Relationship.ENEMY
  }

  /**
   * 获取阵营名称
   */
  getFactionName(): string {
    const names: Record<Faction, string> = {
      [Faction.ALLIES]: '盟军',
      [Faction.SOVIET]: '苏军',
      [Faction.YURI]: '尤里',
      [Faction.NEUTRAL]: '中立',
      [Faction.SPECIAL]: '特殊'
    }
    return names[this.faction] || '未知'
  }

  clone(): OwnerComponent {
    return new OwnerComponent(this.playerId, this.faction, this.teamId, this.color)
  }

  serialize(): Record<string, unknown> {
    return {
      playerId: this.playerId,
      faction: this.faction,
      teamId: this.teamId,
      color: this.color
    }
  }

  deserialize(data: Record<string, unknown>): void {
    if (data.playerId !== undefined) this.playerId = data.playerId as string
    if (data.faction !== undefined) this.faction = data.faction as Faction
    if (data.teamId !== undefined) this.teamId = data.teamId as number
    if (data.color !== undefined) this.color = data.color as string
  }
}

// 注册组件类型
registerComponentType(OWNER_TYPE, OwnerComponent)
