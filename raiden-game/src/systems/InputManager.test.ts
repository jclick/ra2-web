/// <reference types="vitest" />

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager, InputDevice } from './InputManager';
import { GAME_CONFIG } from '../constants';

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // 创建 mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.id = 'game-canvas';
    mockCanvas.width = GAME_CONFIG.WIDTH;
    mockCanvas.height = GAME_CONFIG.HEIGHT;
    document.body.appendChild(mockCanvas);
    
    inputManager = new InputManager(mockCanvas);
  });

  afterEach(() => {
    inputManager.dispose();
    document.body.innerHTML = '';
  });

  describe('键盘输入', () => {
    it('应该正确检测按键按下', () => {
      // 模拟键盘按下
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      
      expect(inputManager.isKeyDown('z')).toBe(true);
      expect(inputManager.isKeyDown('Z')).toBe(true);
    });

    it('应该正确检测按键释放', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
      
      expect(inputManager.isKeyDown('x')).toBe(false);
    });

    it('应该正确检测单次按键触发', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      
      expect(inputManager.isKeyPressed('p')).toBe(true);
      expect(inputManager.isKeyPressed('p')).toBe(false); // 第二次应该为 false
    });

    it('应该正确计算移动方向', () => {
      // 单独方向
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      let movement = inputManager.getMovement();
      expect(movement.y).toBe(-1);
      expect(movement.x).toBe(0);
      
      // 组合方向
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      movement = inputManager.getMovement();
      expect(movement.x).toBeGreaterThan(0);
      expect(movement.y).toBeLessThan(0);
    });
  });

  describe('鼠标输入', () => {
    it('应该正确检测鼠标按下', () => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', { 
        button: 0,
        clientX: 100, 
        clientY: 100 
      }));
      
      expect(inputManager.isMouseDown()).toBe(true);
    });

    it('应该正确转换鼠标坐标到 canvas 坐标系', () => {
      const rect = mockCanvas.getBoundingClientRect();
      const scaleX = GAME_CONFIG.WIDTH / rect.width;
      const scaleY = GAME_CONFIG.HEIGHT / rect.height;
      
      mockCanvas.dispatchEvent(new PointerEvent('pointermove', { 
        clientX: rect.left + 50,
        clientY: rect.top + 50
      }));
      
      const pos = inputManager.getMousePosition();
      expect(pos.x).toBeCloseTo(50 * scaleX);
      expect(pos.y).toBeCloseTo(50 * scaleY);
    });

    it('应该正确检测鼠标按下和释放', () => {
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
      
      expect(inputManager.isMousePressed()).toBe(true);
      expect(inputManager.isMousePressed()).toBe(false);
      
      mockCanvas.dispatchEvent(new PointerEvent('pointerup', { button: 0 }));
      
      expect(inputManager.isMouseDown()).toBe(false);
    });
  });

  describe('滚轮事件', () => {
    it('应该正确检测滚轮滚动', () => {
      mockCanvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
      
      expect(inputManager.getWheelDelta()).toBe(100);
      expect(inputManager.getWheelDelta()).toBe(0); // 读取后清零
    });

    it('应该正确检测水平滚轮', () => {
      mockCanvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 50 }));
      
      expect(inputManager.getWheelDeltaX()).toBe(50);
    });
  });

  describe('组合输入', () => {
    it('射击应该响应 Z 键或鼠标左键', () => {
      // 键盘射击
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      expect(inputManager.isShooting()).toBe(true);
      
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z' }));
      expect(inputManager.isShooting()).toBe(false);
      
      // 鼠标射击
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
      expect(inputManager.isShooting()).toBe(true);
    });

    it('应该正确识别当前输入设备', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(inputManager.getCurrentDevice()).toBe(InputDevice.KEYBOARD);
      
      mockCanvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
      expect(inputManager.getCurrentDevice()).toBe(InputDevice.MOUSE);
    });
  });
});
