/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameStore, gameActions } from './gameStore';
import { GameState, WeaponType, SubWeaponType } from '../constants';

describe('gameStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    gameStore.getState().resetGame();
    
    // 清理 localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('初始状态', () => {
    it('应该以 MENU 状态开始', () => {
      const state = gameStore.getState();
      expect(state.gameState).toBe(GameState.MENU);
    });

    it('初始玩家应该为 null', () => {
      const state = gameStore.getState();
      expect(state.player).toBeNull();
    });

    it('初始实体计数应该为 0', () => {
      const state = gameStore.getState();
      expect(state.enemyCount).toBe(0);
      expect(state.bulletCount).toBe(0);
      expect(state.itemCount).toBe(0);
    });
  });

  describe('游戏流程', () => {
    it('startGame 应该正确初始化游戏状态', () => {
      gameStore.getState().startGame();
      
      const state = gameStore.getState();
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.player).not.toBeNull();
      expect(state.frame).toBe(0);
      expect(state.stage).toBe(1);
      expect(state.stageProgress).toBe(0);
    });

    it('pauseGame 应该暂停游戏', () => {
      gameStore.getState().startGame();
      gameStore.getState().pauseGame();
      
      expect(gameStore.getState().gameState).toBe(GameState.PAUSED);
    });

    it('resumeGame 应该恢复游戏', () => {
      gameStore.getState().startGame();
      gameStore.getState().pauseGame();
      gameStore.getState().resumeGame();
      
      expect(gameStore.getState().gameState).toBe(GameState.PLAYING);
    });

    it('gameOver 应该结束游戏', () => {
      gameStore.getState().startGame();
      gameStore.getState().gameOver();
      
      expect(gameStore.getState().gameState).toBe(GameState.GAME_OVER);
    });

    it('returnToMenu 应该返回主菜单', () => {
      gameStore.getState().startGame();
      gameStore.getState().gameOver();
      gameStore.getState().returnToMenu();
      
      const state = gameStore.getState();
      expect(state.gameState).toBe(GameState.MENU);
      expect(state.player).toBeNull();
    });

    it('nextStage 应该进入下一关', () => {
      gameStore.getState().startGame();
      gameStore.getState().nextStage();
      
      expect(gameStore.getState().stage).toBe(2);
    });
  });

  describe('玩家状态', () => {
    it('应该正确更新玩家位置', () => {
      gameStore.getState().startGame();
      gameStore.getState().updatePlayerPosition(100, 200);
      
      const player = gameStore.getState().player;
      expect(player?.x).toBe(100);
      expect(player?.y).toBe(200);
    });

    it('应该正确更新玩家分数', () => {
      gameStore.getState().startGame();
      gameStore.getState().updatePlayerScore(1000);
      
      expect(gameStore.getState().player?.score).toBe(1000);
    });

    it('应该正确累加玩家分数', () => {
      gameStore.getState().startGame();
      gameStore.getState().addPlayerScore(500);
      gameStore.getState().addPlayerScore(300);
      
      expect(gameStore.getState().player?.score).toBe(800);
    });

    it('应该正确更新玩家武器', () => {
      gameStore.getState().startGame();
      gameStore.getState().setPlayerWeapon(WeaponType.LASER, SubWeaponType.MISSILE);
      
      const player = gameStore.getState().player;
      expect(player?.mainWeapon).toBe(WeaponType.LASER);
      expect(player?.subWeapon).toBe(SubWeaponType.MISSILE);
    });

    it('应该正确升级主武器', () => {
      gameStore.getState().startGame();
      gameStore.getState().upgradeWeapon(true);
      gameStore.getState().upgradeWeapon(true);
      
      expect(gameStore.getState().player?.mainPower).toBe(2);
    });

    it('应该正确升级副武器', () => {
      gameStore.getState().startGame();
      gameStore.getState().upgradeWeapon(false);
      
      expect(gameStore.getState().player?.subPower).toBe(1);
    });

    it('武器等级不应该超过最大值', () => {
      gameStore.getState().startGame();
      
      // 主武器最大 7 级
      for (let i = 0; i < 10; i++) {
        gameStore.getState().upgradeWeapon(true);
      }
      expect(gameStore.getState().player?.mainPower).toBe(7);
      
      // 副武器最大 4 级
      for (let i = 0; i < 10; i++) {
        gameStore.getState().upgradeWeapon(false);
      }
      expect(gameStore.getState().player?.subPower).toBe(4);
    });
  });

  describe('实体计数', () => {
    it('应该正确设置实体数量', () => {
      gameStore.getState().setEntityCounts({
        enemies: 5,
        bullets: 20,
        items: 3,
      });
      
      const state = gameStore.getState();
      expect(state.enemyCount).toBe(5);
      expect(state.bulletCount).toBe(20);
      expect(state.itemCount).toBe(3);
    });

    it('部分更新应该保持其他值不变', () => {
      gameStore.getState().setEntityCounts({ enemies: 5 });
      
      const state = gameStore.getState();
      expect(state.enemyCount).toBe(5);
      expect(state.bulletCount).toBe(0);
      expect(state.itemCount).toBe(0);
    });
  });

  describe('设置', () => {
    it('应该正确切换声音设置', () => {
      const initialState = gameStore.getState().soundEnabled;
      
      gameStore.getState().toggleSound();
      
      expect(gameStore.getState().soundEnabled).toBe(!initialState);
    });

    it('应该正确切换音乐设置', () => {
      const initialState = gameStore.getState().musicEnabled;
      
      gameStore.getState().toggleMusic();
      
      expect(gameStore.getState().musicEnabled).toBe(!initialState);
    });

    it('应该正确切换屏幕震动设置', () => {
      const initialState = gameStore.getState().screenShake;
      
      gameStore.getState().toggleScreenShake();
      
      expect(gameStore.getState().screenShake).toBe(!initialState);
    });

    it('应该正确切换 hitbox 显示', () => {
      const initialState = gameStore.getState().showHitbox;
      
      gameStore.getState().toggleShowHitbox();
      
      expect(gameStore.getState().showHitbox).toBe(!initialState);
    });
  });

  describe('高分记录', () => {
    it('应该保存新的高分', () => {
      gameStore.getState().startGame();
      gameStore.getState().updatePlayerScore(5000);
      gameStore.getState().gameOver();
      
      expect(gameStore.getState().highScore).toBe(5000);
    });

    it('不应该更新低分', () => {
      gameStore.setState({ highScore: 10000 });
      
      gameStore.getState().startGame();
      gameStore.getState().updatePlayerScore(5000);
      gameStore.getState().gameOver();
      
      expect(gameStore.getState().highScore).toBe(10000);
    });
  });

  describe('便捷操作', () => {
    it('gameActions 应该正确工作', () => {
      gameActions.startGame();
      expect(gameStore.getState().gameState).toBe(GameState.PLAYING);
      
      gameActions.pauseGame();
      expect(gameStore.getState().gameState).toBe(GameState.PAUSED);
      
      gameActions.resumeGame();
      expect(gameStore.getState().gameState).toBe(GameState.PLAYING);
      
      gameActions.gameOver();
      expect(gameStore.getState().gameState).toBe(GameState.GAME_OVER);
    });
  });
});
