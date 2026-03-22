import { Vector2 } from '../constants';

/**
 * 输入管理器 - 处理键盘输入
 */
export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map(); // 单次触发
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys.get(key)) {
        this.keysPressed.set(key, true);
      }
      this.keys.set(key, true);
      
      // 防止默认行为 (防止页面滚动)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.key.toLowerCase(), false);
    });
  }
  
  /**
   * 检查按键是否按下
   */
  isKeyDown(key: string): boolean {
    return this.keys.get(key.toLowerCase()) || false;
  }
  
  /**
   * 检查按键是否刚按下 (用于射击等单次触发)
   */
  isKeyPressed(key: string): boolean {
    const k = key.toLowerCase();
    if (this.keysPressed.get(k)) {
      this.keysPressed.set(k, false);
      return true;
    }
    return false;
  }
  
  /**
   * 获取移动方向
   */
  getMovement(): Vector2 {
    let x = 0;
    let y = 0;
    
    if (this.isKeyDown('arrowleft') || this.isKeyDown('a')) x -= 1;
    if (this.isKeyDown('arrowright') || this.isKeyDown('d')) x += 1;
    if (this.isKeyDown('arrowup') || this.isKeyDown('w')) y -= 1;
    if (this.isKeyDown('arrowdown') || this.isKeyDown('s')) y += 1;
    
    // 对角线移动时归一化
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    return { x, y };
  }
  
  /**
   * 检查是否正在射击 (按住Z)
   */
  isShooting(): boolean {
    return this.isKeyDown('z') || this.isKeyDown(' ');
  }
  
  /**
   * 检查是否按下炸弹键 (按X)
   */
  isBombPressed(): boolean {
    return this.isKeyPressed('x');
  }
  
  /**
   * 检查是否暂停 (按P)
   */
  isPausePressed(): boolean {
    return this.isKeyPressed('p');
  }
}