import { useState, useEffect } from 'react'
import './MultiplayerScreen.css'
import { 
  getMultiplayerManager, 
  RoomInfo,
} from '../../game/multiplayer/MultiplayerManager'

interface MultiplayerScreenProps {
  onBack: () => void
  onStartGame: () => void
}

// 模拟房间数据（实际应从服务器获取）
const MOCK_ROOMS: RoomInfo[] = [
  { id: '1', name: '新手房', host: 'player1', players: [], maxPlayers: 2, map: '冰雪世界', status: 'waiting' },
  { id: '2', name: '高手来战', host: 'pro123', players: [], maxPlayers: 2, map: '沙漠风暴', status: 'waiting' },
]

export function MultiplayerScreen({ onBack, onStartGame }: MultiplayerScreenProps) {
  const [view, setView] = useState<'lobby' | 'rooms' | 'create' | 'room'>('lobby')
  const [rooms, setRooms] = useState<RoomInfo[]>(MOCK_ROOMS)
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null)
  const [playerName, setPlayerName] = useState<string>('指挥官' + Math.floor(Math.random() * 1000))
  const [error, setError] = useState<string>('')

  const mp = getMultiplayerManager()

  useEffect(() => {
    // 设置回调
    mp.onConnect(() => {
      setError('')
    })

    mp.onDisconnect(() => {
      setError('与服务器断开连接')
    })

    mp.onRoomList((roomList) => {
      setRooms(roomList)
    })

    mp.onRoomUpdate((room) => {
      setCurrentRoom(room)
      if (room.status === 'playing') {
        onStartGame()
      }
    })

    mp.onError((err) => {
      setError(err)
    })

    return () => {
      mp.disconnect()
    }
  }, [mp, onStartGame])

  const handleConnect = async () => {
    try {
      // 实际项目中应连接到真实服务器
      // await mp.connect('wss://your-server.com/ws')
      
      // 模拟连接成功
      setView('rooms')
    } catch (err) {
      setError('连接失败: ' + (err as Error).message)
    }
  }

  const handleCreateRoom = () => {
    // 模拟创建房间
    const newRoom: RoomInfo = {
      id: Date.now().toString(),
      name: playerName + '的房间',
      host: playerName,
      players: [{ id: '1', name: playerName, country: 'america', team: 1, ready: false }],
      maxPlayers: 2,
      map: '冰雪世界',
      status: 'waiting',
    }
    setCurrentRoom(newRoom)
    setView('room')
  }

  const handleJoinRoom = (room: RoomInfo) => {
    const updatedRoom: RoomInfo = {
      ...room,
      players: [
        ...room.players,
        { id: '2', name: playerName, country: 'russia', team: 2, ready: false }
      ]
    }
    setCurrentRoom(updatedRoom)
    setView('room')
  }

  const handleLeaveRoom = () => {
    setCurrentRoom(null)
    setView('rooms')
  }

  const handleReady = () => {
    if (currentRoom) {
      const allReady = currentRoom.players.every(p => p.ready)
      const updatedRoom: RoomInfo = {
        ...currentRoom,
        players: currentRoom.players.map(p =>
          p.name === playerName ? { ...p, ready: !p.ready } : p
        ),
        status: allReady ? 'playing' : 'waiting'
      }
      setCurrentRoom(updatedRoom)

      if (allReady) {
        setTimeout(() => onStartGame(), 1000)
      }
    }
  }

  // 大厅界面
  if (view === 'lobby') {
    return (
      <div className="multiplayer-screen">
        <h1>多人对战</h1>

        <div className="lobby-container">
          <div className="player-info">
            <label>你的名字:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={16}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="lobby-buttons">
            <button className="mp-btn primary" onClick={handleConnect}>
              连接到服务器
            </button>

            <button className="mp-btn secondary" onClick={onBack}>
              返回主菜单
            </button>
          </div>

          <div className="mp-info">
            <p>多人对战功能需要连接到游戏服务器</p>
            <p>当前版本仅支持本地测试</p>
          </div>
        </div>
      </div>
    )
  }

  // 房间列表界面
  if (view === 'rooms') {
    return (
      <div className="multiplayer-screen">
        <h1>房间列表</h1>

        <div className="rooms-container">
          <div className="rooms-header">
            <span>房间名</span>
            <span>地图</span>
            <span>人数</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          <div className="rooms-list">
            {rooms.map(room => (
              <div key={room.id} className="room-item">
                <span className="room-name">{room.name}</span>
                <span>{room.map}</span>
                <span>{room.players.length}/{room.maxPlayers}</span>
                <span className={`status-${room.status}`}>
                  {room.status === 'waiting' ? '等待中' : '游戏中'}
                </span>
                <button
                  className="join-btn"
                  onClick={() => handleJoinRoom(room)}
                  disabled={room.players.length >= room.maxPlayers || room.status !== 'waiting'}
                >
                  加入
                </button>
              </div>
            ))}
          </div>

          <div className="rooms-actions">
            <button className="mp-btn primary" onClick={handleCreateRoom}>
              创建房间
            </button>
            <button className="mp-btn" onClick={() => mp.getRoomList()}>
              刷新列表
            </button>
            <button className="mp-btn secondary" onClick={onBack}>
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 房间内界面
  if (view === 'room' && currentRoom) {
    const isHost = currentRoom.host === playerName
    const isReady = currentRoom.players.find(p => p.name === playerName)?.ready
    const allReady = currentRoom.players.length >= 2 && currentRoom.players.every(p => p.ready)

    return (
      <div className="multiplayer-screen">
        <h1>{currentRoom.name}</h1>

        <div className="room-detail">
          <div className="players-list">
            <h3>玩家列表</h3>
            {currentRoom.players.map((player, index) => (
              <div key={player.id} className={`player-slot ${player.ready ? 'ready' : ''}`}>
                <span className="slot-number">玩家 {index + 1}</span>
                <span className="player-name">{player.name} {player.name === currentRoom.host && '(房主)'}</span>
                <span className={`ready-status ${player.ready ? 'ready' : ''}`}>
                  {player.ready ? '✓ 就绪' : '准备中...'}
                </span>
              </div>
            ))}

            {currentRoom.players.length < currentRoom.maxPlayers && (
              <div className="player-slot empty">
                <span>等待玩家加入...</span>
              </div>
            )}
          </div>

          <div className="room-settings">
            <h3>房间设置</h3>
            <div className="setting-item">
              <label>地图:</label>
              <span>{currentRoom.map}</span>
            </div>
            <div className="setting-item">
              <label>人数:</label>
              <span>{currentRoom.maxPlayers}人</span>
            </div>
          </div>

          <div className="room-actions">
            <button
              className={`mp-btn ${isReady ? 'secondary' : 'primary'}`}
              onClick={handleReady}
            >
              {isReady ? '取消准备' : '准备就绪'}
            </button>

            {isHost && allReady && (
              <button className="mp-btn primary" onClick={() => onStartGame()}>
                开始游戏
              </button>
            )}

            <button className="mp-btn secondary" onClick={handleLeaveRoom}>
              离开房间
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
