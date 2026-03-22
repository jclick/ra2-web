import React from 'react'
import { Player } from '../../game/types'

interface ResourceDisplayProps {
  player: Player
}

/**
 * 资源显示组件 - 显示资金、电力、人口等信息
 * 仿红警2风格，位于屏幕右上角
 */
export const ResourceDisplay: React.FC<ResourceDisplayProps> = ({ player }) => {
  // 计算电力状态
  const powerStatus = player.power >= player.powerDrain ? 'normal' : 'low'
  const powerColor = powerStatus === 'normal' ? '#00ff00' : '#ff6600'
  
  // 格式化数字显示
  const formatNumber = (num: number): string => {
    return num.toLocaleString('zh-CN')
  }

  return (
    <div
      className="resource-display"
      style={{
        position: 'absolute',
        top: 10,
        right: 170, // 给侧边栏留出空间
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 100,
      }}
    >
      {/* 资金显示 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #444',
          borderRadius: '4px',
          padding: '6px 12px',
          minWidth: '120px',
        }}
      >
        <span style={{ fontSize: '18px', color: '#ffd700' }}>$</span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffd700',
            fontFamily: 'monospace',
            textShadow: '0 0 4px rgba(255, 215, 0, 0.5)',
          }}
        >
          {formatNumber(player.money)}
        </span>
      </div>

      {/* 电力显示 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: `2px solid ${powerStatus === 'normal' ? '#00aa00' : '#ff6600'}`,
          borderRadius: '4px',
          padding: '6px 12px',
        }}
      >
        <span style={{ fontSize: '16px', color: powerColor }}>⚡</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: powerColor,
            fontFamily: 'monospace',
          }}
        >
          {player.powerDrain}/{player.power}
        </span>
      </div>

      {/* 单位数量显示 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #666',
          borderRadius: '4px',
          padding: '6px 12px',
        }}
      >
        <span style={{ fontSize: '16px', color: '#aaa' }}>👤</span>
        <span
          style={{
            fontSize: '14px',
            color: '#aaa',
            fontFamily: 'monospace',
          }}
        >
          {player.units.length}
        </span>
      </div>
    </div>
  )
}

export default ResourceDisplay
