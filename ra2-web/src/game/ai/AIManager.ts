import { GameManager } from '../GameManager'
import { TechTree } from '../tech/TechTree'
import { AIController, AIDifficulty, AIState } from './AIController'

/**
 * AI玩家信息
 */
export interface AIPlayer {
  playerId: string
  controller: AIController
  difficulty: AIDifficulty
}

/**
 * AI管理器
 * 管理所有AI玩家的控制器
 */
export class AIManager {
  private aiPlayers: Map<string, AIPlayer> = new Map()
  private gameManager: GameManager
  private techTree: TechTree
  
  // 是否启用AI
  private enabled: boolean = true
  
  constructor(gameManager: GameManager, techTree: TechTree) {
    this.gameManager = gameManager
    this.techTree = techTree
  }
  
  /**
   * 添加AI玩家
   */
  addAIPlayer(playerId: string, difficulty: AIDifficulty = AIDifficulty.MEDIUM): void {
    // 检查是否已存在
    if (this.aiPlayers.has(playerId)) {
      console.warn(`AI玩家 ${playerId} 已存在`)
      return
    }
    
    const controller = new AIController(
      playerId,
      difficulty,
      this.gameManager,
      this.techTree
    )
    
    const aiPlayer: AIPlayer = {
      playerId,
      controller,
      difficulty,
    }
    
    this.aiPlayers.set(playerId, aiPlayer)
    console.log(`AI玩家已添加: ${playerId}, 难度: ${difficulty}`)
  }
  
  /**
   * 移除AI玩家
   */
  removeAIPlayer(playerId: string): void {
    const aiPlayer = this.aiPlayers.get(playerId)
    if (aiPlayer) {
      this.aiPlayers.delete(playerId)
      console.log(`AI玩家已移除: ${playerId}`)
    }
  }
  
  /**
   * 更新所有AI
   */
  update(deltaTime: number): void {
    if (!this.enabled) return
    
    for (const aiPlayer of this.aiPlayers.values()) {
      aiPlayer.controller.update(deltaTime)
    }
  }
  
  /**
   * 启用AI
   */
  enable(): void {
    this.enabled = true
    console.log('AI已启用')
  }
  
  /**
   * 禁用AI
   */
  disable(): void {
    this.enabled = false
    console.log('AI已禁用')
  }
  
  /**
   * 切换AI启用状态
   */
  toggle(): void {
    this.enabled = !this.enabled
    console.log(`AI ${this.enabled ? '已启用' : '已禁用'}`)
  }
  
  /**
   * 检查玩家是否是AI
   */
  isAIPlayer(playerId: string): boolean {
    return this.aiPlayers.has(playerId)
  }
  
  /**
   * 获取AI控制器
   */
  getController(playerId: string): AIController | undefined {
    return this.aiPlayers.get(playerId)?.controller
  }
  
  /**
   * 获取所有AI玩家
   */
  getAllAIPlayers(): AIPlayer[] {
    return Array.from(this.aiPlayers.values())
  }
  
  /**
   * 获取AI玩家数量
   */
  getAICount(): number {
    return this.aiPlayers.size
  }
  
  /**
   * 设置AI难度
   */
  setDifficulty(playerId: string, difficulty: AIDifficulty): void {
    // 需要重新创建控制器
    this.removeAIPlayer(playerId)
    this.addAIPlayer(playerId, difficulty)
  }
  
  /**
   * 重置所有AI
   */
  reset(): void {
    this.aiPlayers.clear()
    console.log('AI管理器已重置')
  }
  
  /**
   * 获取AI统计信息
   */
  getStats(): {
    totalAI: number
    enabled: boolean
    aiDetails: Array<{
      playerId: string
      difficulty: AIDifficulty
      state: AIState
      unitCount: number
      buildingCount: number
    }>
  } {
    return {
      totalAI: this.aiPlayers.size,
      enabled: this.enabled,
      aiDetails: Array.from(this.aiPlayers.values()).map(aiPlayer => {
        const stats = aiPlayer.controller.getStats()
        return {
          playerId: aiPlayer.playerId,
          difficulty: aiPlayer.difficulty,
          state: stats.state,
          unitCount: stats.unitCount,
          buildingCount: stats.buildingCount,
        }
      }),
    }
  }
  
  /**
   * 暂停特定AI
   */
  pauseAI(playerId: string): void {
    // 当前实现中，暂停可以通过禁用或设置特殊状态实现
    // 简化处理：移除AI
    this.removeAIPlayer(playerId)
  }
  
  /**
   * 恢复特定AI
   */
  resumeAI(playerId: string, difficulty?: AIDifficulty): void {
    const diff = difficulty || AIDifficulty.MEDIUM
    this.addAIPlayer(playerId, diff)
  }
}

export default AIManager
