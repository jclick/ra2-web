import React from 'react'
import { GameMap } from '../../game/map/GameMap'
import { Unit } from '../../game/objects/Unit'
import { Building } from '../../game/buildings/BuildingSystem'
import { FogOfWar, FogCellState } from '../../game/fog/FogOfWar'

interface RadarMapProps {
  map: GameMap
  units: Unit[]
  buildings: Building[]
  fogOfWar: FogOfWar
  playerId: string
  cameraPosition: { x: number; z: number }
  onRadarClick?: (worldX: number, worldZ: number) => void
}

/**
 * 雷达小地图组件
 * 仿红警2风格，位于屏幕侧边栏
 */
export const RadarMap: React.FC<RadarMapProps> = ({
  map,
  units,
  buildings,
  fogOfWar,
  playerId,
  cameraPosition,
  onRadarClick,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const mapWidth = map.getWidth()
  const mapHeight = map.getHeight()

  // 雷达尺寸
  const radarSize = 140
  const cellSize = Math.floor(radarSize / Math.max(mapWidth, mapHeight))
  const actualWidth = mapWidth * cellSize
  const actualHeight = mapHeight * cellSize

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, actualWidth, actualHeight)

    // 绘制地形
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const cell = map.getCell(x, y)
        if (!cell) continue

        const fogState = fogOfWar.getCellState(x, y, playerId)
        
        // 根据战争迷雾状态决定颜色
        if (fogState === FogCellState.UNEXPLORED) {
          ctx.fillStyle = '#111'
        } else if (fogState === FogCellState.EXPLORED) {
          // 已探索但当前不可见 - 灰色
          ctx.fillStyle = '#444'
        } else {
          // 可见区域 - 根据地形类型
          switch (cell.terrainType) {
            case 'Water':
              ctx.fillStyle = '#1a5276'
              break
            case 'Clear':
              ctx.fillStyle = '#1e8449'
              break
            case 'Rough':
              ctx.fillStyle = '#7d6608'
              break
            case 'Road':
              ctx.fillStyle = '#5d6d7e'
              break
            case 'Rock':
              ctx.fillStyle = '#5d4037'
              break
            case 'Tree':
              ctx.fillStyle = '#0d5c0d'
              break
            default:
              ctx.fillStyle = '#1e8449'
          }
        }

        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }

    // 绘制建筑
    for (const building of buildings) {
      const x = Math.floor(building.position.x)
      const y = Math.floor(building.position.z)

      // 检查是否在可见区域
      const fogState = fogOfWar.getCellState(x, y, playerId)
      if (fogState === FogCellState.UNEXPLORED) continue

      // 根据所有者颜色绘制
      const isPlayer = building.owner.id === playerId
      ctx.fillStyle = isPlayer ? '#3498db' : '#e74c3c'

      const size = Math.max(2, cellSize * 2)
      ctx.fillRect(
        x * cellSize - size / 2,
        y * cellSize - size / 2,
        size,
        size
      )
    }

    // 绘制单位
    for (const unit of units) {
      const x = Math.floor(unit.position.x)
      const y = Math.floor(unit.position.z)

      // 检查是否在可见区域
      const fogState = fogOfWar.getCellState(x, y, playerId)
      if (fogState !== FogCellState.VISIBLE) continue

      // 根据所有者颜色绘制
      const isPlayer = (unit as any).owner?.id === playerId
      ctx.fillStyle = isPlayer ? '#2ecc71' : '#e74c3c'

      ctx.beginPath()
      ctx.arc(
        x * cellSize + cellSize / 2,
        y * cellSize + cellSize / 2,
        Math.max(1, cellSize / 2),
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    // 绘制相机视口框
    const viewWidth = 15 // 视野宽度（格数）
    const viewHeight = 12 // 视野高度（格数）
    const viewX = Math.floor(cameraPosition.x) - viewWidth / 2
    const viewY = Math.floor(cameraPosition.z) - viewHeight / 2

    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(
      viewX * cellSize,
      viewY * cellSize,
      viewWidth * cellSize,
      viewHeight * cellSize
    )
  }, [map, units, buildings, fogOfWar, playerId, cameraPosition, cellSize, actualWidth, actualHeight])

  // 处理雷达点击 - 移动相机
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onRadarClick) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const worldX = Math.floor(x / cellSize)
    const worldZ = Math.floor(y / cellSize)

    onRadarClick(worldX, worldZ)
  }

  return (
    <div
      className="radar-map"
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #555',
        borderRadius: '4px',
        padding: '4px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#aaa',
          textAlign: 'center',
          marginBottom: '4px',
          fontWeight: 'bold',
        }}
      >
        雷达
      </div>
      <canvas
        ref={canvasRef}
        width={actualWidth}
        height={actualHeight}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  )
}

export default RadarMap
