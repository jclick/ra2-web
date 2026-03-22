import { Entity } from './Entity';
import { PALETTE, EntityType, GAME_CONFIG } from '../constants';

/**
 * 爆炸效果粒子
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'fire' | 'smoke' | 'spark';
}

/**
 * 爆炸效果 - 完全还原原版雷电风格
 */
export class Explosion extends Entity {
  public particles: Particle[] = [];
  public frame: number = 0;
  public maxFrames: number = 40;
  public size: 'small' | 'medium' | 'large' | 'boss';
  public flash: boolean = true;
  
  constructor(x: number, y: number, size: 'small' | 'medium' | 'large' | 'boss' = 'medium') {
    super(x, y, 0, 0, EntityType.EXPLOSION);
    this.size = size;
    this.initParticles();
  }
  
  private initParticles(): void {
    const configs = {
      small: { count: 10, speed: 2, life: 20 },
      medium: { count: 20, speed: 3, life: 30 },
      large: { count: 40, speed: 4, life: 40 },
      boss: { count: 80, speed: 6, life: 60 },
    };
    
    const config = configs[this.size];
    const colors = [
      PALETTE.EXPLOSION_WHITE,
      PALETTE.EXPLOSION_YELLOW,
      PALETTE.EXPLOSION_ORANGE,
      PALETTE.EXPLOSION_RED,
      PALETTE.EXPLOSION_DARK,
    ];
    
    // 火焰粒子
    for (let i = 0; i < config.count; i++) {
      const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5;
      const speed = config.speed * (0.5 + Math.random() * 0.8);
      
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life * (0.7 + Math.random() * 0.6),
        maxLife: config.life,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * (colors.length - 1))],
        type: 'fire',
      });
    }
    
    // 烟雾粒子
    const smokeCount = Math.floor(config.count * 0.3);
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed * 0.3;
      
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5, // 烟雾上升
        life: config.life * 1.5,
        maxLife: config.life * 1.5,
        size: 4 + Math.random() * 6,
        color: '#444444',
        type: 'smoke',
      });
    }
    
    // 火花粒子
    const sparkCount = Math.floor(config.count * 0.5);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed * 1.5;
      
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life * 0.5,
        maxLife: config.life * 0.5,
        size: 1 + Math.random() * 2,
        color: PALETTE.EXPLOSION_WHITE,
        type: 'spark',
      });
    }
  }
  
  update(): void {
    this.frame++;
    
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.type === 'fire') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      } else if (p.type === 'smoke') {
        p.vx *= 0.98;
        p.size += 0.1; // 烟雾扩散
      } else if (p.type === 'spark') {
        p.vy += 0.1; // 重力
        p.vx *= 0.98;
      }
      
      p.life--;
    }
    
    this.particles = this.particles.filter(p => p.life > 0);
    
    if (this.frame >= this.maxFrames && this.particles.length === 0) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    // 中心闪光
    if (this.flash && this.frame < 5) {
      const flashAlpha = 1 - this.frame / 5;
      const flashSize = this.frame * (this.size === 'boss' ? 8 : 4);
      
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, flashSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 绘制粒子
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      
      if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(100, 100, 100, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
  }
}

/**
 * 炸弹清屏效果
 */
export class BombEffect extends Entity {
  public radius: number = 0;
  public maxRadius: number = 350;
  public frame: number = 0;
  private rings: { r: number; alpha: number }[] = [];
  
  constructor(x: number, y: number) {
    super(x, y, 0, 0, EntityType.EFFECT);
  }
  
  update(): void {
    this.frame++;
    this.radius += 20;
    
    // 生成波纹
    if (this.frame % 5 === 0) {
      this.rings.push({ r: this.radius, alpha: 1 });
    }
    
    // 更新波纹
    for (const ring of this.rings) {
      ring.r += 10;
      ring.alpha -= 0.03;
    }
    
    this.rings = this.rings.filter(r => r.alpha > 0);
    
    if (this.radius >= this.maxRadius && this.rings.length === 0) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    // 主爆炸球
    const alpha = Math.max(0, 1 - this.radius / this.maxRadius);
    
    // 外圈
    ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 内圈
    ctx.strokeStyle = `rgba(255, 100, 0, ${alpha * 0.7})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    
    // 核心
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // 波纹
    for (const ring of this.rings) {
      ctx.strokeStyle = `rgba(255, 150, 0, ${ring.alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * 分数弹出效果
 */
export class ScorePopup extends Entity {
  public score: number;
  public life: number = 40;
  
  constructor(x: number, y: number, score: number) {
    super(x, y, 0, 0, EntityType.EFFECT);
    this.score = score;
    this.vy = -1; // 使用继承的 vy
  }
  
  update(): void {
    this.y += this.vy;
    this.life--;
    
    if (this.life <= 0) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    const alpha = this.life / 40;
    
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.score.toString(), this.x, this.y);
  }
}

/**
 * 警告效果
 */
export class WarningEffect extends Entity {
  public frame: number = 0;
  public maxFrames: number = 120;
  
  constructor() {
    super(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, 0, 0, EntityType.EFFECT);
  }
  
  update(): void {
    this.frame++;
    if (this.frame >= this.maxFrames) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    const blink = Math.sin(this.frame * 0.2) > 0;
    
    if (blink) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WARNING!', this.x, this.y);
      
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, this.y - 20, GAME_CONFIG.WIDTH - 40, 40);
    }
  }
}
