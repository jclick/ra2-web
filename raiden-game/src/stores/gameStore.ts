import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  GameState, 
  WeaponType, 
  SubWeaponType,
  GAME_CONFIG 
} from '../constants';

// ============================================
// 类型定义
// ============================================

export interface PlayerState {
  x: number;
  y: number;
  lives: number;
  bombs: number;
  score: number;
  mainWeapon: WeaponType;
  subWeapon: SubWeaponType;
  mainPower: number;
  subPower: number;
  medals: number;
  invincible: boolean;
}

export interface GameStoreState {
  // 游戏状态
  gameState: GameState;
  frame: number;
  stage: number;
  stageProgress: number;
  highScore: number;
  
  // 玩家状态
  player: PlayerState | null;
  
  // 实体状态（用于 UI 显示）
  enemyCount: number;
  bulletCount: number;
  itemCount: number;
  
  // 设置选项
  soundEnabled: boolean;
  musicEnabled: boolean;
  screenShake: boolean;
  showHitbox: boolean;
}

export interface GameStoreActions {
  // 游戏流程控制
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  gameOver: () => void;
  returnToMenu: () => void;
  nextStage: () => void;
  
  // 状态更新
  setGameState: (state: GameState) => void;
  incrementFrame: () => void;
  setStage: (stage: number) => void;
  addStageProgress: (progress: number) => void;
  updateHighScore: (score: number) => void;
  
  // 玩家状态更新
  setPlayer: (player: PlayerState | null) => void;
  updatePlayerPosition: (x: number, y: number) => void;
  updatePlayerScore: (score: number) => void;
  addPlayerScore: (points: number) => void;
  setPlayerWeapon: (main: WeaponType, sub: SubWeaponType) => void;
  upgradeWeapon: (isMain: boolean) => void;
  updatePlayerStats: (stats: Partial<PlayerState>) => void;
  
  // 实体计数
  setEntityCounts: (counts: { enemies?: number; bullets?: number; items?: number }) => void;
  
  // 设置
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleScreenShake: () => void;
  toggleShowHitbox: () => void;
  
  // 重置
  resetGame: () => void;
}

// ============================================
// 初始状态
// ============================================

const initialPlayerState: PlayerState = {
  x: GAME_CONFIG.WIDTH / 2,
  y: GAME_CONFIG.HEIGHT - 40,
  lives: 2,
  bombs: 3,
  score: 0,
  mainWeapon: WeaponType.VULCAN,
  subWeapon: SubWeaponType.NONE,
  mainPower: 0,
  subPower: 0,
  medals: 0,
  invincible: false,
};

const initialState: GameStoreState = {
  gameState: GameState.MENU,
  frame: 0,
  stage: 1,
  stageProgress: 0,
  highScore: 0,
  player: null,
  enemyCount: 0,
  bulletCount: 0,
  itemCount: 0,
  soundEnabled: true,
  musicEnabled: true,
  screenShake: true,
  showHitbox: true,
};

// 从 localStorage 加载高分
const loadHighScore = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('raiden-hiscore');
    return saved ? parseInt(saved, 10) : 0;
  }
  return 0;
};

// 保存高分到 localStorage
const saveHighScore = (score: number) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('raiden-hiscore', score.toString());
  }
};

// ============================================
// Store 创建 (Vanilla 版本)
// ============================================

const gameStore = createStore<GameStoreState & GameStoreActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    highScore: typeof window !== 'undefined' ? loadHighScore() : 0,
    
    // ========== 游戏流程控制 ==========
    
    startGame: () => set({
      gameState: GameState.PLAYING,
      frame: 0,
      stage: 1,
      stageProgress: 0,
      player: { ...initialPlayerState },
      enemyCount: 0,
      bulletCount: 0,
      itemCount: 0,
    }),
    
    pauseGame: () => {
      const { gameState } = get();
      if (gameState === GameState.PLAYING) {
        set({ gameState: GameState.PAUSED });
      }
    },
    
    resumeGame: () => {
      const { gameState } = get();
      if (gameState === GameState.PAUSED) {
        set({ gameState: GameState.PLAYING });
      }
    },
    
    gameOver: () => {
      const { player, highScore } = get();
      const finalScore = player?.score || 0;
      
      if (finalScore > highScore) {
        saveHighScore(finalScore);
        set({ highScore: finalScore });
      }
      
      set({ gameState: GameState.GAME_OVER });
    },
    
    returnToMenu: () => set({
      gameState: GameState.MENU,
      player: null,
    }),
    
    nextStage: () => set((state) => ({
      stage: state.stage + 1,
      stageProgress: 0,
    })),
    
    // ========== 状态更新 ==========
    
    setGameState: (gameState) => set({ gameState }),
    
    incrementFrame: () => set((state) => ({ frame: state.frame + 1 })),
    
    setStage: (stage) => set({ stage }),
    
    addStageProgress: (progress) => set((state) => ({
      stageProgress: state.stageProgress + progress,
    })),
    
    updateHighScore: (score) => {
      const { highScore } = get();
      if (score > highScore) {
        saveHighScore(score);
        set({ highScore: score });
      }
    },
    
    // ========== 玩家状态更新 ==========
    
    setPlayer: (player) => set({ player }),
    
    updatePlayerPosition: (x, y) => set((state) => ({
      player: state.player ? { ...state.player, x, y } : null,
    })),
    
    updatePlayerScore: (score) => set((state) => ({
      player: state.player ? { ...state.player, score } : null,
    })),
    
    addPlayerScore: (points) => set((state) => {
      if (!state.player) return state;
      const newScore = state.player.score + points;
      return {
        player: { ...state.player, score: newScore },
      };
    }),
    
    setPlayerWeapon: (main, sub) => set((state) => ({
      player: state.player ? { 
        ...state.player, 
        mainWeapon: main, 
        subWeapon: sub 
      } : null,
    })),
    
    upgradeWeapon: (isMain) => set((state) => {
      if (!state.player) return state;
      
      if (isMain) {
        return {
          player: {
            ...state.player,
            mainPower: Math.min(7, state.player.mainPower + 1),
          },
        };
      } else {
        return {
          player: {
            ...state.player,
            subPower: Math.min(4, state.player.subPower + 1),
          },
        };
      }
    }),
    
    updatePlayerStats: (stats) => set((state) => ({
      player: state.player ? { ...state.player, ...stats } : null,
    })),
    
    // ========== 实体计数 ==========
    
    setEntityCounts: ({ enemies, bullets, items }) => set((state) => ({
      enemyCount: enemies !== undefined ? enemies : state.enemyCount,
      bulletCount: bullets !== undefined ? bullets : state.bulletCount,
      itemCount: items !== undefined ? items : state.itemCount,
    })),
    
    // ========== 设置 ==========
    
    toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
    
    toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
    
    toggleScreenShake: () => set((state) => ({ screenShake: !state.screenShake })),
    
    toggleShowHitbox: () => set((state) => ({ showHitbox: !state.showHitbox })),
    
    // ========== 重置 ==========
    
    resetGame: () => set({
      ...initialState,
      highScore: get().highScore,
    }),
  }))
);

// ============================================
// 导出
// ============================================

// 导出 store 实例
export { gameStore };

// 为了兼容 React 组件，导出一个简化版的 hook
// 注意：由于这是一个 vanilla store，在 React 中使用需要 zustand 的 react 绑定
// 但这里我们只导出 store 实例，让用户直接使用
export const useGameStore = gameStore;

// ============================================
// 选择器函数
// ============================================

// 游戏状态选择器
export const getGameState = () => gameStore.getState().gameState;
export const getIsPlaying = () => gameStore.getState().gameState === GameState.PLAYING;
export const getIsPaused = () => gameStore.getState().gameState === GameState.PAUSED;
export const getIsGameOver = () => gameStore.getState().gameState === GameState.GAME_OVER;

// 玩家状态选择器
export const getPlayer = () => gameStore.getState().player;
export const getPlayerScore = () => gameStore.getState().player?.score ?? 0;
export const getPlayerLives = () => gameStore.getState().player?.lives ?? 0;
export const getPlayerBombs = () => gameStore.getState().player?.bombs ?? 0;
export const getPlayerPower = () => gameStore.getState().player?.mainPower ?? 0;

// 分数选择器
export const getScore = () => ({
  score: gameStore.getState().player?.score ?? 0,
  highScore: gameStore.getState().highScore,
});

// 设置选择器
export const getSettings = () => ({
  soundEnabled: gameStore.getState().soundEnabled,
  musicEnabled: gameStore.getState().musicEnabled,
  screenShake: gameStore.getState().screenShake,
  showHitbox: gameStore.getState().showHitbox,
});

// ============================================
// 便捷操作函数
// ============================================

export const gameActions = {
  startGame: () => gameStore.getState().startGame(),
  pauseGame: () => gameStore.getState().pauseGame(),
  resumeGame: () => gameStore.getState().resumeGame(),
  gameOver: () => gameStore.getState().gameOver(),
  addScore: (points: number) => gameStore.getState().addPlayerScore(points),
};
