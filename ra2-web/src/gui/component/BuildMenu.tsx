import React, { useState, useEffect, useMemo } from 'react'
import { 
  Player, 
  BuildCategory, 
  ProducibleItem
} from '../../game/types'
import { Building } from '../../game/buildings/BuildingSystem'
import { TechTree, TechUnlockStatus } from '../../game/tech/TechTree'

interface BuildMenuProps {
  player: Player
  selectedBuilding?: Building
  techTree: TechTree
  onBuildBuilding?: (buildingId: string) => void
  onBuildUnit?: (unitId: string) => void
  onSetWaypoint?: () => void
  onSellBuilding?: () => void
  onRepairBuilding?: () => void
}

/**
 * 建造菜单组件 - 集成科技树系统
 * 显示已解锁和可解锁的项目
 */
export const BuildMenu: React.FC<BuildMenuProps> = ({
  player,
  selectedBuilding,
  techTree,
  onBuildBuilding,
  onBuildUnit,
  onSetWaypoint,
  onSellBuilding,
  onRepairBuilding,
}) => {
  // 当前选中的标签页
  const [activeTab, setActiveTab] = useState<BuildCategory>(BuildCategory.BUILDINGS)
  
  // 科技解锁状态（用于刷新UI）
  const [techStatuses, setTechStatuses] = useState<TechUnlockStatus[]>([])
  
  // 是否显示生产建筑的队列（当选择兵营/战车工厂等时）
  const showProductionQueue = selectedBuilding?.stats.canProduce ?? false
  
  // 更新科技状态
  useEffect(() => {
    const statuses = techTree.getUnlockStatuses(player, activeTab)
    setTechStatuses(statuses)
  }, [techTree, player, activeTab, player.buildings]) // 建筑变化时重新计算

  // 获取当前类别的可建造项目
  const buildableItems = useMemo(() => {
    return techTree.getAvailableItems(player, activeTab)
  }, [techTree, player, activeTab, techStatuses])
  
  // 获取锁定但可见的项目（显示解锁条件）
  const lockedItems = useMemo(() => {
    return techStatuses.filter(s => !s.isUnlocked && s.isVisible)
  }, [techStatuses])

  // 检查是否可以建造/生产
  const canAfford = (cost: number): boolean => player.money >= cost

  // 处理建造/生产
  const handleBuild = (item: ProducibleItem) => {
    if (!canAfford(item.cost)) return
    
    if (activeTab === BuildCategory.BUILDINGS || activeTab === BuildCategory.DEFENSES) {
      onBuildBuilding?.(item.id)
    } else {
      // 生产单位 - 需要有对应的建筑
      if (selectedBuilding?.stats.canProduce) {
        onBuildUnit?.(item.id)
      }
    }
  }

  // 标签页配置
  const tabs = [
    { id: BuildCategory.BUILDINGS, label: '建筑', icon: '🏗️' },
    { id: BuildCategory.DEFENSES, label: '防御', icon: '🛡️' },
    { id: BuildCategory.INFANTRY, label: '步兵', icon: '👤' },
    { id: BuildCategory.VEHICLES, label: '车辆', icon: '🚗' },
  ]

  return (
    <div
      className="build-menu"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '160px',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        borderLeft: '2px solid #444',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* 顶部区域 - 生产队列（当选择生产建筑时显示） */}
      {showProductionQueue && selectedBuilding && (
        <div
          style={{
            padding: '8px',
            borderBottom: '1px solid #333',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
            生产队列 - {selectedBuilding.stats.name}
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {selectedBuilding.productionQueue.length === 0 && selectedBuilding.state !== 'producing' && (
              <span style={{ fontSize: '10px', color: '#666' }}>空闲</span>
            )}
            
            {selectedBuilding.productionQueue.map((item, index) => (
              <div
                key={index}
                style={{
                  width: '28px',
                  height: '28px',
                  background: '#333',
                  border: '1px solid #555',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}
              >
                {item.icon}
              </div>
            ))}
          </div>          
          {/* 当前生产进度 */}
          {selectedBuilding.currentProduction && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '10px', color: '#aaa' }}>
                {selectedBuilding.currentProduction.name}
              </div>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#333',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    width: `${selectedBuilding.productionProgress * 100}%`,
                    height: '100%',
                    background: '#4CAF50',
                    transition: 'width 0.1s',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 标签页 */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #333',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              background: activeTab === tab.id ? '#2a3f5f' : '#1a1a2e',
              border: 'none',
              borderRight: '1px solid #333',
              color: activeTab === tab.id ? '#fff' : '#888',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div>{tab.icon}</div>
            <div>{tab.label}</div>
          </button>
        ))}
      </div>

      {/* 可建造项目列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {/* 已解锁项目 */}
        {buildableItems.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div 
              style={{ 
                fontSize: '10px', 
                color: '#4CAF50', 
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              可用项目
            </div>
            
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}
            >
              {buildableItems.map((item) => {
                const affordable = canAfford(item.cost)
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleBuild(item)}
                    disabled={!affordable}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 4px',
                      background: affordable ? '#2a3f5f' : '#1a1a1a',
                      border: `2px solid ${affordable ? '#4a6f9f' : '#333'}`,
                      borderRadius: '4px',
                      cursor: affordable ? 'pointer' : 'not-allowed',
                      opacity: affordable ? 1 : 0.5,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '20px', marginBottom: '2px' }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        color: affordable ? '#fff' : '#666',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: affordable ? '#ffd700' : '#666',
                        marginTop: '2px',
                        fontWeight: 'bold',
                      }}
                    >
                      ${item.cost}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 锁定但可见的项目（显示解锁条件） */}
        {lockedItems.length > 0 && (
          <div>
            <div 
              style={{ 
                fontSize: '10px', 
                color: '#888', 
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              待解锁
            </div>
            
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}
            >
              {lockedItems.map((status) => {
                const node = techTree.getTechNode(status.nodeId)
                if (!node) return null
                
                return (
                  <div
                    key={status.nodeId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 4px',
                      background: '#1a1a1a',
                      border: '2px solid #333',
                      borderRadius: '4px',
                      opacity: 0.5,
                      cursor: 'help',
                    }}
                    title={status.reason}
                  >
                    <span style={{ fontSize: '20px', marginBottom: '2px', filter: 'grayscale(100%)' }}>{node.icon}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#666',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {node.name}
                    </span>
                    <span
                      style={{
                        fontSize: '8px',
                        color: '#444',
                        marginTop: '2px',
                        textAlign: 'center',
                      }}
                    >
                      🔒
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* 空状态 */}
        {buildableItems.length === 0 && lockedItems.length === 0 && (
          <div 
            style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#666',
              fontSize: '12px',
            }}
          >
            该类别无可用项目
          </div>
        )}
      </div>

      {/* 底部按钮区域 */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: '4px',
        }}
      >
        {selectedBuilding && (
          <>
            <button
              onClick={onSetWaypoint}
              style={{
                flex: 1,
                padding: '6px',
                background: '#3f51b5',
                border: '1px solid #5c6bc0',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              路径点
            </button>
            <button
              onClick={onRepairBuilding}
              style={{
                flex: 1,
                padding: '6px',
                background: '#4caf50',
                border: '1px solid #66bb6a',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              修复
            </button>
            <button
              onClick={onSellBuilding}
              style={{
                flex: 1,
                padding: '6px',
                background: '#f44336',
                border: '1px solid #ef5350',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              出售
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default BuildMenu
