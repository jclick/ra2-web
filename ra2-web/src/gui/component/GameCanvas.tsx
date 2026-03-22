import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '../../engine/Engine'
import { GameManager } from '../../game/GameManager'
import { Unit } from '../../game/objects/Unit'
import { Building } from '../../game/buildings/BuildingSystem'
import { Player, Faction } from '../../game/types'

// 侧边栏UI组件
import { ResourceDisplay } from './ResourceDisplay'
import { RadarMap } from './RadarMap'
import { BuildMenu } from './BuildMenu'
import { SelectionPanel } from './SelectionPanel'
import { SuperWeaponPanel } from './SuperWeaponPanel'
import { AIDebugPanel } from './AIDebugPanel'

interface GameCanvasProps {
  engine: GameEngine
  onExit: () => void
}

/**
 * 游戏画布组件 - 整合所有UI
 */
export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onExit,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const gameManagerRef = useRef<GameManager | null>(null)
  const animationFrameRef = useRef<number>(0)
  
  // 游戏状态
  const [player, setPlayer] = useState<Player | null>(null)
  const [selectedUnits, setSelectedUnits] = useState<Unit[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<Building | undefined>(undefined)
  const [allUnits, setAllUnits] = useState<Unit[]>([])
  const [allBuildings, setAllBuildings] = useState<Building[]>([])
  const [cameraPosition, setCameraPosition] = useState({ x: 25, z: 25 })
  const [gameTime, setGameTime] = useState(0)

  // 初始化游戏 (不依赖 canvasRef)
  useEffect(() => {
    console.log('[GameCanvas] Initializing game...')

    try {
      // 获取或创建游戏管理器
      const existingGameManager = engine.getGameManager?.()
      console.log('[GameCanvas] existingGameManager:', existingGameManager)
      
      let gameManager: GameManager
      
      if (existingGameManager) {
        // 使用引擎中的 GameManager
        gameManager = existingGameManager
        console.log('[GameCanvas] Using existing GameManager from engine')
      } else {
        // 创建新的 GameManager
        console.log('[GameCanvas] Creating new GameManager')
        gameManager = new GameManager({
          mapName: 'test',
          maxPlayers: 2,
          startingUnits: true,
          crates: false,
          superWeapons: false,
          gameMode: 'standard' as any,
        })
        gameManager.initialize()
      }
      
      gameManagerRef.current = gameManager
      
      // 设置回调
      gameManager.setCallbacks({
        onSelectionChanged: (units) => {
          setSelectedUnits(units)
          setSelectedBuilding(gameManager.getSelectedBuilding())
        },
        onBuildingCreated: () => updateGameState(),
        onBuildingDestroyed: () => updateGameState(),
        onUnitCreated: () => updateGameState(),
        onUnitDestroyed: () => updateGameState(),
      })

      // 获取玩家
      const player1 = gameManager.getPlayer('player1')
      console.log('[GameCanvas] player1:', player1)
      
      if (player1) {
        setPlayer(player1)
        console.log('[GameCanvas] Player set successfully')
      } else {
        console.error('[GameCanvas] Failed to get player1! Players:', gameManager.players)
      }

    } catch (error) {
      console.error('[GameCanvas] Initialization error:', error)
    }
  }, [engine])

  // 初始化渲染和启动游戏循环 (依赖 canvasRef)
  useEffect(() => {
    console.log('[GameCanvas] Canvas effect triggered, canvasRef:', canvasRef.current, 'player:', player)
    
    if (!canvasRef.current) {
      console.log('[GameCanvas] canvasRef not ready yet, skipping...')
      return
    }
    
    if (!player) {
      console.log('[GameCanvas] player not ready yet, skipping...')
      return
    }

    const gameManager = gameManagerRef.current
    if (!gameManager) {
      console.error('[GameCanvas] gameManager is null!')
      return
    }

    try {
      // 检查容器尺寸
      const rect = canvasRef.current.getBoundingClientRect()
      console.log('[GameCanvas] Container size:', rect.width, 'x', rect.height)
      
      if (rect.width === 0 || rect.height === 0) {
        console.error('[GameCanvas] Container has zero size!')
      }
      
      // 初始化渲染
      console.log('[GameCanvas] Attaching engine to canvas...')
      engine.attachTo(canvasRef.current)
      
      console.log('[GameCanvas] Setting game manager...')
      engine.setGameManager?.(gameManager)
      
      console.log('[GameCanvas] Starting engine...')
      engine.start()
      console.log('[GameCanvas] Engine started')

      // 游戏主循环
      const gameLoop = () => {
        const deltaTime = 16.67 // 约60fps
        gameManager.update(deltaTime)
        
        // 更新状态（节流，每10帧更新一次）
        if (Math.floor(gameManager.gameTime / 100) % 6 === 0) {
          updateGameState()
        }
        
        setGameTime(gameManager.gameTime)
        animationFrameRef.current = requestAnimationFrame(gameLoop)
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop)

      return () => {
        console.log('[GameCanvas] Cleaning up...')
        cancelAnimationFrame(animationFrameRef.current)
        engine.stop()
      }
    } catch (error) {
      console.error('[GameCanvas] Canvas setup error:', error)
    }
  }, [player, engine])

  // 更新游戏状态
  const updateGameState = useCallback(() => {
    const gm = gameManagerRef.current
    if (!gm) return
    
    const p = gm.getPlayer('player1')
    setPlayer(p || null)
    setSelectedUnits(gm.getSelectedUnits())
    setSelectedBuilding(gm.getSelectedBuilding())
    setAllUnits(gm.getAllUnits())
    setAllBuildings(gm.getAllBuildings())
  }, [])

  // 处理雷达点击 - 移动相机
  const handleRadarClick = useCallback((worldX: number, worldZ: number) => {
    setCameraPosition({ x: worldX, z: worldZ })
    // 通知引擎移动相机
    engine.moveCamera?.(worldX, 10, worldZ)
  }, [engine])

  // 处理建造建筑
  const handleBuildBuilding = useCallback((buildingId: string) => {
    const gm = gameManagerRef.current
    if (!gm || !player) return
    
    // 进入建筑放置模式
    engine.startBuildingPlacement?.(buildingId, (position) => {
      // 放置建筑
      gm.createBuilding(buildingId, position, player.id)
      updateGameState()
    })
  }, [player, updateGameState])

  // 处理生产单位
  const handleBuildUnit = useCallback((unitId: string) => {
    const gm = gameManagerRef.current
    if (!gm || !selectedBuilding || !player) return
    
    // 获取单位数据
    const unitData = getUnitData(unitId, player.faction)
    if (!unitData) return
    
    // 添加到生产队列
    selectedBuilding.addToQueue({
      id: unitId,
      name: unitData.name,
      category: unitData.category,
      cost: unitData.cost,
      buildTime: unitData.buildTime,
      techLevel: 1,
      icon: unitData.icon,
    })
    
    updateGameState()
  }, [selectedBuilding, player, updateGameState])

  // 处理出售建筑
  const handleSellBuilding = useCallback(() => {
    if (selectedBuilding) {
      selectedBuilding.sell()
      updateGameState()
    }
  }, [selectedBuilding, updateGameState])

  // 处理修复建筑
  const handleRepairBuilding = useCallback(() => {
    if (selectedBuilding) {
      // 每秒恢复5%生命值，花费资金
      const repairAmount = selectedBuilding.maxHealth * 0.05
      const repairCost = Math.floor(selectedBuilding.stats.cost * 0.01)
      
      if (player && player.money >= repairCost) {
        player.money -= repairCost
        selectedBuilding.repair(repairAmount)
        updateGameState()
      }
    }
  }, [selectedBuilding, player, updateGameState])

  // 处理设置路径点
  const handleSetWaypoint = useCallback(() => {
    if (selectedBuilding) {
      engine.startWaypointPlacement?.((position) => {
        // 设置路径点
        console.log('路径点设置:', position)
      })
    }
  }, [selectedBuilding])

  if (!player) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
        gap: '20px',
      }}>
        <div>正在初始化游戏...</div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          如果长时间卡住，请打开浏览器控制台(F12)查看错误信息
        </div>
        <button 
          onClick={() => {
            // 强制创建一个默认玩家
            const gm = gameManagerRef.current
            if (gm) {
              const defaultPlayer: Player = {
                id: 'player1',
                name: '玩家',
                faction: Faction.ALLIES,
                color: '#0066CC',
                money: 10000,
                power: 100,
                powerDrain: 0,
                units: [],
                buildings: [],
              }
              gm.players.set('player1', defaultPlayer)
              setPlayer(defaultPlayer)
            }
          }}
          style={{
            padding: '10px 20px',
            background: '#c41e3a',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          强制继续 (调试)
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 3D 渲染画布 - 留出侧边栏空间 */}
      <div 
        ref={canvasRef}
        className="game-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: '160px',
          bottom: 0,
          background: '#1a0a2e',
          zIndex: 1,
        }}
      />

      {/* ========== UI 层 ========== */}
      
      {/* 资源显示 - 右上角 */}
      <ResourceDisplay player={player} />

      {/* 侧边栏 - 建造菜单 + 雷达 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '160px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 雷达小地图 */}
        <div style={{ padding: '8px' }}>
          <RadarMap
            map={gameManagerRef.current!.map}
            units={allUnits}
            buildings={allBuildings}
            fogOfWar={gameManagerRef.current!.fogOfWar}
            playerId={player.id}
            cameraPosition={cameraPosition}
            onRadarClick={handleRadarClick}
          />
        </div>

        {/* 建造菜单 */}
        <BuildMenu
          player={player}
          selectedBuilding={selectedBuilding}
          techTree={gameManagerRef.current!.techTree}
          onBuildBuilding={handleBuildBuilding}
          onBuildUnit={handleBuildUnit}
          onSetWaypoint={handleSetWaypoint}
          onSellBuilding={handleSellBuilding}
          onRepairBuilding={handleRepairBuilding}
        />
      </div>

      {/* 选中单位信息面板 - 左下角 */}
      <SelectionPanel
        selectedUnits={selectedUnits}
        selectedBuilding={selectedBuilding}
      />

      {/* 超级武器面板 - 底部中间偏右 */}
      {player && (
        <SuperWeaponPanel
          superWeaponManager={gameManagerRef.current!.superWeaponManager}
          playerId={player.id}
          onFireSuperWeapon={(weaponId, target) => {
            gameManagerRef.current?.superWeaponManager.fireSuperWeapon(weaponId, target)
          }}
        />
      )}

      {/* 顶部状态栏 */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: '160px',
          height: 40,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '2px solid #c41e3a',
          zIndex: 100,
        }}
      >
        <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
          红色警戒2 Web版
        </span>
        
        <div style={{ flex: 1 }} />
        
        {/* 游戏时间 */}
        <span style={{ color: '#888', marginRight: 20 }}>
          {formatGameTime(gameTime)}
        </span>
        
        <button 
          className="ra-button"
          onClick={onExit}
          style={{ padding: '5px 15px', fontSize: '0.85rem' }}
        >
          退出
        </button>
      </div>

      {/* 底部提示栏 */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: '160px',
          height: 40,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderTop: '1px solid #333',
          zIndex: 100,
          fontSize: '12px',
        }}
      >
        <span style={{ color: '#888', marginRight: 20 }}>
          左键: 选择 | 右键: 移动/攻击
        </span>
        <span style={{ color: '#888' }}>
          滚轮: 缩放 | 拖拽: 移动视角
        </span>
      </div>

      {/* AI调试面板 */}
      <AIDebugPanel aiManager={gameManagerRef.current!.aiManager} />
    </div>
  )
}

// 辅助函数：格式化游戏时间
function formatGameTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

// 辅助函数：获取单位数据
function getUnitData(unitId: string, faction: Faction) {
  const alliedUnits: Record<string, any> = {
    'GI': { name: '美国大兵', category: 'infantry', cost: 200, buildTime: 5000, icon: '👤' },
    'ENGINEER': { name: '工程师', category: 'infantry', cost: 500, buildTime: 8000, icon: '🔧' },
    'SPY': { name: '间谍', category: 'infantry', cost: 1000, buildTime: 12000, icon: '🕵️' },
    'GRIZZLY': { name: '灰熊坦克', category: 'vehicles', cost: 700, buildTime: 10000, icon: '🛡️' },
    'IFV': { name: '多功能步兵车', category: 'vehicles', cost: 600, buildTime: 9000, icon: '🚙' },
    'HARVESTER': { name: '采矿车', category: 'vehicles', cost: 1400, buildTime: 15000, icon: '⛏️' },
  }
  
  const sovietUnits: Record<string, any> = {
    'CONSCRIPT': { name: '动员兵', category: 'infantry', cost: 100, buildTime: 4000, icon: '👤' },
    'ENGINEER': { name: '工程师', category: 'infantry', cost: 500, buildTime: 8000, icon: '🔧' },
    'FLAKTROOP': { name: '防空步兵', category: 'infantry', cost: 300, buildTime: 6000, icon: '🎯' },
    'RHINO': { name: '犀牛坦克', category: 'vehicles', cost: 900, buildTime: 12000, icon: '🛡️' },
    'FLAKTRACK': { name: '防空履带车', category: 'vehicles', cost: 500, buildTime: 8000, icon: '🚙' },
    'HARVESTER': { name: '采矿车', category: 'vehicles', cost: 1400, buildTime: 15000, icon: '⛏️' },
  }
  
  return faction === Faction.ALLIES ? alliedUnits[unitId] : sovietUnits[unitId]
}

export default GameCanvas
