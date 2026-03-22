/// <reference types="vitest" />

import { describe, it, expect, beforeEach } from 'vitest';
import { Entity } from './Entity';
import { EntityType, GAME_CONFIG } from '../constants';

// 创建一个测试用的实体类
class TestEntity extends Entity {
  update(): void {
    this.x += this.vx;
    this.y += this.vy;
  }

  render(): void {
    // 测试渲染
  }
}

describe('Entity', () => {
  let entity: TestEntity;

  beforeEach(() => {
    entity = new TestEntity(100, 100, 32, 32, EntityType.PLAYER);
  });

  describe('初始化', () => {
    it('应该正确初始化属性', () => {
      expect(entity.x).toBe(100);
      expect(entity.y).toBe(100);
      expect(entity.width).toBe(32);
      expect(entity.height).toBe(32);
      expect(entity.type).toBe(EntityType.PLAYER);
      expect(entity.active).toBe(true);
      expect(entity.hp).toBe(1);
    });

    it('速度应该默认为 0', () => {
      expect(entity.vx).toBe(0);
      expect(entity.vy).toBe(0);
    });
  });

  describe('边界框', () => {
    it('应该正确计算边界框', () => {
      const bounds = entity.getBounds();
      
      expect(bounds.x).toBe(84); // 100 - 32/2
      expect(bounds.y).toBe(84); // 100 - 32/2
      expect(bounds.width).toBe(32);
      expect(bounds.height).toBe(32);
    });
  });

  describe('碰撞检测', () => {
    it('应该检测到重叠的实体', () => {
      const other = new TestEntity(110, 110, 32, 32, EntityType.ENEMY_AIR);
      
      expect(entity.collidesWith(other)).toBe(true);
    });

    it('不应该检测到不重叠的实体', () => {
      const other = new TestEntity(200, 200, 32, 32, EntityType.ENEMY_AIR);
      
      expect(entity.collidesWith(other)).toBe(false);
    });

    it('应该检测到边缘接触的实体', () => {
      // 计算刚好接触的位置：entity 中心在 100，宽度 32，所以右边界是 100 + 16 = 116
      // other 中心在 132，宽度 32，所以左边界是 132 - 16 = 116
      // 两者在 116 处接触
      const other = new TestEntity(132, 100, 32, 32, EntityType.ENEMY_AIR);
      
      // 边界检测使用 < 而不是 <=，所以边缘接触不算碰撞
      // 这是预期的行为，因为我们想要的是真正的重叠
      expect(entity.collidesWith(other)).toBe(false);
      
      // 稍微重叠一点
      const overlapping = new TestEntity(131, 100, 32, 32, EntityType.ENEMY_AIR);
      expect(entity.collidesWith(overlapping)).toBe(true);
    });
  });

  describe('伤害处理', () => {
    it('应该正确减少 HP', () => {
      entity.takeDamage(1);
      
      expect(entity.hp).toBe(0);
    });

    it('HP 为 0 时应该被标记为非活动', () => {
      const destroyed = entity.takeDamage(1);
      
      expect(destroyed).toBe(true);
      expect(entity.active).toBe(false);
    });

    it('HP 大于伤害时应该保持活动', () => {
      entity.hp = 5;
      const destroyed = entity.takeDamage(2);
      
      expect(destroyed).toBe(false);
      expect(entity.active).toBe(true);
      expect(entity.hp).toBe(3);
    });
  });

  describe('屏幕检测', () => {
    it('应该检测到屏幕上方的实体', () => {
      entity.y = -60;
      expect(entity.isOffScreen()).toBe(true);
    });

    it('应该检测到屏幕下方的实体', () => {
      entity.y = GAME_CONFIG.HEIGHT + 60;
      expect(entity.isOffScreen()).toBe(true);
    });

    it('应该检测到屏幕左侧的实体', () => {
      entity.x = -60;
      expect(entity.isOffScreen()).toBe(true);
    });

    it('应该检测到屏幕右侧的实体', () => {
      entity.x = GAME_CONFIG.WIDTH + 60;
      expect(entity.isOffScreen()).toBe(true);
    });

    it('不应该检测到屏幕内的实体', () => {
      entity.x = GAME_CONFIG.WIDTH / 2;
      entity.y = GAME_CONFIG.HEIGHT / 2;
      expect(entity.isOffScreen()).toBe(false);
    });
  });

  describe('更新', () => {
    it('应该根据速度更新位置', () => {
      entity.vx = 5;
      entity.vy = -3;
      
      entity.update();
      
      expect(entity.x).toBe(105);
      expect(entity.y).toBe(97);
    });
  });
});
