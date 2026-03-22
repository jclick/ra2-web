import { 
  GAME_CONFIG, 
  EntityType, 
  Bounds
} from '../constants';

/**
 * 基础实体类
 */
export abstract class Entity {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public vx: number = 0;
  public vy: number = 0;
  public active: boolean = true;
  public type: EntityType;
  public hp: number = 1;
  public maxHp: number = 1;
  
  constructor(x: number, y: number, width: number, height: number, type: EntityType) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
  }
  
  /**
   * 获取边界框 (用于碰撞检测)
   */
  getBounds(): Bounds {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }
  
  /**
   * 检查碰撞
   */
  collidesWith(other: Entity): boolean {
    const a = this.getBounds();
    const b = other.getBounds();
    
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }
  
  /**
   * 受到伤害
   */
  takeDamage(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.active = false;
      return true; // 被摧毁
    }
    return false;
  }
  
  /**
   * 更新实体
   */
  abstract update(...args: any[]): any;
  
  /**
   * 渲染实体
   */
  abstract render(ctx: CanvasRenderingContext2D): void;
  
  /**
   * 检查是否超出屏幕
   */
  isOffScreen(): boolean {
    return this.y < -50 || this.y > GAME_CONFIG.HEIGHT + 50 ||
           this.x < -50 || this.x > GAME_CONFIG.WIDTH + 50;
  }
}