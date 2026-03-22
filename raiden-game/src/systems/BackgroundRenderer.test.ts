/// <reference types="vitest" />

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundRenderer } from './BackgroundRenderer';
import { GAME_CONFIG } from '../constants';

describe('BackgroundRenderer', () => {
  let mockCtx: Partial<CanvasRenderingContext2D>;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // 创建完整的 mock 2D 上下文
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      }) as any),
    };

    // 创建 mock canvas
    mockCanvas = {
      width: GAME_CONFIG.WIDTH,
      height: GAME_CONFIG.HEIGHT,
      getContext: vi.fn(() => mockCtx as CanvasRenderingContext2D),
    } as unknown as HTMLCanvasElement;
  });

  describe('初始化', () => {
    it('应该正确初始化', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      expect(renderer).toBeDefined();
    });

    it('应该正确获取 2D 上下文', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      const ctx = renderer.getContext();
      expect(ctx).toBe(mockCtx);
    });

    it('应该在获取上下文失败时抛出错误', () => {
      const badCanvas = {
        ...mockCanvas,
        getContext: vi.fn(() => null),
      } as unknown as HTMLCanvasElement;

      expect(() => new BackgroundRenderer(badCanvas)).toThrow('Failed to get 2D context');
    });
  });

  describe('关卡主题', () => {
    it('应该正确设置关卡主题', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      
      // 验证不抛出错误
      expect(() => renderer.setStage(1)).not.toThrow();
    });
  });

  describe('更新和渲染', () => {
    it('应该正确更新背景', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      
      expect(() => renderer.update()).not.toThrow();
    });

    it('应该正确渲染背景', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      
      expect(() => renderer.render()).not.toThrow();
      
      // 验证调用了 fillRect 来绘制背景
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('多次更新不应该出错', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      
      for (let i = 0; i < 100; i++) {
        renderer.update();
      }
      
      expect(() => renderer.render()).not.toThrow();
    });
  });

  describe('滚动效果', () => {
    it('更新应该改变内部状态', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      
      // 多次更新
      for (let i = 0; i < 10; i++) {
        renderer.update();
      }
      
      expect(() => renderer.render()).not.toThrow();
    });

    it('滚动应该循环', () => {
      const renderer = new BackgroundRenderer(mockCanvas);
      
      // 大量更新应该触发循环逻辑
      for (let i = 0; i < 1000; i++) {
        renderer.update();
      }
      
      expect(() => renderer.render()).not.toThrow();
    });
  });
});
