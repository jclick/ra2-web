import { Entity } from './Entity';
import { EnemyBullet, BulletPatternFactory, EnemyBulletType } from './Bullet';
import { 
  GAME_CONFIG, 
  PALETTE, 
  EntityType, 
  EnemyType, 
  MovePattern,
} from '../constants';

/**
 * 敌人基类
 */
export abstract class Enemy extends Entity {
  public enemyType: EnemyType;
  public movePattern: MovePattern;
  public scoreValue: number;
  public isGroundUnit: boolean = false;
  
  protected shootTimer: number = 0;
  protected shootInterval: number;
  protected moveTimer: number = 0;
  protected initialX: number;
  protected initialY: number;
  protected phase: number = 0;  // 用于多阶段行为
  
  constructor(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    enemyType: EnemyType,
    movePattern: MovePattern = MovePattern.STRAIGHT_DOWN
  ) {
    super(x, y, width, height, EntityType.ENEMY_AIR);
    this.enemyType = enemyType;
    this.movePattern = movePattern;
    this.initialX = x;
    this.initialY = y;
    this.shootInterval = 60;
    this.scoreValue = 100;
  }
  
  /**
   * 更新移动
   */
  protected updateMovement(): void {
    this.moveTimer++;
    
    switch (this.movePattern) {
      case MovePattern.STRAIGHT_DOWN:
        this.y += this.vy;
        this.x += this.vx;
        break;
        
      case MovePattern.STRAIGHT_UP:
        this.y -= this.vy;
        break;
        
      case MovePattern.SINE_WAVE:
        this.y += this.vy;
        this.x = this.initialX + Math.sin(this.moveTimer * 0.03) * 50;
        break;
        
      case MovePattern.ZIGZAG:
        this.y += this.vy;
        this.x += this.vx;
        if (this.moveTimer % 80 === 0) {
          this.vx = -this.vx;
        }
        break;
        
      case MovePattern.CIRCLE:
        const radius = 40;
        const speed = 0.02;
        this.x = this.initialX + Math.cos(this.moveTimer * speed) * radius;
        this.y = this.initialY + Math.sin(this.moveTimer * speed) * radius + this.moveTimer * 0.3;
        break;
        
      case MovePattern.HOVER:
        // 悬停移动
        this.x = this.initialX + Math.sin(this.moveTimer * 0.02) * 30;
        break;
    }
    
    if (this.isOffScreen()) {
      this.active = false;
    }
  }
  
  /**
   * 射击 - 子类实现
   */
  abstract shoot(playerX: number, playerY: number): EnemyBullet[];
  
  update(): void {
    this.updateMovement();
    this.shootTimer++;
  }
  
  abstract render(ctx: CanvasRenderingContext2D): void;
}

// ============================================
// 小型红色战机 - 最基础的敌机
// ============================================
export class EnemyFighterRed extends Enemy {
  constructor(x: number, y: number, movePattern: MovePattern = MovePattern.STRAIGHT_DOWN) {
    super(x, y, 14, 14, EnemyType.FIGHTER_RED, movePattern);
    this.vy = 1.5 + Math.random() * 0.5;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.hp = 1;
    this.scoreValue = 100;
    this.shootInterval = 100 + Math.random() * 50;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      // 单发红色子弹，瞄准玩家
      return [BulletPatternFactory.createAimed(
        this.x, this.y + 6, playerX, playerY, 
        GAME_CONFIG.BULLET_SPEED_ENEMY_NORMAL,
        EnemyBulletType.SMALL_RED
      )];
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 红色倒三角形战机
    ctx.fillStyle = PALETTE.ENEMY_RED;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(7, -7);
    ctx.lineTo(-7, -7);
    ctx.closePath();
    ctx.fill();
    
    // 引擎发光
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(-2, -5, 4, 4);
    
    ctx.restore();
  }
}

// ============================================
// 小型蓝色战机 - 快速移动
// ============================================
export class EnemyFighterBlue extends Enemy {
  constructor(x: number, y: number) {
    super(x, y, 14, 14, EnemyType.FIGHTER_BLUE, MovePattern.ZIGZAG);
    this.vy = 2;
    this.vx = 1.5;
    this.hp = 1;
    this.scoreValue = 150;
    this.shootInterval = 80;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      // 双发蓝色子弹
      return [
        new EnemyBullet(this.x - 4, this.y + 6, Math.PI / 2, 3, EnemyBulletType.SMALL_BLUE),
        new EnemyBullet(this.x + 4, this.y + 6, Math.PI / 2, 3, EnemyBulletType.SMALL_BLUE),
      ];
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 蓝色菱形战机
    ctx.fillStyle = PALETTE.ENEMY_BLUE;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#6666ff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// ============================================
// 小型绿色战机 - 正弦波移动
// ============================================
export class EnemyFighterGreen extends Enemy {
  constructor(x: number, y: number) {
    super(x, y, 14, 14, EnemyType.FIGHTER_GREEN, MovePattern.SINE_WAVE);
    this.vy = 1.5;
    this.hp = 2;
    this.scoreValue = 200;
    this.shootInterval = 90;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      // 三向散射
      return BulletPatternFactory.createFan(
        this.x, this.y + 6, 3, Math.PI / 4, Math.PI / 2, 
        GAME_CONFIG.BULLET_SPEED_ENEMY_NORMAL,
        EnemyBulletType.SMALL_RED
      );
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 绿色箭头形
    ctx.fillStyle = PALETTE.ENEMY_GREEN;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(6, -2);
    ctx.lineTo(4, -7);
    ctx.lineTo(-4, -7);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}

// ============================================
// 棕色轰炸机 - 中型敌机
// ============================================
export class EnemyBomberBrown extends Enemy {
  constructor(x: number, y: number) {
    super(x, y, 28, 24, EnemyType.BOMBER_BROWN, MovePattern.STRAIGHT_DOWN);
    this.vy = 0.8;
    this.hp = 8;
    this.scoreValue = 500;
    this.shootInterval = 120;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      // 五向散射
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      return BulletPatternFactory.createFan(
        this.x, this.y + 10, 5, Math.PI / 3, angle, 
        GAME_CONFIG.BULLET_SPEED_ENEMY_SLOW,
        EnemyBulletType.MEDIUM_PINK
      );
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 棕色宽体轰炸机
    ctx.fillStyle = PALETTE.ENEMY_BROWN;
    ctx.fillRect(-14, -10, 28, 20);
    
    // 机翼
    ctx.fillRect(-20, -4, 6, 12);
    ctx.fillRect(14, -4, 6, 12);
    
    // 驾驶舱
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(-4, -8, 8, 6);
    
    ctx.restore();
  }
}

// ============================================
// 灰色轰炸机 - 圆形弹幕
// ============================================
export class EnemyBomberGray extends Enemy {
  constructor(x: number, y: number) {
    super(x, y, 30, 26, EnemyType.BOMBER_GRAY, MovePattern.CIRCLE);
    this.vy = 0.6;
    this.hp = 12;
    this.scoreValue = 800;
    this.shootInterval = 100;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      // 环形弹幕
      return BulletPatternFactory.createCircle(
        this.x, this.y, 12, 
        GAME_CONFIG.BULLET_SPEED_ENEMY_SLOW,
        EnemyBulletType.MEDIUM_PINK
      );
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 灰色圆形主体
    ctx.fillStyle = PALETTE.ENEMY_GRAY;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 十字机翼
    ctx.fillRect(-16, -3, 32, 6);
    ctx.fillRect(-3, -12, 6, 24);
    
    // 核心红点
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// ============================================
// 武装直升机 - 大型敌机
// ============================================
export class EnemyGunship extends Enemy {
  private rotorAngle: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 40, 36, EnemyType.GUNSHIP, MovePattern.HOVER);
    this.hp = 20;
    this.scoreValue = 1500;
    this.shootInterval = 40;
  }
  
  update(): void {
    super.update();
    this.rotorAngle += 0.3;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      // 连续3发
      const bullets: EnemyBullet[] = [];
      for (let i = 0; i < 3; i++) {
        bullets.push(BulletPatternFactory.createAimed(
          this.x, this.y + 15,
          playerX, playerY + i * 20,
          GAME_CONFIG.BULLET_SPEED_ENEMY_FAST,
          EnemyBulletType.RING
        ));
      }
      return bullets;
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 机身
    ctx.fillStyle = '#444';
    ctx.fillRect(-18, -12, 36, 24);
    
    // 旋翼
    ctx.save();
    ctx.rotate(this.rotorAngle);
    ctx.fillStyle = '#666';
    ctx.fillRect(-25, -2, 50, 4);
    ctx.fillRect(-2, -25, 4, 50);
    ctx.restore();
    
    // 尾翼
    ctx.fillStyle = '#333';
    ctx.fillRect(-4, 12, 8, 15);
    
    // 武器
    ctx.fillStyle = '#222';
    ctx.fillRect(-12, 8, 6, 10);
    ctx.fillRect(6, 8, 6, 10);
    
    ctx.restore();
  }
}

// ============================================
// 地面坦克 - 小型
// ============================================
export class EnemyTankSmall extends Enemy {
  constructor(x: number, y: number) {
    super(x, y, 20, 16, EnemyType.TANK_SMALL, MovePattern.STRAIGHT_UP);
    this.type = EntityType.ENEMY_GROUND;
    this.isGroundUnit = true;
    this.vy = 1;
    this.hp = 3;
    this.scoreValue = 300;
    this.shootInterval = 100;
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      return [BulletPatternFactory.createAimed(
        this.x, this.y - 8, playerX, playerY, 
        GAME_CONFIG.BULLET_SPEED_ENEMY_NORMAL,
        EnemyBulletType.SMALL_RED
      )];
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 履带
    ctx.fillStyle = '#444';
    ctx.fillRect(-10, -6, 20, 12);
    
    // 炮塔
    ctx.fillStyle = '#555';
    ctx.fillRect(-6, -10, 12, 8);
    
    // 炮管
    ctx.fillStyle = '#333';
    ctx.fillRect(-2, -18, 4, 10);
    
    ctx.restore();
  }
}

// ============================================
// 第1关 BOSS - 大型轰炸机
// ============================================
export class Boss1 extends Enemy {
  public maxHp: number = 100;
  private turretAngle: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 64, 56, EnemyType.BOSS_1, MovePattern.HOVER);
    this.hp = 100;
    this.maxHp = 100;
    this.scoreValue = GAME_CONFIG.SCORE_BOSS;
    this.shootInterval = 30;
    this.y = 60; // 初始位置在屏幕上方
  }
  
  update(): void {
    super.update();
    this.turretAngle += 0.05;
    
    // BOSS缓慢下移后悬停
    if (this.y < 80) {
      this.y += 0.3;
    }
    
    // 根据血量切换阶段
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent < 0.4) {
      this.shootInterval = 20; // 狂暴模式
    } else if (hpPercent < 0.7) {
      this.shootInterval = 25;
    }
  }
  
  shoot(playerX: number, playerY: number): EnemyBullet[] {
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      const bullets: EnemyBullet[] = [];
      
      // 主炮瞄准
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      bullets.push(...BulletPatternFactory.createFan(
        this.x, this.y + 25, 3, Math.PI / 4, angle, 
        GAME_CONFIG.BULLET_SPEED_ENEMY_NORMAL,
        EnemyBulletType.LARGE_ORANGE
      ));
      
      // 侧面炮塔环形
      if (this.moveTimer % 60 === 0) {
        bullets.push(...BulletPatternFactory.createCircle(
          this.x - 25, this.y, 8, 
          GAME_CONFIG.BULLET_SPEED_ENEMY_SLOW,
          EnemyBulletType.SMALL_RED
        ));
        bullets.push(...BulletPatternFactory.createCircle(
          this.x + 25, this.y, 8, 
          GAME_CONFIG.BULLET_SPEED_ENEMY_SLOW,
          EnemyBulletType.SMALL_BLUE
        ));
      }
      
      return bullets;
    }
    return [];
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 主机身
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-32, -28, 64, 56);
    
    // 装甲细节
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(-28, -24, 56, 48);
    
    // 主炮
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-8, 20, 16, 20);
    
    // 侧面引擎
    ctx.fillStyle = '#333';
    ctx.fillRect(-40, -10, 8, 20);
    ctx.fillRect(32, -10, 8, 20);
    
    // 旋转炮塔
    ctx.save();
    ctx.rotate(this.turretAngle);
    ctx.fillStyle = '#555';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // HP条
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = '#000';
    ctx.fillRect(-30, -36, 60, 4);
    ctx.fillStyle = hpPercent > 0.3 ? '#ff0000' : '#ffff00';
    ctx.fillRect(-30, -36, 60 * hpPercent, 4);
    
    ctx.restore();
  }
}

// ============================================
// 敌人工厂 - 创建敌人
// ============================================
export class EnemyFactory {
  /**
   * 根据波次创建敌人编队
   */
  static createFormation(
    waveType: number, 
    screenWidth: number
  ): Enemy[] {
    const enemies: Enemy[] = [];
    const wave = waveType % 10;
    
    switch (wave) {
      case 0: // 小红机直线编队
        for (let i = 0; i < 4; i++) {
          enemies.push(new EnemyFighterRed(40 + i * 50, -20 - i * 15));
        }
        break;
        
      case 1: // 小蓝机之字形
        enemies.push(new EnemyFighterBlue(60, -20));
        enemies.push(new EnemyFighterBlue(screenWidth - 60, -30));
        break;
        
      case 2: // 中绿机正弦波
        enemies.push(new EnemyFighterGreen(screenWidth / 2, -30));
        break;
        
      case 3: // 混合编队
        enemies.push(new EnemyFighterRed(50, -20, MovePattern.SINE_WAVE));
        enemies.push(new EnemyFighterRed(screenWidth - 50, -20, MovePattern.SINE_WAVE));
        setTimeout(() => {
          enemies.push(new EnemyFighterGreen(screenWidth / 2, -30));
        }, 500);
        break;
        
      case 4: // 棕色轰炸机
        enemies.push(new EnemyBomberBrown(screenWidth / 2, -40));
        break;
        
      case 5: // 灰色轰炸机 + 小红机
        enemies.push(new EnemyBomberGray(screenWidth / 2, -40));
        for (let i = 0; i < 3; i++) {
          enemies.push(new EnemyFighterRed(30 + i * 80, -20));
        }
        break;
        
      case 6: // 武装直升机
        enemies.push(new EnemyGunship(screenWidth / 2, -50));
        break;
        
      case 7: // 地面坦克
        for (let i = 0; i < 3; i++) {
          enemies.push(new EnemyTankSmall(40 + i * 70, GAME_CONFIG.HEIGHT + 20 + i * 10));
        }
        break;
        
      case 8: // 密集小红
        for (let i = 0; i < 6; i++) {
          enemies.push(new EnemyFighterRed(20 + i * 35, -20 - (i % 3) * 15));
        }
        break;
        
      case 9: // 大型编队
        for (let i = 0; i < 3; i++) {
          enemies.push(new EnemyFighterBlue(40 + i * 70, -20));
        }
        enemies.push(new EnemyBomberBrown(screenWidth / 2, -50));
        break;
    }
    
    return enemies;
  }
}
