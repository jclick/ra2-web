import React from 'react'
import { Unit } from '../../game/objects/Unit'
import { Building } from '../../game/buildings/BuildingSystem'
import { UnitState, BuildingState } from '../../game/types'

interface SelectionPanelProps {
  selectedUnits: Unit[]
  selectedBuilding?: Building
}

/**
 * 选择单位信息面板
 * 显示选中单位/建筑的详细信息
 */
export const SelectionPanel: React.FC<SelectionPanelProps> = ({
  selectedUnits,
  selectedBuilding,
}) => {
  // 格式化生命值百分比
  const formatHealthPercent = (current: number, max: number): number => {
    return Math.round((current / max) * 100)
  }

  // 获取状态文本
  const getUnitStateText = (state: UnitState): string => {
    const stateMap: Record<UnitState, string> = {
      [UnitState.IDLE]: '空闲',
      [UnitState.MOVING]: '移动中',
      [UnitState.ATTACKING]: '攻击中',
      [UnitState.BUILDING]: '建造中',
      [UnitState.HARVESTING]: '采矿中',
      [UnitState.GUARDING]: '驻守中',
      [UnitState.DEPLOYING]: '部署中',
      [UnitState.UNLOADING]: '卸载中',
      [UnitState.DYING]: '被摧毁',
    }
    return stateMap[state] || '未知'
  }

  const getBuildingStateText = (state: BuildingState): string => {
    const stateMap: Record<BuildingState, string> = {
      [BuildingState.CONSTRUCTION]: '建造中',
      [BuildingState.IDLE]: '空闲',
      [BuildingState.PRODUCING]: '生产中',
      [BuildingState.SELLING]: '出售中',
      [BuildingState.POWER_DOWN]: '断电',
    }
    return stateMap[state] || '未知'
  }

  // 无选择时
  if (selectedUnits.length === 0 && !selectedBuilding) {
    return (
      <div
        className="selection-panel"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          width: '220px',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '2px solid #444',
          borderRadius: '4px',
          padding: '12px',
          zIndex: 100,
        }}
      >
        <div style={{ color: '#666', fontSize: '13px', textAlign: 'center' }}>
          点击选择单位或建筑
        </div>
      </div>
    )
  }

  // 多选单位
  if (selectedUnits.length > 1) {
    // 按类型分组
    const grouped = selectedUnits.reduce((acc, unit) => {
      const type = unit.stats.name
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return (
      <div
        className="selection-panel"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          width: '220px',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '2px solid #444',
          borderRadius: '4px',
          padding: '12px',
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '10px',
            borderBottom: '1px solid #444',
            paddingBottom: '6px',
          }}
        >
          已选择 {selectedUnits.length} 个单位
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(grouped).map(([type, count]) => (
            <div
              key={type}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '3px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#ccc' }}>{type}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#4CAF50',
                }}
              >
                ×{count}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 单选单位
  if (selectedUnits.length === 1) {
    const unit = selectedUnits[0]
    const healthPercent = formatHealthPercent(unit.health, unit.maxHealth)

    return (
      <div
        className="selection-panel"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          width: '240px',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '2px solid #444',
          borderRadius: '4px',
          padding: '12px',
          zIndex: 100,
        }}
      >
        {/* 标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            borderBottom: '1px solid #444',
            paddingBottom: '8px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              background: '#2a3f5f',
              border: '2px solid #4a6f9f',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            {unit.faction === 'Allies' ? '🔵' : '🔴'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {unit.stats.name}
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              {unit.faction === 'Allies' ? '盟军' : '苏联'}
            </div>
          </div>
        </div>

        {/* 生命值 */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#aaa',
              marginBottom: '3px',
            }}
          >
            <span>生命值</span>
            <span>{Math.round(unit.health)}/{unit.maxHealth}</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#333',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${healthPercent}%`,
                height: '100%',
                background:
                  healthPercent > 60
                    ? '#4CAF50'
                    : healthPercent > 30
                    ? '#FFC107'
                    : '#F44336',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* 状态 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '1px solid #333',
          }}
        >
          <span style={{ fontSize: '12px', color: '#888' }}>状态</span>
          <span style={{ fontSize: '12px', color: '#fff' }}>
            {getUnitStateText(unit.state)}
          </span>
        </div>

        {/* 属性 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginTop: '10px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#888' }}>攻击力</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {unit.primaryWeapon?.config.damage || 0}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#888' }}>护甲</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {unit.stats.armor === 'none'
                ? '无'
                : unit.stats.armor === 'flak'
                ? '轻型'
                : unit.stats.armor === 'plate'
                ? '中型'
                : unit.stats.armor === 'heavy'
                ? '重型'
                : '混凝土'}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#888' }}>速度</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {unit.stats.speed}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#888' }}>视野</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {unit.stats.sight}
            </div>
          </div>
        </div>

        {/* 老兵等级 */}
        {unit.veterancyLevel > 0 && (
          <div
            style={{
              marginTop: '10px',
              padding: '6px',
              background: 'rgba(255, 193, 7, 0.2)',
              borderRadius: '3px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: '#FFC107', fontWeight: 'bold' }}>
              {unit.veterancyLevel === 1
                ? '★ 老兵'
                : unit.veterancyLevel === 2
                ? '★★ 精英'
                : '★★★ 英雄'}
            </span>
          </div>
        )}
      </div>
    )
  }

  // 选中建筑
  if (selectedBuilding) {
    const healthPercent = formatHealthPercent(
      selectedBuilding.health,
      selectedBuilding.maxHealth
    )

    return (
      <div
        className="selection-panel"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          width: '240px',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '2px solid #444',
          borderRadius: '4px',
          padding: '12px',
          zIndex: 100,
        }}
      >
        {/* 标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            borderBottom: '1px solid #444',
            paddingBottom: '8px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#2a3f5f',
              border: '2px solid #4a6f9f',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            {selectedBuilding.owner.faction === 'Allies' ? '🏗️' : '🏭'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {selectedBuilding.stats.name}
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              {selectedBuilding.owner.faction === 'Allies' ? '盟军建筑' : '苏联建筑'}
            </div>
          </div>
        </div>

        {/* 生命值 */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#aaa',
              marginBottom: '3px',
            }}
          >
            <span>建筑完整性</span>
            <span>
              {Math.round(selectedBuilding.health)}/{selectedBuilding.maxHealth}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#333',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${healthPercent}%`,
                height: '100%',
                background:
                  healthPercent > 60
                    ? '#4CAF50'
                    : healthPercent > 30
                    ? '#FFC107'
                    : '#F44336',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* 建造进度（如果正在建造） */}
        {selectedBuilding.state === BuildingState.CONSTRUCTION && (
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#aaa',
                marginBottom: '3px',
              }}
            >
              <span>建造进度</span>
              <span>{Math.round(selectedBuilding.constructionProgress * 100)}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: '#333',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${selectedBuilding.constructionProgress * 100}%`,
                  height: '100%',
                  background: '#2196F3',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}

        {/* 状态 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '1px solid #333',
          }}
        >
          <span style={{ fontSize: '12px', color: '#888' }}>状态</span>
          <span style={{ fontSize: '12px', color: '#fff' }}>
            {getBuildingStateText(selectedBuilding.state)}
          </span>
        </div>

        {/* 电力信息 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginTop: '10px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#888' }}>电力消耗</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff9800' }}>
              {selectedBuilding.stats.powerConsumption}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '6px',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#888' }}>电力产出</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#4CAF50' }}>
              {selectedBuilding.stats.powerProduction}
            </div>
          </div>
        </div>

        {/* 生产功能 */}
        {selectedBuilding.stats.canProduce && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px',
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '3px',
              border: '1px solid rgba(76, 175, 80, 0.3)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#4CAF50', marginBottom: '4px' }}>
              生产设施
            </div>
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              可生产:{' '}
              {selectedBuilding.stats.produces
                ?.map((p) =>
                  p === 'infantry'
                    ? '步兵'
                    : p === 'vehicles'
                    ? '车辆'
                    : p === 'aircraft'
                    ? '飞机'
                    : p === 'naval'
                    ? '舰船'
                    : p
                )
                .join('、')}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

export default SelectionPanel
