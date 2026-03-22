import React, { useState, useEffect } from 'react'
import { AIManager, AIPlayer } from '../../game/ai/AIManager'
import { AIState, AIDifficulty } from '../../game/ai/AIController'

interface AIDebugPanelProps {
  aiManager: AIManager
}

/**
 * AI调试面板
 * 显示AI状态、统计和控制选项
 */
export const AIDebugPanel: React.FC<AIDebugPanelProps> = ({
  aiManager,
}) => {
  const [aiPlayers, setAiPlayers] = useState<AIPlayer[]>([])
  const [stats, setStats] = useState(aiManager.getStats())
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 刷新AI状态
  useEffect(() => {
    const updateStats = () => {
      setAiPlayers(aiManager.getAllAIPlayers())
      setStats(aiManager.getStats())
    }
    
    updateStats()
    const interval = setInterval(updateStats, 1000) // 每秒更新
    
    return () => clearInterval(interval)
  }, [aiManager])
  
  // 获取状态颜色
  const getStateColor = (state: AIState): string => {
    const colors: Record<AIState, string> = {
      [AIState.IDLE]: '#888',
      [AIState.BUILDING_ECONOMY]: '#4CAF50',
      [AIState.BUILDING_BASE]: '#2196F3',
      [AIState.BUILDING_ARMY]: '#FF9800',
      [AIState.ATTACKING]: '#F44336',
      [AIState.DEFENDING]: '#9C27B0',
      [AIState.REPAIRING]: '#00BCD4',
    }
    return colors[state] || '#888'
  }
  
  // 获取状态中文
  const getStateLabel = (state: AIState): string => {
    const labels: Record<AIState, string> = {
      [AIState.IDLE]: '闲置',
      [AIState.BUILDING_ECONOMY]: '经济建设',
      [AIState.BUILDING_BASE]: '基地建设',
      [AIState.BUILDING_ARMY]: '建军',
      [AIState.ATTACKING]: '进攻中',
      [AIState.DEFENDING]: '防守中',
      [AIState.REPAIRING]: '修理中',
    }
    return labels[state] || state
  }
  
  // 获取难度颜色
  const getDifficultyColor = (diff: AIDifficulty): string => {
    const colors: Record<AIDifficulty, string> = {
      [AIDifficulty.EASY]: '#4CAF50',
      [AIDifficulty.MEDIUM]: '#FF9800',
      [AIDifficulty.HARD]: '#F44336',
    }
    return colors[diff]
  }
  
  // 获取难度中文
  const getDifficultyLabel = (diff: AIDifficulty): string => {
    const labels: Record<AIDifficulty, string> = {
      [AIDifficulty.EASY]: '简单',
      [AIDifficulty.MEDIUM]: '中等',
      [AIDifficulty.HARD]: '困难',
    }
    return labels[diff]
  }
  
  // 切换AI启用状态
  const handleToggleAI = () => {
    aiManager.toggle()
    setStats(aiManager.getStats())
  }
  
  // 更改AI难度
  const handleChangeDifficulty = (playerId: string, diff: AIDifficulty) => {
    aiManager.setDifficulty(playerId, diff)
    setAiPlayers(aiManager.getAllAIPlayers())
  }
  
  if (aiPlayers.length === 0 && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: 100,
          left: 10,
          padding: '8px 12px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: '#888',
          fontSize: '11px',
          cursor: 'pointer',
          zIndex: 200,
        }}
      >
        AI调试
      </button>
    )
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 100,
        left: 10,
        background: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '250px',
        maxWidth: '300px',
        zIndex: 200,
        color: '#fff',
        fontSize: '12px',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #333',
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>
          AI调试面板
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ×
        </button>
      </div>
      
      {/* 全局控制 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
        }}
      >
        <span>AI总开关</span>
        <button
          onClick={handleToggleAI}
          style={{
            padding: '4px 12px',
            background: stats.enabled ? '#4CAF50' : '#F44336',
            border: 'none',
            borderRadius: '3px',
            color: '#fff',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {stats.enabled ? '已启用' : '已禁用'}
        </button>
      </div>
      
      {/* AI玩家列表 */}
      <div>
        <div
          style={{
            fontSize: '10px',
            color: '#888',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}
        >
          AI玩家 ({aiPlayers.length})
        </div>
        
        {aiPlayers.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
            }}
          >
            暂无AI玩家
          </div>
        ) : (
          aiPlayers.map((aiPlayer) => {
            const controllerStats = aiPlayer.controller.getStats()
            
            return (
              <div
                key={aiPlayer.playerId}
                style={{
                  marginBottom: '10px',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  border: '1px solid #333',
                }}
              >
                {/* 头部信息 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>
                    {aiPlayer.playerId}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      background: getDifficultyColor(aiPlayer.difficulty),
                      borderRadius: '3px',
                      fontSize: '10px',
                      color: '#fff',
                    }}
                  >
                    {getDifficultyLabel(aiPlayer.difficulty)}
                  </span>
                </div>
                
                {/* 状态 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: '#888', fontSize: '11px' }}>状态:</span>
                  <span
                    style={{
                      color: getStateColor(controllerStats.state),
                      fontWeight: 'bold',
                      fontSize: '11px',
                    }}
                  >
                    {getStateLabel(controllerStats.state)}
                  </span>
                </div>
                
                {/* 统计 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    fontSize: '10px',
                    color: '#aaa',
                    marginBottom: '8px',
                  }}
                >
                  <div>单位: {controllerStats.unitCount}</div>
                  <div>建筑: {controllerStats.buildingCount}</div>
                  <div>上次进攻: {Math.floor(controllerStats.lastAttackAgo / 1000)}s</div>
                </div>
                
                {/* 难度切换 */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[AIDifficulty.EASY, AIDifficulty.MEDIUM, AIDifficulty.HARD].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => handleChangeDifficulty(aiPlayer.playerId, diff)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: aiPlayer.difficulty === diff ? getDifficultyColor(diff) : '#333',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      {getDifficultyLabel(diff)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AIDebugPanel
