import { Entity } from './Entity';
import { PlayerBulletMain, PlayerBulletSub, BulletType } from './Bullet';
import { 
  GAME_CONFIG, 
  PALETTE, 
  EntityType,
  WeaponType,
  SubWeaponType,
  Vector2 
} from '../constants';

/**
 * 玩家战机 - 完全还原原版雷电
 * 原版特征:
 * - 蓝青色机身
 * - 两种主武器: Vulcan(红/散弹) 和 Laser(蓝/激光)
 * - 两种副武器: Missile(M/直线) 和 Homing(H/追踪)
 * - 按住射击键减速移动
 * - 碰撞检测极小的hitbox
 */
export class Player extends Entity {
  // 武器系统
  public mainWeapon: WeaponType = WeaponType.VULCAN;  // 默认散弹
  public subWeapon: SubWeaponType = SubWeaponType.NONE;
  
  // 火力等级 (0-7, 原版雷电最高7级)
  public mainPower: number = 0;
  public subPower: number = 0;
  
  // 资源
  public bombs: number = 3;
  public lives: number = 2;
  public score: number = 0;
  public medals: number = 0;  // 收集的勋章数
  
  // 状态
  public invincible: boolean = false;
  public invincibleTimer: number = 0;
  public isFiring: boolean = false;
  
  // 动画
  private bankAngle: number = 0;      // 倾斜角度
  private engineFrame: number = 0;
  private shootTimer: number = 0;
  private subWeaponTimer: number = 0;
  
  // 精灵资源引用
  private spriteFrame: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 16, 16, EntityType.PLAYER); // hitbox 16x16
    this.hp = 1;
  }
  
  /**
   * 更新玩家状态
   */
  update(movement: Vector2, isShooting: boolean): { main: PlayerBulletMain[], sub: PlayerBulletSub[] } {
    const bullets = { main: [] as PlayerBulletMain[], sub: [] as PlayerBulletSub[] };
    
    this.isFiring = isShooting;
    
    // 移动速度计算 (按住射击键减速)
    const speed = isShooting ? GAME_CONFIG.PLAYER_SPEED_SLOW : GAME_CONFIG.PLAYER_SPEED_NORMAL;
    this.x += movement.x * speed;
    this.y += movement.y * speed;
    
    // 限制在屏幕内 (原版有边距)
    const margin = 8;
    this.x = Math.max(margin, Math.min(GAME_CONFIG.WIDTH - margin, this.x));
    this.y = Math.max(margin, Math.min(GAME_CONFIG.HEIGHT - margin, this.y));
    
    // 倾斜动画 (根据水平移动)
    this.bankAngle = movement.x * 0.2;
    
    // 射击
    if (isShooting) {
      this.shootTimer++;
      this.subWeaponTimer++;
      
      // 主武器射击间隔
      const fireInterval = 4; // 原版约15发/秒
      if (this.shootTimer >= fireInterval) {
        this.shootTimer = 0;
        bullets.main.push(...this.fireMainWeapon());
      }
      
      // 副武器射击间隔
      const subInterval = 12;
      if (this.subWeapon !== SubWeaponType.NONE && this.subWeaponTimer >= subInterval) {
        this.subWeaponTimer = 0;
        bullets.sub.push(...this.fireSubWeapon());
      }
    } else {
      this.shootTimer = 999; // 松开立即可以射击
    }
    
    // 无敌时间
    if (this.invincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
    
    // 动画帧
    this.engineFrame++;
    this.spriteFrame++;
    
    return bullets;
  }
  
  /**
   * 发射主武器
   * 原版雷电火力等级 0-7
   */
  private fireMainWeapon(): PlayerBulletMain[] {
    const bullets: PlayerBulletMain[] = [];
    const power = this.mainPower;
    
    if (this.mainWeapon === WeaponType.VULCAN) {
      // ========== Vulcan (散弹) ==========
      // 根据火力等级决定弹数和角度
      const configs: { [key: number]: { count: number; spread: number } } = {
        0: { count: 1, spread: 0 },
        1: { count: 2, spread: 0.15 },
        2: { count: 2, spread: 0.25 },
        3: { count: 3, spread: 0.2 },
        4: { count: 3, spread: 0.3 },
        5: { count: 4, spread: 0.25 },
        6: { count: 5, spread: 0.3 },
        7: { count: 7, spread: 0.35 },
      };
      
      const config = configs[Math.min(power, 7)];
      const startAngle = -config.spread / 2;
      const step = config.count > 1 ? config.spread / (config.count - 1) : 0;
      
      for (let i = 0; i < config.count; i++) {
        const angle = startAngle + step * i;
        bullets.push(new PlayerBulletMain(
          this.x + (i - config.count / 2 + 0.5) * 6,
          this.y - 12,
          angle,
          BulletType.VULCAN
        ));
      }
    } else {
      // ========== Laser (激光) ==========
      // 激光是一条连续的光束，这里用密集子弹模拟
      const beamCount = Math.min(power + 1, 4); // 1-4条光束
      
      for (let i = 0; i < beamCount; i++) {
        const offsetX = (i - (beamCount - 1) / 2) * 8;
        bullets.push(new PlayerBulletMain(
          this.x + offsetX,
          this.y - 16,
          0,
          BulletType.LASER,
          power >= 4 ? 2 : 1 // 高级激光伤害更高
        ));
      }
    }
    
    return bullets;
  }
  
  /**
   * 发射副武器
   */
  private fireSubWeapon(): PlayerBulletSub[] {
    const bullets: PlayerBulletSub[] = [];
    const power = this.subPower;
    
    if (this.subWeapon === SubWeaponType.MISSILE) {
      // ========== Missile (导弹) ==========
      // 向前方发射的火箭
      const missileCount = Math.min(power + 2, 4); // 2-4发
      
      for (let i = 0; i < missileCount; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const offsetX = side * (12 + Math.floor(i / 2) * 4);
        const offsetY = 8 + Math.floor(i / 2) * 4;
        
        bullets.push(new PlayerBulletSub(
          this.x + offsetX,
          this.y + offsetY,
          BulletType.MISSILE
        ));
      }
    } else if (this.subWeapon === SubWeaponType.HOMING) {
      // ========== Homing (追踪导弹) ==========
      // 追踪最近敌人的导弹
      const homingCount = Math.min(power + 2, 4);
      
      for (let i = 0; i < homingCount; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const offsetX = side * (10 + Math.floor(i / 2) * 6);
        
        bullets.push(new PlayerBulletSub(
          this.x + offsetX,
          this.y + 4,
          BulletType.HOMING
        ));
      }
    }
    
    return bullets;
  }
  
  /**
   * 使用炸弹
   */
  useBomb(): boolean {
    if (this.bombs > 0) {
      this.bombs--;
      this.invincible = true;
      this.invincibleTimer = 60; // 1秒无敌
      return true;
    }
    return false;
  }
  
  /**
   * 玩家受伤
   */
  hit(): boolean {
    if (this.invincible || !this.active) return false;
    
    this.lives--;
    
    // 火力降级 (原版只降一级)
    this.mainPower = Math.max(0, this.mainPower - 1);
    this.subPower = Math.max(0, this.subPower - 1);
    
    // 死亡后生成精灵道具
    // (精灵会在玩家死亡位置出现，帮助恢复)
    
    if (this.lives < 0) {
      this.active = false;
      return true; // 游戏结束
    }
    
    // 重置无敌
    this.invincible = true;
    this.invincibleTimer = GAME_CONFIG.PLAYER_INVINCIBLE_TIME;
    
    return false;
  }
  
  /**
   * 切换/升级武器
   */
  setWeapon(type: WeaponType): void {
    if (this.mainWeapon === type) {
      // 相同武器，升级
      this.mainPower = Math.min(7, this.mainPower + 1);
    } else {
      // 切换武器，保留等级
      this.mainWeapon = type;
      this.mainPower = Math.min(7, this.mainPower + 1);
    }
  }
  
  /**
   * 设置副武器
   */
  setSubWeapon(type: SubWeaponType): void {
    if (this.subWeapon === type) {
      this.subPower = Math.min(4, this.subPower + 1);
    } else {
      this.subWeapon = type;
      this.subPower = Math.min(4, this.subPower + 1);
    }
  }
  
  /**
   * 增加炸弹
   */
  addBomb(): void {
    this.bombs = Math.min(7, this.bombs + 1);
  }
  
  /**
   * 增加生命
   */
  addLife(): void {
    this.lives = Math.min(5, this.lives + 1);
  }
  
  /**
   * 收集勋章
   */
  addMedal(): number {
    this.medals++;
    // 勋章收集越多，单个价值越高
    // 原版: 第1个500, 之后每个翻倍直到10000
    const value = Math.min(500 * this.medals, 10000);
    this.addScore(value);
    return value;
  }
  
  /**
   * 重置勋章计数
   */
  resetMedals(): void {
    this.medals = 0;
  }
  
  /**
   * 增加分数
   */
  addScore(points: number): void {
    // 每10000分加命
    const oldScore = this.score;
    this.score += points;
    
    if (Math.floor(this.score / 100000) > Math.floor(oldScore / 100000)) {
      this.addLife();
    }
  }
  
  /**
   * 渲染玩家战机
   * 完全还原原版像素画风格
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    
    // 无敌时闪烁
    if (this.invincible && Math.floor(this.invincibleTimer / 3) % 2 === 0) {
      return;
    }
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bankAngle);
    
    // 绘制原版雷电战机
    this.renderSprite(ctx);
    
    ctx.restore();
  }
  
  /**
   * 像素画精灵
   */
  private renderSprite(ctx: CanvasRenderingContext2D): void {
    // 原版雷电战机是一个青色尖头战机
    // 使用像素画方式绘制
    
    // 引擎喷射动画
    const flameSize = 2 + Math.sin(this.engineFrame * 0.5) * 1;
    
    // 引擎火焰
    ctx.fillStyle = PALETTE.PLAYER_ENGINE;
    ctx.fillRect(-2, 10, 4, flameSize);
    ctx.fillStyle = '#0088ff';
    ctx.fillRect(-1, 10, 2, flameSize * 0.7);
    
    // 主机身 (青色)
    ctx.fillStyle = PALETTE.PLAYER_BODY;
    
    // 尖头机身
    const bodyPixels = [
      [0, -14],           // 尖端
      [-2, -10], [2, -10],
      [-4, -6], [4, -6],
      [-6, -2], [6, -2],
      [-6, 2], [6, 2],
      [-4, 6], [4, 6],
      [-2, 10], [2, 10],
    ];
    
    for (const [px, py] of bodyPixels) {
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    
    // 驾驶舱 (白色)
    ctx.fillStyle = PALETTE.PLAYER_COCKPIT;
    ctx.fillRect(-2, -4, 4, 6);
    
    // 机翼 (深蓝色)
    ctx.fillStyle = PALETTE.PLAYER_WING;
    ctx.fillRect(-10, 0, 4, 8);
    ctx.fillRect(6, 0, 4, 8);
    
    // 武器挂点
    ctx.fillStyle = '#666';
    ctx.fillRect(-8, 4, 2, 4);
    ctx.fillRect(6, 4, 2, 4);
  }
  
  /**
   * 渲染 hitbox (精确碰撞点)
   */
  renderHitbox(ctx: CanvasRenderingContext2D): void {
    if (!this.active || this.invincible) return;
    
    // 原版雷电的hitbox是极小的中心点
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
    
    // 外围白圈 (帮助玩家判断)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  /**
   * 渲染武器指示器
   */
  renderWeaponHUD(ctx: CanvasRenderingContext2D): void {
    const x = GAME_CONFIG.WIDTH - 50;
    const y = 8;
    
    // 主武器图标
    ctx.fillStyle = this.mainWeapon === WeaponType.VULCAN ? '#ff4444' : '#4444ff';
    ctx.fillRect(x, y, 16, 8);
    
    // 火力等级
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i <= this.mainPower; i++) {
      ctx.fillRect(x + i * 3, y + 10, 2, 3);
    }
    
    // 副武器
    if (this.subWeapon !== SubWeaponType.NONE) {
      ctx.fillStyle = this.subWeapon === SubWeaponType.MISSILE ? '#00ff00' : '#ff8800';
      ctx.fillRect(x, y + 16, 16, 8);
    }
  }
}
