import { GAME_CONFIG, PALETTE, STAGE_THEMES } from '../constants';

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  brightness: number;
}

interface GroundObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'tree' | 'mountain';
}

/**
 * 背景渲染器 - 还原原版雷电的滚动背景
 */
export class BackgroundRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private groundObjects: GroundObject[] = [];
  private scrollY: number = 0;
  private stageTheme = STAGE_THEMES[0];
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    
    this.initStars();
    this.initGroundObjects();
  }
  
  /**
   * 初始化星星
   */
  private initStars(): void {
    const numStars = 50;
    
    for (let i = 0; i < numStars; i++) {
      this.stars.push({
        x: Math.random() * GAME_CONFIG.WIDTH,
        y: Math.random() * GAME_CONFIG.HEIGHT,
        speed: 0.3 + Math.random() * 1.5,
        size: Math.random() < 0.7 ? 1 : 2,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
  }
  
  /**
   * 初始化地面物体
   */
  private initGroundObjects(): void {
    // 生成一些建筑物/树木作为远景
    for (let i = 0; i < 10; i++) {
      this.groundObjects.push({
        x: Math.random() * GAME_CONFIG.WIDTH,
        y: Math.random() * GAME_CONFIG.HEIGHT * 2,
        width: 20 + Math.random() * 40,
        height: 30 + Math.random() * 60,
        type: Math.random() < 0.5 ? 'building' : 'tree',
      });
    }
  }
  
  /**
   * 设置关卡主题
   */
  setStage(stage: number): void {
    this.stageTheme = STAGE_THEMES[(stage - 1) % STAGE_THEMES.length];
  }
  
  /**
   * 更新背景
   */
  update(): void {
    this.scrollY += GAME_CONFIG.SCROLL_SPEED_BASE;
    if (this.scrollY >= GAME_CONFIG.HEIGHT) {
      this.scrollY = 0;
    }
    
    // 更新星星
    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > GAME_CONFIG.HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GAME_CONFIG.WIDTH;
      }
    }
    
    // 更新地面物体
    for (const obj of this.groundObjects) {
      obj.y += GAME_CONFIG.SCROLL_SPEED_BASE * 0.5;
      if (obj.y > GAME_CONFIG.HEIGHT + 100) {
        obj.y = -100;
        obj.x = Math.random() * GAME_CONFIG.WIDTH;
      }
    }
  }
  
  /**
   * 渲染背景
   */
  render(): void {
    // 清空画布
    this.ctx.fillStyle = this.stageTheme.bg;
    this.ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    
    // 绘制星星
    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.fillRect(
        Math.floor(star.x), 
        Math.floor(star.y), 
        star.size, 
        star.size
      );
    }
    
    // 绘制远景地面物体
    this.renderGroundObjects();
    
    // 添加扫描线效果 (原版街机CRT风格)
    this.renderScanlines();
    
    // 暗角效果
    this.renderVignette();
  }
  
  /**
   * 渲染地面物体
   */
  private renderGroundObjects(): void {
    this.ctx.fillStyle = this.stageTheme.ground;
    
    for (const obj of this.groundObjects) {
      if (obj.y < -obj.height || obj.y > GAME_CONFIG.HEIGHT) continue;
      
      if (obj.type === 'building') {
        // 建筑物
        this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        
        // 窗户
        this.ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
        for (let wx = 4; wx < obj.width - 4; wx += 8) {
          for (let wy = 4; wy < obj.height - 4; wy += 8) {
            if (Math.random() > 0.3) {
              this.ctx.fillRect(obj.x + wx, obj.y + wy, 4, 4);
            }
          }
        }
        this.ctx.fillStyle = this.stageTheme.ground;
      } else {
        // 树木 (三角形)
        this.ctx.beginPath();
        this.ctx.moveTo(obj.x + obj.width / 2, obj.y);
        this.ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        this.ctx.lineTo(obj.x, obj.y + obj.height);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
  }
  
  /**
   * 渲染扫描线
   */
  private renderScanlines(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 4) {
      this.ctx.fillRect(0, y, GAME_CONFIG.WIDTH, 2);
    }
  }
  
  /**
   * 渲染暗角
   */
  private renderVignette(): void {
    const gradient = this.ctx.createRadialGradient(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, GAME_CONFIG.HEIGHT * 0.3,
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, GAME_CONFIG.HEIGHT * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
  }
  
  /**
   * 获取渲染上下文
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}