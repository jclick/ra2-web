import { Player } from './entities/Player';
import { Entity } from './entities/Entity';
import { PlayerBulletMain, PlayerBulletSub, EnemyBullet, BulletPatternFactory } from './entities/Bullet';
import { 
  Enemy, 
  EnemyFighterRed, 
  EnemyFighterBlue, 
  EnemyFighterGreen,
  EnemyBomberBrown,
  EnemyBomberGray,
  EnemyGunship,
  EnemyTankSmall,
  Boss1,
  EnemyFactory
} from './entities/Enemy';
import { 
  Item, 
  ItemRed, 
  ItemBlue, 
  ItemM, 
  ItemH, 
  ItemP, 
  ItemB, 
  Item1UP,
  ItemMedal,
  ItemMiclus,
  ItemFairy,
  ItemFactory
} from './entities/Item';
import { Explosion, BombEffect, ScorePopup, WarningEffect } from './entities/Effect';
import { InputManager } from './systems/InputManager';
import { BackgroundRenderer } from './systems/BackgroundRenderer';
import { 
  GAME_CONFIG, 
  GameState, 
  EntityType,
  WeaponType,
  STAGE_THEMES,
  PALETTE
} from './constants';

/**
 * 游戏主类 - 完整还原原版雷电
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private background: BackgroundRenderer;
  private input: InputManager;
  
  // 游戏状态
  private state: GameState = GameState.MENU;
  private frame: number = 0;
  private score: number = 0;
  private highScore: number = 0;
  private stage: number = 1;
  private stageProgress: number = 0;
  private bossSpawned: boolean = false;
  
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
  
  // 生成控制
  private spawnTimer: number = 0;
  private waveNumber: number = 0;
  
  // UI元素
  private uiElements: {
    startScreen: HTMLElement;
    gameOverScreen: HTMLElement;
    pauseScreen: HTMLElement;
    hud: HTMLElement;
    scoreEl: HTMLElement;
    hiscoreEl: HTMLElement;
    powerEl: HTMLElement;
    bombsEl: HTMLElement;
    livesEl: HTMLElement;
  };
  
  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = canvas;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    
    this.background = new BackgroundRenderer(canvas);
    this.input = new InputManager();
    
    // 初始化UI
    this.uiElements = this.initUI();
    
    // 绑定事件
    this.bindEvents();
    
    // 加载高分
    this.loadHighScore();
    
    // 启动游戏循环
    this.gameLoop();
  }
  
  private initUI() {
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
    };
  }
  
  private bindEvents(): void {
    const { startScreen, gameOverScreen, pauseScreen } = this.uiElements;
    
    document.getElementById('start-btn')?.addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn')?.addEventListener('click', () => this.startGame());
    document.getElementById('resume-btn')?.addEventListener('click', () => this.resumeGame());
    
    // 键盘快捷键
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.state === GameState.MENU) {
        this.startGame();
      }
    });
  }
  
  private loadHighScore(): void {
    const saved = localStorage.getItem('raiden-hiscore');
    if (saved) {
      this.highScore = parseInt(saved);
      this.uiElements.hiscoreEl.textContent = this.highScore.toString();
    }
  }
  
  /**
   * 开始游戏
   */
  private startGame(): void {
    this.state = GameState.PLAYING;
    this.frame = 0;
    this.score = 0;
    this.stage = 1;
    this.stageProgress = 0;
    this.bossSpawned = false;
    this.waveNumber = 0;
    this.spawnTimer = 0;
    
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
    
    // 更新UI
    this.updateUI();
    this.uiElements.startScreen.classList.add('hidden');
    this.uiElements.gameOverScreen.classList.add('hidden');
    this.uiElements.hud.classList.remove('hidden');
    
    // BOSS警告
    setTimeout(() => {
      this.effects.push(new WarningEffect());
    }, 1000);
  }
  
  /**
   * 暂停游戏
   */
  private pauseGame(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.uiElements.pauseScreen.classList.remove('hidden');
    }
  }
  
  /**
   * 继续游戏
   */
  private resumeGame(): void {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.uiElements.pauseScreen.classList.add('hidden');
    }
  }
  
  /**
   * 游戏结束
   */
  private gameOver(): void {
    this.state = GameState.GAME_OVER;
    
    // 保存高分
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('raiden-hiscore', this.highScore.toString());
      this.uiElements.hiscoreEl.textContent = this.highScore.toString();
    }
    
    // 更新UI
    const finalScoreEl = document.getElementById('final-score')!;
    const highScoreEl = document.getElementById('high-score')!;
    finalScoreEl.textContent = `SCORE: ${this.score}`;
    highScoreEl.textContent = `HI-SCORE: ${this.highScore}`;
    
    this.uiElements.gameOverScreen.classList.remove('hidden');
    this.uiElements.hud.classList.add('hidden');
  }
  
  /**
   * 主游戏循环
   */
  private gameLoop(): void {
    // 处理输入
    this.handleInput();
    
    // 更新
    if (this.state === GameState.PLAYING) {
      this.update();
    }
    
    // 渲染
    this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  /**
   * 处理输入
   */
  private handleInput(): void {
    // 暂停
    if (this.input.isPausePressed()) {
      if (this.state === GameState.PLAYING) {
        this.pauseGame();
      } else if (this.state === GameState.PAUSED) {
        this.resumeGame();
      }
    }
    
    // 炸弹
    if (this.input.isBombPressed() && this.state === GameState.PLAYING) {
      this.useBomb();
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
      
      this.updateUI();
    }
  }
  
  /**
   * 游戏更新
   */
  private update(): void {
    this.frame++;
    this.stageProgress++;
    
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
    
    // 更新UI
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
        this.gameOver();
      }
      return;
    }
    
    const movement = this.input.getMovement();
    const isShooting = this.input.isShooting();
    
    const bullets = this.player.update(movement, isShooting);
    this.playerBulletsMain.push(...bullets.main);
    this.playerBulletsSub.push(...bullets.sub);
    
    // 同步分数
    if (this.player.score !== this.score) {
      this.score = this.player.score;
    }
  }
  
  /**
   * 生成敌人
   */
  private spawnEnemies(): void {
    this.spawnTimer++;
    
    const spawnRate = Math.max(40, 80 - this.stage * 5);
    
    // BOSS战
    if (this.stageProgress > 2000 && !this.bossSpawned) {
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
        
        // 精确碰撞检测
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
      
      // 生成精灵道具
      this.items.push(new ItemFairy(this.player.x, this.player.y));
    } else {
      this.spawnExplosion(this.player.x, this.player.y, 'large');
    }
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
      this.player.setWeapon(WeaponType.LASER);
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
    this.score += points;
    if (this.player) {
      this.player.addScore(points);
    }
    
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
    const { scoreEl, powerEl, bombsEl, livesEl } = this.uiElements;
    
    scoreEl.textContent = this.score.toString();
    powerEl.textContent = (this.player?.mainPower ?? 0).toString();
    bombsEl.textContent = (this.player?.bombs ?? 0).toString();
    livesEl.textContent = (this.player?.lives ?? 0).toString();
  }
  
  /**
   * 渲染
   */
  private render(): void {
    // 渲染背景
    this.background.render();
    
    if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
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
      this.player?.renderHitbox(this.ctx);
      
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
}