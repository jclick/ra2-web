import { Entity } from './Entity';
import { 
  GAME_CONFIG, 
  PALETTE, 
  EntityType,
  Vector2 
} from '../constants';

/**
 * 子弹类型
 */
export enum BulletType {
  VULCAN = 'vulcan',       // 散弹
  LASER = 'laser',         // 激光
  MISSILE = 'missile',     // 导弹
  HOMING = 'homing',       // 追踪弹
}

/**
 * 敌弹类型
 */
export enum EnemyBulletType {
  SMALL_RED = 'small_red',
  SMALL_BLUE = 'small_blue',
  MEDIUM_PINK = 'medium_pink',
  LARGE_ORANGE = 'large_orange',
  RING = 'ring',
}

// ============================================
// 玩家主武器子弹
// ============================================
export class PlayerBulletMain extends Entity {
  public bulletType: BulletType;
  public power: number;
  public angle: number;
  private trail: { x: number; y: number }[] = [];
  
  constructor(x: number, y: number, angle: number = 0, type: BulletType = BulletType.VULCAN, power: number = 1) {
    super(x, y, 4, 8, EntityType.PLAYER_BULLET_MAIN);
    this.bulletType = type;
    this.angle = angle;
    this.power = power;
    
    // 根据类型设置速度
    const speed = GAME_CONFIG.BULLET_SPEED_PLAYER_MAIN;
    this.vx = Math.sin(angle) * speed * 0.3;
    this.vy = -Math.cos(angle) * speed;
  }
  
  update(): void {
    // 激光需要记录轨迹用于渲染
    if (this.bulletType === BulletType.LASER) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 8) this.trail.shift();
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.isOffScreen()) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    if (this.bulletType === BulletType.VULCAN) {
      // ========== Vulcan (散弹) ==========
      // 黄色子弹，带尾迹
      const gradient = ctx.createLinearGradient(this.x, this.y + 6, this.x, this.y - 6);
      gradient.addColorStop(0, 'rgba(255, 255, 0, 0)');
      gradient.addColorStop(0.5, PALETTE.VULCAN_BULLET);
      gradient.addColorStop(1, '#ffffff');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - 2, this.y - 8, 4, 14);
      
      // 中心高亮
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 1, this.y - 6, 2, 8);
    } else {
      // ========== Laser (激光) ==========
      // 红色激光束，长条状
      
      // 绘制尾迹
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const alpha = i / this.trail.length;
        const width = 2 + alpha * 4;
        
        ctx.fillStyle = `rgba(255, ${Math.floor(68 + alpha * 100)}, ${Math.floor(68 + alpha * 100)}, ${alpha * 0.5})`;
        ctx.fillRect(t.x - width / 2, t.y - 8, width, 16);
      }
      
      // 核心光束
      const laserGradient = ctx.createLinearGradient(this.x, this.y + 10, this.x, this.y - 20);
      laserGradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
      laserGradient.addColorStop(0.5, PALETTE.LASER_CORE);
      laserGradient.addColorStop(1, '#ffffff');
      
      ctx.fillStyle = laserGradient;
      ctx.fillRect(this.x - 3, this.y - 20, 6, 30);
      
      // 核心白光
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 1, this.y - 15, 2, 20);
    }
  }
}

// ============================================
// 玩家副武器子弹
// ============================================
export class PlayerBulletSub extends Entity {
  public bulletType: BulletType;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private smoke: { x: number; y: number; life: number }[] = [];
  private velocity: number = 6;
  private turnSpeed: number = 0.15;
  
  constructor(x: number, y: number, type: BulletType, targetX?: number, targetY?: number) {
    super(x, y, 6, 12, EntityType.PLAYER_BULLET_SUB);
    this.bulletType = type;
    this.targetX = targetX ?? null;
    this.targetY = targetY ?? null;
    
    if (type === BulletType.MISSILE) {
      this.vy = -this.velocity;
      this.vx = 0;
    } else {
      // Homing 初始向上，之后会追踪
      this.vy = -4;
      this.vx = (Math.random() - 0.5) * 2;
    }
  }
  
  update(targetEnemies?: { x: number; y: number }[]): void {
    // 烟雾尾迹
    this.smoke.push({ x: this.x, y: this.y, life: 10 });
    
    if (this.bulletType === BulletType.MISSILE) {
      // ========== Missile (直线导弹) ==========
      this.y += this.vy;
      
      // 逐渐加速
      this.vy = Math.max(-10, this.vy - 0.2);
    } else {
      // ========== Homing (追踪导弹) ==========
      if (targetEnemies && targetEnemies.length > 0) {
        // 找到最近的敌人
        let nearest = targetEnemies[0];
        let minDist = Infinity;
        
        for (const enemy of targetEnemies) {
          const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
          if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
          }
        }
        
        // 追踪目标
        const dx = nearest.x - this.x;
        const dy = nearest.y - this.y;
        const angle = Math.atan2(dy, dx);
        
        // 平滑转向
        const targetVx = Math.cos(angle) * this.velocity;
        const targetVy = Math.sin(angle) * this.velocity;
        
        this.vx += (targetVx - this.vx) * this.turnSpeed;
        this.vy += (targetVy - this.vy) * this.turnSpeed;
      }
      
      this.x += this.vx;
      this.y += this.vy;
    }
    
    // 更新烟雾
    this.smoke = this.smoke.filter(s => {
      s.life--;
      return s.life > 0;
    });
    
    if (this.isOffScreen()) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    // 绘制尾迹
    for (const s of this.smoke) {
      const alpha = s.life / 10;
      ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.5})`;
      ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    }
    
    if (this.bulletType === BulletType.MISSILE) {
      // ========== Missile (导弹) ==========
      // 绿色火箭形状
      ctx.fillStyle = PALETTE.MISSILE_BODY;
      
      // 弹体
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 6);
      ctx.lineTo(this.x + 3, this.y + 4);
      ctx.lineTo(this.x, this.y + 2);
      ctx.lineTo(this.x - 3, this.y + 4);
      ctx.closePath();
      ctx.fill();
      
      // 尾焰
      const flameSize = 4 + Math.random() * 2;
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(this.x - 2, this.y + 4, 4, flameSize);
    } else {
      // ========== Homing (追踪导弹) ==========
      // 橙色，带旋转
      ctx.fillStyle = PALETTE.HOMING_TRAIL;
      
      const angle = Math.atan2(this.vy, this.vx);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      
      // 菱形
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(0, 3);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, -3);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }
  }
}

// ============================================
// 敌人子弹
// ============================================
export class EnemyBullet extends Entity {
  public bulletType: EnemyBulletType;
  public angle: number;
  public speed: number;
  private rotation: number = 0;
  private rotationSpeed: number;
  
  constructor(
    x: number, 
    y: number, 
    angle: number, 
    speed: number, 
    type: EnemyBulletType = EnemyBulletType.SMALL_RED
  ) {
    super(x, y, 6, 6, EntityType.ENEMY_BULLET);
    this.angle = angle;
    this.speed = speed;
    this.bulletType = type;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
  
  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    
    if (this.isOffScreen()) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    switch (this.bulletType) {
      case EnemyBulletType.SMALL_RED:
        ctx.fillStyle = PALETTE.ENEMY_BULLET_RED;
        this.drawDiamond(ctx, 4);
        break;
      case EnemyBulletType.SMALL_BLUE:
        ctx.fillStyle = PALETTE.ENEMY_BULLET_BLUE;
        this.drawDiamond(ctx, 4);
        break;
      case EnemyBulletType.MEDIUM_PINK:
        ctx.fillStyle = PALETTE.ENEMY_BULLET_PINK;
        this.drawCircle(ctx, 5);
        break;
      case EnemyBulletType.LARGE_ORANGE:
        ctx.fillStyle = PALETTE.ENEMY_BULLET_ORANGE;
        this.drawCircle(ctx, 7);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case EnemyBulletType.RING:
        ctx.strokeStyle = PALETTE.ENEMY_BULLET_PINK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -2, 4, 4);
        break;
    }
    
    ctx.restore();
  }
  
  private drawDiamond(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();
    
    // 中心高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-1, -1, 2, 2);
  }
  
  private drawCircle(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================
// 弹幕工厂
// ============================================
export class BulletPatternFactory {
  /**
   * 创建圆形弹幕
   */
  static createCircle(
    x: number, 
    y: number, 
    count: number, 
    speed: number, 
    type: EnemyBulletType = EnemyBulletType.SMALL_RED
  ): EnemyBullet[] {
    const bullets: EnemyBullet[] = [];
    const angleStep = (Math.PI * 2) / count;
    
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep + Math.PI / 2;
      bullets.push(new EnemyBullet(x, y, angle, speed, type));
    }
    
    return bullets;
  }
  
  /**
   * 创建扇形弹幕
   */
  static createFan(
    x: number, 
    y: number, 
    count: number, 
    spreadAngle: number, 
    baseAngle: number, 
    speed: number,
    type: EnemyBulletType = EnemyBulletType.SMALL_RED
  ): EnemyBullet[] {
    const bullets: EnemyBullet[] = [];
    const startAngle = baseAngle - spreadAngle / 2;
    const angleStep = count > 1 ? spreadAngle / (count - 1) : 0;
    
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      bullets.push(new EnemyBullet(x, y, angle, speed, type));
    }
    
    return bullets;
  }
  
  /**
   * 创建瞄准玩家的子弹
   */
  static createAimed(
    x: number, 
    y: number, 
    targetX: number, 
    targetY: number, 
    speed: number,
    type: EnemyBulletType = EnemyBulletType.SMALL_RED
  ): EnemyBullet {
    const angle = Math.atan2(targetY - y, targetX - x);
    return new EnemyBullet(x, y, angle, speed, type);
  }
  
  /**
   * 创建螺旋弹幕
   */
  static createSpiral(
    x: number, 
    y: number, 
    count: number, 
    rotations: number, 
    speed: number,
    type: EnemyBulletType = EnemyBulletType.SMALL_RED
  ): EnemyBullet[] {
    const bullets: EnemyBullet[] = [];
    const totalAngle = Math.PI * 2 * rotations;
    
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = Math.PI / 2 + t * totalAngle;
      bullets.push(new EnemyBullet(x, y, angle, speed, type));
    }
    
    return bullets;
  }
  
  /**
   * 创建随机弹幕
   */
  static createRandom(
    x: number, 
    y: number, 
    count: number, 
    speed: number,
    type: EnemyBulletType = EnemyBulletType.SMALL_RED
  ): EnemyBullet[] {
    const bullets: EnemyBullet[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = speed * (0.8 + Math.random() * 0.4);
      bullets.push(new EnemyBullet(x, y, angle, vel, type));
    }
    
    return bullets;
  }
}
