import React, { useState, useEffect } from 'react'
import { SuperWeaponManager, SuperWeapon, SuperWeaponState } from '../../game/superweapon/SuperWeaponManager'
import { Vector3 } from '../../game/types'

interface SuperWeaponPanelProps {
  superWeaponManager: SuperWeaponManager
  playerId: string
  onFireSuperWeapon?: (superWeaponId: string, targetPosition: Vector3) => void
}

/**
 * 超级武器面板组件
 * 显示玩家的超级武器状态和发射按钮
 */
export const SuperWeaponPanel: React.FC<SuperWeaponPanelProps> = ({
  superWeaponManager,
  playerId,
  onFireSuperWeapon,
}) => {
  const [superWeapons, setSuperWeapons] = useState<SuperWeapon[]>([])
  const [selectedWeapon, setSelectedWeapon] = useState<SuperWeapon | null>(null)
  const [isTargeting, setIsTargeting] = useState(false)
  
  // 刷新超级武器状态
  useEffect(() => {
    const updateWeapons = () => {
      const weapons = superWeaponManager.getPlayerSuperWeapons(playerId)
      setSuperWeapons(weapons)
    }
    
    updateWeapons()
    const interval = setInterval(updateWeapons, 1000) // 每秒更新
    
    return () => clearInterval(interval)
  }, [superWeaponManager, playerId])
  
  // 如果没有超级武器，不显示面板
  if (superWeapons.length === 0) {
    return null
  }
  
  // 格式化时间显示
  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  // 获取状态颜色
  const getStateColor = (state: SuperWeaponState): string => {
    switch (state) {
      case SuperWeaponState.READY:
        return '#4CAF50' // 绿色
      case SuperWeaponState.CHARGING:
        return '#FFC107' // 黄色
      case SuperWeaponState.FIRING:
        return '#F44336' // 红色
      case SuperWeaponState.COOLDOWN:
        return '#9E9E9E' // 灰色
      default:
        return '#888'
    }
  }
  
  // 获取状态文本
  const getStateText = (state: SuperWeaponState): string => {
    switch (state) {
      case SuperWeaponState.READY:
        return '就绪'
      case SuperWeaponState.CHARGING:
        return '充能中'
      case SuperWeaponState.FIRING:
        return '发射中'
      case SuperWeaponState.COOLDOWN:
        return '冷却中'
      default:
        return '未知'
    }
  }
  
  // 处理点击发射
  const handleFireClick = (weapon: SuperWeapon) => {
    if (weapon.state !== SuperWeaponState.READY) return
    
    setSelectedWeapon(weapon)
    setIsTargeting(true)
    
    // 这里应该进入目标选择模式
    // 简化实现：直接在当前相机位置发射
    // 实际项目中应该：
    // 1. 显示目标选择光标
    // 2. 玩家点击地图选择目标
    // 3. 调用 onFireSuperWeapon
    
    // 临时：直接发射到固定位置
    const targetPosition = { x: 25, y: 0, z: 25 }
    onFireSuperWeapon?.(weapon.id, targetPosition)
    setIsTargeting(false)
    setSelectedWeapon(null)
  }
  
  // 计算剩余充能时间
  const getRemainingTime = (weapon: SuperWeapon): string => {
    if (weapon.state === SuperWeaponState.READY) return ''
    
    const remaining = Math.ceil((1 - weapon.chargeProgress) * weapon.config.rechargeTime)
    return formatTime(remaining)
  }
  
  return (
    <div
      className="super-weapon-panel"
      style={{
        position: 'absolute',
        bottom: 50,
        right: 170, // 侧边栏左侧
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 100,
      }}
    >
      {superWeapons.map((weapon) => (
        <div
          key={weapon.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.9)',
            border: `2px solid ${getStateColor(weapon.state)}`,
            borderRadius: '6px',
            padding: '10px 14px',
            minWidth: '200px',
            transition: 'all 0.3s',
          }}
        >
          {/* 图标 */}
          <div
            style={{
              fontSize: '28px',
              filter: weapon.state === SuperWeaponState.READY ? 'none' : 'grayscale(100%)',
              transition: 'filter 0.3s',
            }}
          >
            {weapon.config.icon}
          </div>
          
          {/* 信息 */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '2px',
              }}
            >
              {weapon.config.name}
            </div>
            
            <div
              style={{
                fontSize: '11px',
                color: getStateColor(weapon.state),
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{getStateText(weapon.state)}</span>
              {weapon.state === SuperWeaponState.CHARGING && (
                <span style={{ color: '#aaa' }}>
                  ({getRemainingTime(weapon)})
                </span>
              )}
            </div>
            
            {/* 进度条 */}
            {weapon.state === SuperWeaponState.CHARGING && (
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#333',
                  borderRadius: '2px',
                  marginTop: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${weapon.chargeProgress * 100}%`,
                    height: '100%',
                    background: '#FFC107',
                    transition: 'width 0.5s',
                  }}
                />
              </div>
            )}
          </div>
          
          {/* 发射按钮 */}
          <button
            onClick={() => handleFireClick(weapon)}
            disabled={weapon.state !== SuperWeaponState.READY}
            style={{
              padding: '6px 12px',
              background: weapon.state === SuperWeaponState.READY ? '#F44336' : '#333',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: weapon.state === SuperWeaponState.READY ? 'pointer' : 'not-allowed',
              opacity: weapon.state === SuperWeaponState.READY ? 1 : 0.5,
              transition: 'all 0.2s',
            }}
          >
            发射
          </button>
        </div>
      ))}
      
      {/* 目标选择提示 */}
      {isTargeting && selectedWeapon && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(244, 67, 54, 0.9)',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          选择 {selectedWeapon.config.name} 的目标位置
        </div>
      )}
    </div>
  )
}

export default SuperWeaponPanel
