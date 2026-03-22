import { Player } from './entities/Player';
import { Entity } from './entities/Entity';
import { PlayerBulletMain, PlayerBulletSub, EnemyBullet } from './entities/Bullet';
import { Enemy, EnemyFactory, Boss1 } from './entities/Enemy';
import { Item, ItemFactory, ItemRed, ItemBlue, ItemM, ItemH, ItemP, ItemB, Item1UP, ItemMedal, ItemMiclus, ItemFairy } from './entities/Item';
import { Explosion, BombEffect, ScorePopup, WarningEffect } from './entities/Effect';
import { InputManager, InputDevice } from './systems/InputManager';
import { BackgroundRenderer } from './systems/BackgroundRenderer';
import { 
  GAME_CONFIG, 
  GameState, 
  EntityType,
  WeaponType,
  STAGE_THEMES,
} from './constants';
import { useGameStore, gameActions } from './stores/gameStore';

/**
 * 游戏主类 - 使用 Zustand 状态管理
 * 
 * 架构改进:
 * - 使用 Zustand 进行全局状态管理
 * - 简化组件间数据传递
 * - 游戏状态持久化（高分记录）
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private background: BackgroundRenderer;
  private input: InputManager;
  
  // 本地游戏循环状态（不放入 store 以优化性能）
  private frame: number = 0;
  private bossSpawned: boolean = false;
  private spawnTimer: number = 0;
  private waveNumber: number = 0;
  
  // 实体列表
  private player: Player | null = null;
  private playerBulletsMain: PlayerBulletMain[] = [];
  private playerBulletsSub: PlayerBulletSub[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private enemies: Enemy[] = [];
  private items: Item[] = [];
  private explosions: Explosion[] = [];
  private bombEffects: BombEffect[] = [];
  private effects: any[] = [];
  
  // 取消订阅函数
  private unsubscribers: (() => void)[] = [];
  
  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = canvas;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    
    // 初始化系统
    this.background = new BackgroundRenderer(canvas);
    this.input = new InputManager(canvas);
    
    // 订阅 store 状态变化
    this.setupStoreSubscriptions();
    
    // 绑定 UI 事件
    this.bindEvents();
    
    // 启动游戏循环
    this.gameLoop();
  }
  
  /**
   * 订阅 Zustand store 状态变化
   */
  private setupStoreSubscriptions(): void {
    const store = useGameStore;
    
    // 监听游戏状态变化
    this.unsubscribers.push(
      store.subscribe(
        (state) => state.gameState,
        (gameState) => {
          this.onGameStateChange(gameState);
        }
      )
    );
    
    // 监听分数变化以更新高分
    this.unsubscribers.push(
      store.subscribe(
        (state) => state.player?.score,
        (score) => {
          if (score !== undefined) {
            store.getState().updateHighScore(score);
            this.updateUI();
          }
        }
      )
    );
  }
  
  /**
   * 游戏状态变化回调
   */
  private onGameStateChange(gameState: GameState): void {
    const { startScreen, gameOverScreen, pauseScreen, hud } = this.uiElements;
    
    switch (gameState) {
      case GameState.MENU:
        startScreen.classList.remove('hidden');
        gameOverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        hud.classList.add('hidden');
        break;
        
      case GameState.PLAYING:
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        break;
        
      case GameState.PAUSED:
        pauseScreen.classList.remove('hidden');
        break;
        
      case GameState.GAME_OVER:
        gameOverScreen.classList.remove('hidden');
        hud.classList.add('hidden');
        break;
    }
    
    this.updateUI();
  }
  
  /**
   * 获取 UI 元素
   */
  private get uiElements() {
    return {
      startScreen: document.getElementById('start-screen')!,
      gameOverScreen: document.getElementById('game-over')!,
      pauseScreen: document.getElementById('pause-screen')!,
      hud: document.getElementById('hud')!,
      scoreEl: document.getElementById('score')!,
      hiscoreEl: document.getElementById('hiscore')!,
      powerEl: document.getElementById('power')!,
      bombsEl: document.getElementById('bombs')!,
      livesEl: document.getElementById('lives')!,
      finalScoreEl: document.getElementById('final-score')!,
      highScoreEl: document.getElementById('high-score')!,
    };
  }
  
  /**
   * 绑定 UI 事件
   */
  private bindEvents(): void {
    // 开始/重新开始按钮
    document.getElementById('start-btn')?.addEventListener('click', () => {
      this.startGame();
    });
    
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.startGame();
    });
    
    document.getElementById('resume-btn')?.addEventListener('click', () => {
      useGameStore.getState().resumeGame();
    });
    
    // 键盘快捷键
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const state = useGameStore.getState().gameState;
        if (state === GameState.MENU) {
          this.startGame();
        }
      }
    });
  }
  
  /**
   * 开始游戏
   */
  private startGame(): void {
    // 重置本地状态
    this.frame = 0;
    this.bossSpawned = false;
    this.spawnTimer = 0;
    this.waveNumber = 0;
    
    // 重置实体
    this.player = new Player(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 40);
    this.playerBulletsMain = [];
    this.playerBulletsSub = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.items = [];
    this.explosions = [];
    this.bombEffects = [];
    this.effects = [];
    
    // 更新 store 状态
    useGameStore.getState().startGame();
    
    // 设置玩家初始位置到 store
    useGameStore.getState().setPlayer({
      x: this.player.x,
      y: this.player.y,
      lives: this.player.lives,
      bombs: this.player.bombs,
      score: this.player.score,
      mainWeapon: this.player.mainWeapon,
      subWeapon: this.player.subWeapon,
      mainPower: this.player.mainPower,
      subPower: this.player.subPower,
      medals: this.player.medals,
      invincible: this.player.invincible,
    });
    
    // BOSS警告
    setTimeout(() => {
      this.effects.push(new WarningEffect());
    }, 1000);
  }
  
  /**
   * 主游戏循环
   */
  private gameLoop(): void {
    // 更新输入管理器
    this.input.update();
    
    // 处理输入
    this.handleInput();
    
    // 更新
    const state = useGameStore.getState().gameState;
    if (state === GameState.PLAYING) {
      this.update();
      useGameStore.getState().incrementFrame();
    }
    
    // 渲染
    this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  /**
   * 处理输入
   */
  private handleInput(): void {
    const store = useGameStore.getState();
    const state = store.gameState;
    
    // 暂停切换
    if (this.input.isPausePressed()) {
      if (state === GameState.PLAYING) {
        store.pauseGame();
      } else if (state === GameState.PAUSED) {
        store.resumeGame();
      }
    }
    
    // 炸弹
    if (this.input.isBombPressed() && state === GameState.PLAYING) {
      this.useBomb();
    }
    
    // 鼠标移动玩家（当使用鼠标时）
    if (state === GameState.PLAYING && this.player && this.input.getCurrentDevice() === InputDevice.MOUSE) {
      const mousePos = this.input.getMousePosition();
      // 平滑移动到鼠标位置
      const dx = mousePos.x - this.player.x;
      const dy = mousePos.y - this.player.y;
      
      // 检查是否有键盘输入，如果有则优先键盘
      const keyboardMovement = this.input.getMovement();
      if (keyboardMovement.x === 0 && keyboardMovement.y === 0) {
        // 只有没有键盘输入时才使用鼠标
        this.player.x += dx * 0.1;
        this.player.y += dy * 0.1;
      }
    }
    
    // 处理滚轮（例如：调整视角距离或切换武器）
    const wheelDelta = this.input.getWheelDelta();
    if (wheelDelta !== 0) {
      // 可以在这里添加滚轮功能，例如缩放
      // console.log('Wheel delta:', wheelDelta);
    }
  }
  
  /**
   * 使用炸弹
   */
  private useBomb(): void {
    if (this.player?.useBomb()) {
      // 清屏效果
      this.bombEffects.push(new BombEffect(this.player.x, this.player.y));
      
      // 清除所有敌弹
      this.enemyBullets = [];
      
      // 对所有敌人造成伤害
      for (const enemy of this.enemies) {
        if (enemy.takeDamage(50)) {
          this.spawnExplosion(enemy.x, enemy.y, this.getExplosionSize(enemy.enemyType));
          this.spawnItem(enemy.x, enemy.y, enemy.enemyType);
          this.addScore(enemy.scoreValue, enemy.x, enemy.y);
        }
      }
      
      // 更新 store 中的炸弹数量
      useGameStore.getState().updatePlayerStats({ bombs: this.player.bombs });
      this.updateUI();
    }
  }
  
  /**
   * 游戏更新
   */
  private update(): void {
    this.frame++;
    const store = useGameStore.getState();
    store.addStageProgress(1);
    const stageProgress = store.stageProgress;
    
    // 更新背景
    this.background.update();
    
    // 更新玩家
    this.updatePlayer();
    
    // 生成敌人
    this.spawnEnemies();
    
    // 更新所有实体
    this.updateEntities();
    
    // 碰撞检测
    this.checkCollisions();
    
    // 清理
    this.cleanupEntities();
    
    // 更新实体计数到 store
    store.setEntityCounts({
      enemies: this.enemies.length,
      bullets: this.playerBulletsMain.length + this.playerBulletsSub.length + this.enemyBullets.length,
      items: this.items.length,
    });
    
    // 更新UI（每10帧）
    if (this.frame % 10 === 0) {
      this.updateUI();
    }
  }
  
  /**
   * 更新玩家
   */
  private updatePlayer(): void {
    if (!this.player?.active) {
      if (this.player && !this.player.active) {
        useGameStore.getState().gameOver();
      }
      return;
    }
    
    const movement = this.input.getMovement();
    const isShooting = this.input.isShooting();
    
    const bullets = this.player.update(movement, isShooting);
    this.playerBulletsMain.push(...bullets.main);
    this.playerBulletsSub.push(...bullets.sub);
    
    // 同步玩家状态到 store
    useGameStore.getState().updatePlayerStats({
      x: this.player.x,
      y: this.player.y,
      score: this.player.score,
      lives: this.player.lives,
      bombs: this.player.bombs,
      mainPower: this.player.mainPower,
      subPower: this.player.subPower,
      invincible: this.player.invincible,
    });
  }
  
  /**
   * 生成敌人
   */
  private spawnEnemies(): void {
    this.spawnTimer++;
    
    const spawnRate = Math.max(40, 80 - useGameStore.getState().stage * 5);
    
    // BOSS战
    if (useGameStore.getState().stageProgress > 2000 && !this.bossSpawned) {
      this.enemies.push(new Boss1(GAME_CONFIG.WIDTH / 2, -60));
      this.bossSpawned = true;
      this.effects.push(new WarningEffect());
      return;
    }
    
    // 普通波次
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.waveNumber++;
      
      const newEnemies = EnemyFactory.createFormation(this.waveNumber, GAME_CONFIG.WIDTH);
      this.enemies.push(...newEnemies);
    }
  }
  
  /**
   * 更新所有实体
   */
  private updateEntities(): void {
    // 玩家主武器子弹
    for (const bullet of this.playerBulletsMain) {
      bullet.update();
    }
    
    // 玩家副武器子弹
    const enemyPositions = this.enemies.map(e => ({ x: e.x, y: e.y }));
    for (const bullet of this.playerBulletsSub) {
      bullet.update(enemyPositions);
    }
    
    // 敌人
    for (const enemy of this.enemies) {
      enemy.update();
      if (this.player?.active) {
        const bullets = enemy.shoot(this.player.x, this.player.y);
        this.enemyBullets.push(...bullets);
      }
    }
    
    // 敌弹
    for (const bullet of this.enemyBullets) {
      bullet.update();
    }
    
    // 道具
    for (const item of this.items) {
      item.update();
    }
    
    // 爆炸效果
    for (const explosion of this.explosions) {
      explosion.update();
    }
    
    // 炸弹效果
    for (const effect of this.bombEffects) {
      effect.update();
    }
    
    // 其他效果
    for (const effect of this.effects) {
      effect.update();
    }
    this.effects = this.effects.filter((e: any) => e.active);
  }
  
  /**
   * 碰撞检测
   */
  private checkCollisions(): void {
    if (!this.player?.active) return;
    
    // 玩家主武器子弹 vs 敌人
    for (const bullet of this.playerBulletsMain) {
      if (!bullet.active) continue;
      
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        
        if (bullet.collidesWith(enemy)) {
          bullet.active = false;
          
          if (enemy.takeDamage(bullet.power)) {
            this.destroyEnemy(enemy);
          }
          break;
        }
      }
    }
    
    // 玩家副武器子弹 vs 敌人
    for (const bullet of this.playerBulletsSub) {
      if (!bullet.active) continue;
      
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        
        if (bullet.collidesWith(enemy)) {
          bullet.active = false;
          
          if (enemy.takeDamage(2)) {
            this.destroyEnemy(enemy);
          }
          break;
        }
      }
    }
    
    // 玩家 vs 敌弹
    if (!this.player.invincible) {
      for (const bullet of this.enemyBullets) {
        if (!bullet.active) continue;
        
        const dx = bullet.x - this.player.x;
        const dy = bullet.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
          bullet.active = false;
          this.playerHit();
          break;
        }
      }
    }
    
    // 玩家 vs 敌人
    if (!this.player.invincible) {
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (enemy.width + 10) / 2) {
          enemy.takeDamage(10);
          this.spawnExplosion(enemy.x, enemy.y, 'medium');
          this.playerHit();
          break;
        }
      }
    }
    
    // 玩家 vs 道具
    for (const item of this.items) {
      if (!item.active) continue;
      
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 16) {
        item.active = false;
        this.collectItem(item);
      }
    }
  }
  
  /**
   * 玩家受伤
   */
  private playerHit(): void {
    if (!this.player) return;
    
    if (this.player.hit()) {
      this.spawnExplosion(this.player.x, this.player.y, 'large');
      this.items.push(new ItemFairy(this.player.x, this.player.y));
    } else {
      this.spawnExplosion(this.player.x, this.player.y, 'large');
    }
    
    // 同步状态到 store
    useGameStore.getState().updatePlayerStats({
      lives: this.player.lives,
      mainPower: this.player.mainPower,
      subPower: this.player.subPower,
      invincible: this.player.invincible,
    });
  }
  
  /**
   * 摧毁敌人
   */
  private destroyEnemy(enemy: Enemy): void {
    enemy.active = false;
    
    const size = this.getExplosionSize(enemy.enemyType);
    this.spawnExplosion(enemy.x, enemy.y, size);
    this.spawnItem(enemy.x, enemy.y, enemy.enemyType);
    this.addScore(enemy.scoreValue, enemy.x, enemy.y);
  }
  
  /**
   * 收集道具
   */
  private collectItem(item: Item): void {
    if (!this.player) return;
    
    // 应用道具效果
    if (item instanceof ItemRed) {
      this.player.setWeapon(WeaponType.VULCAN);
    } else if (item instanceof ItemBlue) {
      // 这里可以添加 Laser 武器类型
    } else if (item instanceof ItemM) {
      this.player.setSubWeapon(item.itemType as any);
    } else if (item instanceof ItemH) {
      this.player.setSubWeapon(item.itemType as any);
    } else if (item instanceof ItemP) {
      item.apply(this.player);
    } else if (item instanceof ItemB) {
      this.player.addBomb();
    } else if (item instanceof Item1UP) {
      this.player.addLife();
    } else if (item instanceof ItemMedal) {
      const value = this.player.addMedal();
      this.effects.push(new ScorePopup(item.x, item.y, value));
    } else if (item instanceof ItemMiclus) {
      item.apply(this.player);
      this.effects.push(new ScorePopup(item.x, item.y, GAME_CONFIG.SCORE_MICLUS));
    } else if (item instanceof ItemFairy) {
      item.apply(this.player);
      this.effects.push(new ScorePopup(item.x, item.y, GAME_CONFIG.SCORE_FAIRY));
    }
    
    // 同步状态到 store
    useGameStore.getState().updatePlayerStats({
      mainPower: this.player.mainPower,
      subPower: this.player.subPower,
      bombs: this.player.bombs,
      lives: this.player.lives,
      score: this.player.score,
    });
  }
  
  /**
   * 生成爆炸
   */
  private spawnExplosion(x: number, y: number, size: 'small' | 'medium' | 'large' | 'boss'): void {
    this.explosions.push(new Explosion(x, y, size));
  }
  
  /**
   * 生成道具
   */
  private spawnItem(x: number, y: number, enemyType: string): void {
    const item = ItemFactory.createForEnemy(x, y, enemyType);
    if (item) {
      this.items.push(item);
    }
  }
  
  /**
   * 增加分数
   */
  private addScore(points: number, x?: number, y?: number): void {
    if (!this.player) return;
    
    this.player.addScore(points);
    
    if (x !== undefined && y !== undefined) {
      this.effects.push(new ScorePopup(x, y, points));
    }
  }
  
  /**
   * 获取爆炸尺寸
   */
  private getExplosionSize(enemyType: string): 'small' | 'medium' | 'large' | 'boss' {
    if (enemyType.startsWith('boss')) return 'boss';
    if (enemyType.includes('gunship') || enemyType.includes('destroyer')) return 'large';
    if (enemyType.includes('bomber')) return 'medium';
    return 'small';
  }
  
  /**
   * 清理实体
   */
  private cleanupEntities(): void {
    this.playerBulletsMain = this.playerBulletsMain.filter(b => b.active);
    this.playerBulletsSub = this.playerBulletsSub.filter(b => b.active);
    this.enemyBullets = this.enemyBullets.filter(b => b.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.items = this.items.filter(i => i.active);
    this.explosions = this.explosions.filter(e => e.active);
    this.bombEffects = this.bombEffects.filter(e => e.active);
  }
  
  /**
   * 更新UI
   */
  private updateUI(): void {
    const { scoreEl, hiscoreEl, powerEl, bombsEl, livesEl, finalScoreEl, highScoreEl } = this.uiElements;
    const store = useGameStore.getState();
    const player = store.player;
    
    // 更新 HUD
    scoreEl.textContent = (player?.score ?? 0).toString();
    hiscoreEl.textContent = store.highScore.toString();
    powerEl.textContent = (player?.mainPower ?? 0).toString();
    bombsEl.textContent = (player?.bombs ?? 0).toString();
    livesEl.textContent = (player?.lives ?? 0).toString();
    
    // 更新游戏结束画面
    if (store.gameState === GameState.GAME_OVER) {
      finalScoreEl.textContent = `SCORE: ${player?.score ?? 0}`;
      highScoreEl.textContent = `HI-SCORE: ${store.highScore}`;
    }
  }
  
  /**
   * 渲染
   */
  private render(): void {
    // 渲染背景
    this.background.render();
    
    const state = useGameStore.getState().gameState;
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
      // 渲染道具
      for (const item of this.items) {
        item.render(this.ctx);
      }
      
      // 渲染玩家子弹
      for (const bullet of this.playerBulletsMain) {
        bullet.render(this.ctx);
      }
      for (const bullet of this.playerBulletsSub) {
        bullet.render(this.ctx);
      }
      
      // 渲染敌人
      for (const enemy of this.enemies) {
        enemy.render(this.ctx);
      }
      
      // 渲染敌弹
      for (const bullet of this.enemyBullets) {
        bullet.render(this.ctx);
      }
      
      // 渲染玩家
      this.player?.render(this.ctx);
      
      // 只在设置中启用时显示 hitbox
      if (useGameStore.getState().showHitbox) {
        this.player?.renderHitbox(this.ctx);
      }
      
      // 渲染爆炸
      for (const explosion of this.explosions) {
        explosion.render(this.ctx);
      }
      
      // 渲染炸弹效果
      for (const effect of this.bombEffects) {
        effect.render(this.ctx);
      }
      
      // 渲染其他效果
      for (const effect of this.effects) {
        effect.render(this.ctx);
      }
    }
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    // 取消 store 订阅
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    
    // 清理输入管理器
    this.input.dispose();
  }
}
