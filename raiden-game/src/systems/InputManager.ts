import { Vector2 } from '../constants';

/**
 * 输入设备类型
 */
export enum InputDevice {
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  TOUCH = 'touch',
  GAMEPAD = 'gamepad',
}

/**
 * 输入管理器 - 处理键盘、鼠标、触摸输入
 * 
 * 修复问题:
 * - 添加了 pointer events 支持，确保 canvas 能正确接收鼠标/触摸事件
 * - 修复了 z-index 遮挡问题，通过正确的事件目标检查
 * - 添加了滚轮事件支持用于调整视角/缩放
 */
export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();
  
  // 鼠标/指针状态
  private mousePos: Vector2 = { x: 0, y: 0 };
  private mouseDown: boolean = false;
  private mousePressed: boolean = false;
  private mouseReleased: boolean = false;
  private rightMouseDown: boolean = false;
  
  // 滚轮状态
  private wheelDelta: number = 0;
  private wheelDeltaX: number = 0;
  
  // 当前输入设备
  private currentDevice: InputDevice = InputDevice.KEYBOARD;
  
  // canvas 元素引用（用于坐标转换）
  private canvas: HTMLCanvasElement | null = null;
  
  // 事件监听器引用（用于清理）
  private boundHandlers: Array<{ element: EventTarget; type: string; handler: EventListener }> = [];

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.canvas = canvas;
    }
    this.setupEventListeners();
  }
  
  /**
   * 设置 canvas 引用（用于坐标转换）
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }
  
  /**
   * 设置事件监听器
   * 
   * 修复要点:
   * 1. 在 window 上监听键盘事件
   * 2. 在 canvas 上监听 pointer events，确保正确接收
   * 3. 使用 pointer-events CSS 属性确保 canvas 可交互
   * 4. 添加滚轮事件支持
   */
  private setupEventListeners(): void {
    // 键盘事件 - 在 window 上监听以捕获所有情况
    this.addListener(window, 'keydown', ((e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!this.keys.get(key)) {
        this.keysPressed.set(key, true);
      }
      this.keys.set(key, true);
      this.currentDevice = InputDevice.KEYBOARD;
      
      // 防止默认行为 (防止页面滚动)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(key)) {
        e.preventDefault();
      }
    }) as EventListener);
    
    this.addListener(window, 'keyup', ((e: KeyboardEvent) => {
      this.keys.set(e.key.toLowerCase(), false);
    }) as EventListener);
    
    // 获取 canvas 元素（如果未通过构造函数传入）
    const canvas = this.canvas || document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.canvas = canvas;
      
      // 确保 canvas 可以接收指针事件
      canvas.style.pointerEvents = 'auto';
      canvas.style.touchAction = 'none'; // 防止触摸设备的默认行为
      
      // Pointer Events (统一鼠标和触摸)
      this.addListener(canvas, 'pointerenter', ((e: PointerEvent) => {
        canvas.setPointerCapture(e.pointerId);
      }) as EventListener);
      
      this.addListener(canvas, 'pointerdown', ((e: PointerEvent) => {
        e.preventDefault();
        this.updateMousePosition(e);
        
        if (e.button === 0) {
          // 左键
          this.mouseDown = true;
          this.mousePressed = true;
        } else if (e.button === 2) {
          // 右键
          this.rightMouseDown = true;
        }
        this.currentDevice = InputDevice.MOUSE;
      }) as EventListener);
      
      this.addListener(canvas, 'pointermove', ((e: PointerEvent) => {
        this.updateMousePosition(e);
        if (e.buttons !== 0) {
          this.currentDevice = InputDevice.MOUSE;
        }
      }) as EventListener);
      
      this.addListener(canvas, 'pointerup', ((e: PointerEvent) => {
        e.preventDefault();
        if (e.button === 0) {
          this.mouseDown = false;
          this.mouseReleased = true;
        } else if (e.button === 2) {
          this.rightMouseDown = false;
        }
      }) as EventListener);
      
      this.addListener(canvas, 'pointerleave', (() => {
        // 指针离开时可选：保持状态或重置
        // this.mouseDown = false;
      }) as EventListener);
      
      // 滚轮事件
      this.addListener(canvas, 'wheel', ((e: WheelEvent) => {
        e.preventDefault();
        this.wheelDelta = e.deltaY;
        this.wheelDeltaX = e.deltaX;
      }) as EventListener, { passive: false });
      
      // 阻止 canvas 上的右键菜单
      this.addListener(canvas, 'contextmenu', ((e: MouseEvent) => {
        e.preventDefault();
      }) as EventListener);
    }
    
    // 全局滚轮事件（作为后备）
    this.addListener(window, 'wheel', ((e: WheelEvent) => {
      // 检查事件目标是否是 canvas 或 canvas 内的元素
      const target = e.target as HTMLElement;
      if (target?.id === 'game-canvas' || target?.closest?.('#game-canvas')) {
        this.wheelDelta = e.deltaY;
        this.wheelDeltaX = e.deltaX;
      }
    }) as EventListener, { passive: true });
  }
  
  /**
   * 添加事件监听器并记录以便清理
   */
  private addListener(
    element: EventTarget, 
    type: string, 
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(type, handler, options);
    this.boundHandlers.push({ element, type, handler });
  }
  
  /**
   * 更新鼠标位置（转换为 canvas 坐标系）
   */
  private updateMousePosition(e: PointerEvent | MouseEvent): void {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.mousePos = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }
  
  /**
   * 清理所有事件监听器
   */
  dispose(): void {
    for (const { element, type, handler } of this.boundHandlers) {
      element.removeEventListener(type, handler);
    }
    this.boundHandlers = [];
  }
  
  // ==================== 键盘输入 ====================
  
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
  
  // ==================== 鼠标输入 ====================
  
  /**
   * 获取鼠标位置（canvas 坐标系）
   */
  getMousePosition(): Vector2 {
    return { ...this.mousePos };
  }
  
  /**
   * 检查鼠标左键是否按下
   */
  isMouseDown(): boolean {
    return this.mouseDown;
  }
  
  /**
   * 检查鼠标是否刚按下（单次触发）
   */
  isMousePressed(): boolean {
    if (this.mousePressed) {
      this.mousePressed = false;
      return true;
    }
    return false;
  }
  
  /**
   * 检查鼠标是否刚释放（单次触发）
   */
  isMouseReleased(): boolean {
    if (this.mouseReleased) {
      this.mouseReleased = false;
      return true;
    }
    return false;
  }
  
  /**
   * 检查鼠标右键是否按下
   */
  isRightMouseDown(): boolean {
    return this.rightMouseDown;
  }
  
  // ==================== 滚轮输入 ====================
  
  /**
   * 获取滚轮滚动量（正数为向下/向后，负数为向上/向前）
   */
  getWheelDelta(): number {
    const delta = this.wheelDelta;
    this.wheelDelta = 0; // 读取后清零
    return delta;
  }
  
  /**
   * 获取水平滚轮滚动量
   */
  getWheelDeltaX(): number {
    const delta = this.wheelDeltaX;
    this.wheelDeltaX = 0;
    return delta;
  }
  
  /**
   * 检查是否有滚轮事件
   */
  hasWheelInput(): boolean {
    return this.wheelDelta !== 0 || this.wheelDeltaX !== 0;
  }
  
  // ==================== 组合输入 ====================
  
  /**
   * 检查是否正在射击 (Z 键或鼠标左键)
   */
  isShooting(): boolean {
    return this.isKeyDown('z') || this.isKeyDown(' ') || this.mouseDown;
  }
  
  /**
   * 检查是否按下炸弹键 (X 键或鼠标右键)
   */
  isBombPressed(): boolean {
    return this.isKeyPressed('x') || (this.rightMouseDown && !this.keys.get('rightMousePrev'));
  }
  
  /**
   * 检查是否暂停 (P 键)
   */
  isPausePressed(): boolean {
    return this.isKeyPressed('p') || this.isKeyPressed('escape');
  }
  
  /**
   * 获取当前输入设备
   */
  getCurrentDevice(): InputDevice {
    return this.currentDevice;
  }
  
  /**
   * 每帧更新（用于处理需要每帧重置的状态）
   */
  update(): void {
    // 保存右键前一帧状态用于检测按下
    if (this.rightMouseDown) {
      this.keys.set('rightMousePrev', true);
    } else {
      this.keys.set('rightMousePrev', false);
    }
  }
}
