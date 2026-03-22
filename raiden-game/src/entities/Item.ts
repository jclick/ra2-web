import { Entity } from './Entity';
import { 
  GAME_CONFIG, 
  PALETTE, 
  EntityType,
  WeaponType,
  SubWeaponType
} from '../constants';

/**
 * 道具基类
 */
export abstract class Item extends Entity {
  public itemType: string;
  protected bouncePhase: number = 0;
  
  constructor(x: number, y: number, type: string, width: number = 16, height: number = 16) {
    super(x, y, width, height, EntityType.ITEM_P);
    this.itemType = type;
    this.vy = 1.5;
    this.vx = 0;
  }
  
  update(): void {
    this.bouncePhase += 0.1;
    this.y += this.vy;
    
    // 左右摆动
    this.x += Math.sin(this.bouncePhase) * 0.5;
    
    if (this.isOffScreen()) {
      this.active = false;
    }
  }
  
  abstract render(ctx: CanvasRenderingContext2D): void;
}

// ============================================
// 红道具 - Vulcan (散弹)
// ============================================
export class ItemRed extends Item {
  private rotation: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'red');
  }
  
  update(): void {
    super.update();
    this.rotation += 0.05;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 红色外圈
    ctx.strokeStyle = PALETTE.ITEM_RED_BG;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // R字母
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', 0, 0);
    
    // 旋转装饰
    ctx.rotate(this.rotation);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.setWeapon(WeaponType.VULCAN);
  }
}

// ============================================
// 蓝道具 - Laser (激光)
// ============================================
export class ItemBlue extends Item {
  private pulse: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'blue');
  }
  
  update(): void {
    super.update();
    this.pulse += 0.15;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const glow = 1 + Math.sin(this.pulse) * 0.2;
    
    // 蓝色光晕
    ctx.fillStyle = `rgba(0, 0, 200, ${0.3 * glow})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10 * glow, 0, Math.PI * 2);
    ctx.fill();
    
    // 外圈
    ctx.strokeStyle = PALETTE.ITEM_BLUE_BG;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // L字母
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', 0, 0);
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.setWeapon(WeaponType.LASER);
  }
}

// ============================================
// M道具 - Missile (导弹)
// ============================================
export class ItemM extends Item {
  private bounce: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'm');
  }
  
  update(): void {
    super.update();
    this.bounce += 0.2;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const offsetY = Math.sin(this.bounce) * 2;
    
    // 导弹形状
    ctx.fillStyle = '#00cc00';
    ctx.beginPath();
    ctx.moveTo(0 + offsetY, -8);
    ctx.lineTo(4, 4);
    ctx.lineTo(0 + offsetY, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    
    // M字母
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', offsetY, 0);
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.setSubWeapon(SubWeaponType.MISSILE);
  }
}

// ============================================
// H道具 - Homing (追踪导弹)
// ============================================
export class ItemH extends Item {
  private rotateAngle: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'h');
  }
  
  update(): void {
    super.update();
    this.rotateAngle += 0.08;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 旋转的H
    ctx.rotate(this.rotateAngle);
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 0, 0);
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.setSubWeapon(SubWeaponType.HOMING);
  }
}

// ============================================
// P道具 - Power Up (火力强化)
// ============================================
export class ItemP extends Item {
  private glowPhase: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'p');
  }
  
  update(): void {
    super.update();
    this.glowPhase += 0.2;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const glow = 1 + Math.sin(this.glowPhase) * 0.3;
    
    // 发光效果
    ctx.fillStyle = `rgba(255, 170, 0, ${0.5 * glow})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10 * glow, 0, Math.PI * 2);
    ctx.fill();
    
    // 外圈
    ctx.strokeStyle = PALETTE.ITEM_P_GLOW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // P字母
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 0, 0);
    
    ctx.restore();
  }
  
  apply(player: any): void {
    // P道具提升当前武器等级
    if (player.mainWeapon === WeaponType.VULCAN) {
      player.mainPower = Math.min(7, player.mainPower + 1);
    } else {
      player.mainPower = Math.min(7, player.mainPower + 1);
    }
  }
}

// ============================================
// B道具 - Bomb (炸弹)
// ============================================
export class ItemB extends Item {
  private pulse: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'b');
  }
  
  update(): void {
    super.update();
    this.pulse += 0.15;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const size = 1 + Math.sin(this.pulse) * 0.1;
    
    // 绿色发光
    ctx.fillStyle = `rgba(0, 255, 0, ${0.4})`;
    ctx.beginPath();
    ctx.arc(0, 0, 9 * size, 0, Math.PI * 2);
    ctx.fill();
    
    // 外圈
    ctx.strokeStyle = PALETTE.ITEM_B_GLOW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.stroke();
    
    // B字母
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', 0, 0);
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.addBomb();
  }
}

// ============================================
// 1UP道具 - 额外生命
// ============================================
export class Item1UP extends Item {
  private blink: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, '1up');
  }
  
  update(): void {
    super.update();
    this.blink += 0.2;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const visible = Math.sin(this.blink) > 0;
    
    if (visible) {
      // 绿色1UP
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1UP', 0, 0);
      
      // 边框
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.strokeRect(-12, -8, 24, 16);
    }
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.addLife();
  }
}

// ============================================
// 勋章 - Medal (分数)
// ============================================
export class ItemMedal extends Item {
  private spinAngle: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'medal');
  }
  
  update(): void {
    super.update();
    this.spinAngle += 0.1;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 缩放模拟旋转
    const scaleX = Math.abs(Math.cos(this.spinAngle));
    ctx.scale(scaleX, 1);
    
    // 金色圆形
    ctx.fillStyle = PALETTE.ITEM_MEDAL;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 星形
    ctx.fillStyle = '#ff6600';
    this.drawStar(ctx, 0, 0, 4, 5, 2);
    
    ctx.restore();
  }
  
  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  apply(player: any): void {
    player.addMedal();
  }
}

// ============================================
// Miclus - 西武吉祥物 (小龙)
// ============================================
export class ItemMiclus extends Item {
  private animFrame: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'miclus');
  }
  
  update(): void {
    super.update();
    this.animFrame += 0.15;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const bounce = Math.sin(this.animFrame) * 2;
    
    // 简化的Miclus (绿色小龙)
    ctx.fillStyle = '#00ff44';
    
    // 身体
    ctx.fillRect(-8, -4 + bounce, 16, 10);
    
    // 头
    ctx.fillRect(-6, -10 + bounce, 12, 8);
    
    // 眼睛
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -8 + bounce, 3, 3);
    ctx.fillRect(1, -8 + bounce, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-3, -7 + bounce, 1, 1);
    ctx.fillRect(2, -7 + bounce, 1, 1);
    
    // 翅膀
    ctx.fillStyle = '#00cc33';
    ctx.fillRect(-12, -2 + bounce, 4, 6);
    ctx.fillRect(8, -2 + bounce, 4, 6);
    
    ctx.restore();
  }
  
  apply(player: any): void {
    player.addScore(GAME_CONFIG.SCORE_MICLUS);
  }
}

// ============================================
// 精灵 - Fairy (隐藏高分道具)
// ============================================
export class ItemFairy extends Item {
  private wingPhase: number = 0;
  private escapeTimer: number = 0;
  
  constructor(x: number, y: number) {
    super(x, y, 'fairy');
    this.vy = -1; // 向上飞
    this.vx = 1;
  }
  
  update(): void {
    this.wingPhase += 0.3;
    this.escapeTimer++;
    
    // 向上飞并左右摆动
    this.y += this.vy;
    this.x += Math.sin(this.wingPhase) * 1.5;
    
    // 速度逐渐加快 (逃跑)
    this.vy = Math.max(-4, this.vy - 0.05);
    
    if (this.isOffScreen()) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const wingFlap = Math.sin(this.wingPhase) * 0.3;
    
    // 小精灵 (粉色)
    ctx.fillStyle = '#ff88ff';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 翅膀
    ctx.fillStyle = '#ffccff';
    ctx.save();
    ctx.rotate(wingFlap);
    ctx.fillRect(-10, -2, 6, 4);
    ctx.restore();
    
    ctx.save();
    ctx.rotate(-wingFlap);
    ctx.fillRect(4, -2, 6, 4);
    ctx.restore();
    
    ctx.restore();
  }
  
  apply(player: any): void {
    // 精灵恢复玩家全部火力
    player.mainPower = Math.max(player.mainPower, 4);
    player.subPower = Math.max(player.subPower, 2);
    player.addScore(GAME_CONFIG.SCORE_FAIRY);
  }
}

// ============================================
// 道具工厂
// ============================================
export class ItemFactory {
  /**
   * 根据掉落概率创建道具
   */
  static createRandom(x: number, y: number): Item | null {
    const rand = Math.random();
    
    // 掉落概率表
    if (rand < 0.02) return new Item1UP(x, y);      // 2% 1UP
    if (rand < 0.06) return new ItemB(x, y);        // 4% B
    if (rand < 0.10) return new ItemMiclus(x, y);   // 4% Miclus
    if (rand < 0.16) return new ItemP(x, y);        // 6% P
    if (rand < 0.24) return new ItemRed(x, y);      // 8% Red
    if (rand < 0.32) return new ItemBlue(x, y);     // 8% Blue
    if (rand < 0.40) return new ItemM(x, y);        // 8% M
    if (rand < 0.48) return new ItemH(x, y);        // 8% H
    if (rand < 0.65) return new ItemMedal(x, y);    // 17% Medal
    
    return null; // 无掉落
  }
  
  /**
   * 特定敌人死亡时掉落
   */
  static createForEnemy(x: number, y: number, enemyType: string): Item | null {
    // BOSS必定掉落P道具
    if (enemyType.startsWith('boss')) {
      return new ItemP(x, y);
    }
    
    return this.createRandom(x, y);
  }
}
