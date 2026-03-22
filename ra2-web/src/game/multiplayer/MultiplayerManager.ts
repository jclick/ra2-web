/**
 * 多人对战管理器
 * 处理 WebSocket 连接、房间管理、游戏同步
 */

// 游戏状态类型（简化版）
interface GameState {
  frame: number
  timestamp: number
  players: any[]
  units: any[]
  buildings: any[]
}

// 玩家信息
export interface PlayerInfo {
  id: string
  name: string
  country: string
  team: number
  ready: boolean
}

// 房间信息
export interface RoomInfo {
  id: string
  name: string
  host: string
  players: PlayerInfo[]
  maxPlayers: number
  map: string
  status: 'waiting' | 'playing' | 'ended'
}

// 网络消息类型
export enum MessageType {
  // 连接
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // 房间
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_LIST = 'room_list',
  ROOM_UPDATE = 'room_update',
  
  // 玩家
  PLAYER_JOIN = 'player_join',
  PLAYER_LEAVE = 'player_leave',
  PLAYER_READY = 'player_ready',
  
  // 游戏
  GAME_START = 'game_start',
  GAME_ACTION = 'game_action',
  GAME_STATE = 'game_state',
  GAME_END = 'game_end',
  
  // 同步
  SYNC = 'sync',
  PING = 'ping',
  PONG = 'pong',
  
  // 错误
  ERROR = 'error',
}

// 游戏动作
export interface GameAction {
  type: 'move' | 'attack' | 'build' | 'train' | 'sell' | 'deploy'
  unitId?: string
  targetId?: string
  position?: { x: number; y: number }
  buildingType?: string
  unitType?: string
  timestamp: number
  frame: number
}

// 网络消息
export interface NetworkMessage {
  type: MessageType
  payload: any
  sender: string
  timestamp: number
}

/**
 * 多人对战管理器
 */
export class MultiplayerManager {
  private ws: WebSocket | null = null
  private playerId: string = ''
  private roomId: string = ''
  private connected: boolean = false
  
  // 回调
  private onConnectCallback: (() => void) | null = null
  private onDisconnectCallback: (() => void) | null = null
  private onRoomListCallback: ((rooms: RoomInfo[]) => void) | null = null
  private onRoomUpdateCallback: ((room: RoomInfo) => void) | null = null
  private onGameStartCallback: (() => void) | null = null
  private onGameActionCallback: ((action: GameAction) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null

  /**
   * 连接到服务器
   */
  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl)
        
        this.ws.onopen = () => {
          console.log('[MP] 已连接到服务器')
          this.connected = true
          this.onConnectCallback?.()
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data))
        }
        
        this.ws.onclose = () => {
          console.log('[MP] 连接已关闭')
          this.connected = false
          this.onDisconnectCallback?.()
        }
        
        this.ws.onerror = (error) => {
          console.error('[MP] 连接错误:', error)
          this.onErrorCallback?.('连接服务器失败')
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.ws?.close()
    this.ws = null
    this.connected = false
  }

  /**
   * 发送消息
   */
  private send(type: MessageType, payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[MP] 未连接到服务器')
      return
    }
    
    const message: NetworkMessage = {
      type,
      payload,
      sender: this.playerId,
      timestamp: Date.now(),
    }
    
    this.ws.send(JSON.stringify(message))
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: NetworkMessage): void {
    console.log('[MP] 收到消息:', message.type)
    
    switch (message.type) {
      case MessageType.CONNECT:
        this.playerId = message.payload.playerId
        break
        
      case MessageType.ROOM_LIST:
        this.onRoomListCallback?.(message.payload.rooms)
        break
        
      case MessageType.ROOM_UPDATE:
        this.roomId = message.payload.room.id
        this.onRoomUpdateCallback?.(message.payload.room)
        break
        
      case MessageType.GAME_START:
        this.onGameStartCallback?.()
        break
        
      case MessageType.GAME_ACTION:
        this.onGameActionCallback?.(message.payload.action)
        break
        
      case MessageType.ERROR:
        this.onErrorCallback?.(message.payload.message)
        break
    }
  }

  // ========== 房间管理 ==========

  /**
   * 获取房间列表
   */
  getRoomList(): void {
    this.send(MessageType.ROOM_LIST, {})
  }

  /**
   * 创建房间
   */
  createRoom(name: string, map: string, maxPlayers: number = 2): void {
    this.send(MessageType.CREATE_ROOM, { name, map, maxPlayers })
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string): void {
    this.send(MessageType.JOIN_ROOM, { roomId })
  }

  /**
   * 离开房间
   */
  leaveRoom(): void {
    this.send(MessageType.LEAVE_ROOM, { roomId: this.roomId })
    this.roomId = ''
  }

  /**
   * 准备就绪
   */
  setReady(ready: boolean): void {
    this.send(MessageType.PLAYER_READY, { roomId: this.roomId, ready })
  }

  // ========== 游戏同步 ==========

  /**
   * 发送游戏动作
   */
  sendAction(action: GameAction): void {
    this.send(MessageType.GAME_ACTION, { roomId: this.roomId, action })
  }

  /**
   * 发送游戏状态（主机用）
   */
  sendGameState(state: GameState): void {
    this.send(MessageType.GAME_STATE, { roomId: this.roomId, state })
  }

  // ========== 回调设置 ==========

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback
  }

  onRoomList(callback: (rooms: RoomInfo[]) => void): void {
    this.onRoomListCallback = callback
  }

  onRoomUpdate(callback: (room: RoomInfo) => void): void {
    this.onRoomUpdateCallback = callback
  }

  onGameStart(callback: () => void): void {
    this.onGameStartCallback = callback
  }

  onGameAction(callback: (action: GameAction) => void): void {
    this.onGameActionCallback = callback
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback
  }

  // ========== 状态查询 ==========

  isConnected(): boolean {
    return this.connected
  }

  getPlayerId(): string {
    return this.playerId
  }

  getRoomId(): string {
    return this.roomId
  }
}

// 单例实例
let multiplayerManager: MultiplayerManager | null = null

export function getMultiplayerManager(): MultiplayerManager {
  if (!multiplayerManager) {
    multiplayerManager = new MultiplayerManager()
  }
  return multiplayerManager
}
