/**
 * 雷电 - 完全还原原版街机规格
 * Raiden Arcade (1990) by Seibu Kaihatsu
 */

// ============================================
// 原版街机硬件规格
// ============================================
export const ARCADE_SPEC = {
  // 原始分辨率: 224x256 (竖屏)
  WIDTH: 224,
  HEIGHT: 256,
  
  // 颜色深度: 2048色 (11位色, 实际使用可能更少)
  PALETTE_SIZE: 2048,
  
  // 刷新率: 60Hz
  REFRESH_RATE: 60,
  
  // CPU: 双 NEC V30 @ 10MHz
  // 声音: Z80 @ 3.58MHz + YM3812 + OKI MSM6295
};

// ============================================
// 游戏配置
// ============================================
export const GAME_CONFIG = {
  // 画面设置
  WIDTH: ARCADE_SPEC.WIDTH,
  HEIGHT: ARCADE_SPEC.HEIGHT,
  FPS: ARCADE_SPEC.REFRESH_RATE,
  
  // 滚动速度 (像素/帧) - 原版街机速度
  SCROLL_SPEED_BASE: 0.5,
  SCROLL_SPEED_MAX: 2,
  
  // 玩家参数
  PLAYER_SPEED_NORMAL: 2.5,
  PLAYER_SPEED_SLOW: 1.2,    // 按住射击键时的慢速移动
  PLAYER_INVINCIBLE_TIME: 180, // 无敌帧数 (3秒)
  
  // 子弹速度
  BULLET_SPEED_PLAYER_MAIN: 12,
  BULLET_SPEED_PLAYER_SUB: 8,
  BULLET_SPEED_ENEMY_SLOW: 1.5,
  BULLET_SPEED_ENEMY_NORMAL: 2.5,
  BULLET_SPEED_ENEMY_FAST: 4,
  
  // 分数
  SCORE_SMALL: 100,
  SCORE_MEDIUM: 500,
  SCORE_LARGE: 1000,
  SCORE_BOSS: 5000,
  SCORE_MEDAL: 300,      // 勋章
  SCORE_MICLUS: 3000,    // 西武龙
  SCORE_FAIRY: 10000,    // 精灵
  
  // 道具
  POWER_UP_CHANCE: 0.08,   // 8%掉落P道具
  MEDAL_CHANCE: 0.15,      // 15%掉落勋章
};

// ============================================
// 游戏状态
// ============================================
export enum GameState {
  ATTRACT,      //  attract mode / 演示模式
  MENU,         // 主菜单
  PLAYING,      // 游戏中
  PAUSED,       // 暂停
  GAME_OVER,    // 游戏结束
  STAGE_CLEAR,  // 关卡完成
}

// ============================================
// 实体类型
// ============================================
export enum EntityType {
  PLAYER,
  PLAYER_BULLET_MAIN,   // 主武器子弹
  PLAYER_BULLET_SUB,    // 副武器子弹
  ENEMY_AIR,            // 空中敌人
  ENEMY_GROUND,         // 地面敌人
  ENEMY_BULLET,
  ITEM_RED,             // 红道具 - Vulcan
  ITEM_BLUE,            // 蓝道具 - Laser
  ITEM_M,               // 导弹
  ITEM_H,               // 追踪导弹
  ITEM_P,               // 火力强化
  ITEM_B,               // 炸弹
  ITEM_1UP,             // 加命
  ITEM_MEDAL,           // 勋章
  ITEM_MICLUS,          // 西武龙
  ITEM_FAIRY,           // 精灵
  EXPLOSION,
  EFFECT,
}

// ============================================
// 武器类型 (原版雷电)
// ============================================
export enum WeaponType {
  VULCAN = 'vulcan',    // 红 - 散弹
  LASER = 'laser',      // 蓝 - 激光
}

export enum SubWeaponType {
  NONE = 'none',
  MISSILE = 'missile',  // M - 直线导弹
  HOMING = 'homing',    // H - 追踪导弹
}

// ============================================
// 敌人类型 (原版8关的敌机)
// ============================================
export enum EnemyType {
  // 小型敌机
  FIGHTER_RED = 'fighter_red',       // 红色小型战机
  FIGHTER_BLUE = 'fighter_blue',     // 蓝色小型战机
  FIGHTER_GREEN = 'fighter_green',   // 绿色小型战机
  
  // 中型敌机
  BOMBER_BROWN = 'bomber_brown',     // 棕色轰炸机
  BOMBER_GRAY = 'bomber_gray',       // 灰色轰炸机
  
  // 大型敌机
  GUNSHIP = 'gunship',               // 大型武装直升机
  DESTROYER = 'destroyer',           // 驱逐舰
  
  // 地面单位
  TANK_SMALL = 'tank_small',
  TANK_LARGE = 'tank_large',
  TURRET = 'turret',
  
  // BOSS
  BOSS_1 = 'boss_1',  // 第1关: 大型轰炸机
  BOSS_2 = 'boss_2',  // 第2关: 坦克编队
  BOSS_3 = 'boss_3',  // 第3关: 海上战舰
  BOSS_4 = 'boss_4',  // 第4关: 武装列车
  BOSS_5 = 'boss_5',  // 第5关: 巨型机甲
  BOSS_6 = 'boss_6',  // 第6关: 激光要塞
  BOSS_7 = 'boss_7',  // 第7关: 空中堡垒
  BOSS_8 = 'boss_8',  // 第8关: 最终BOSS
}

// ============================================
// 移动模式
// ============================================
export enum MovePattern {
  STRAIGHT_DOWN = 'straight_down',
  STRAIGHT_UP = 'straight_up',
  SINE_WAVE = 'sine_wave',
  ZIGZAG = 'zigzag',
  CIRCLE = 'circle',
  HOVER = 'hover',
  HOMING = 'homing',
  FORMATION = 'formation',
}

// ============================================
// 弹幕模式
// ============================================
export enum BulletPattern {
  SINGLE = 'single',
  DOUBLE = 'double',
  TRIPLE = 'triple',
  FAN_3 = 'fan_3',
  FAN_5 = 'fan_5',
  CIRCLE_8 = 'circle_8',
  CIRCLE_16 = 'circle_16',
  AIMED = 'aimed',
  SPREAD = 'spread',
  STREAM = 'stream',
  RING = 'ring',
}

// ============================================
// 原版雷电颜色调色板 (基于MAME驱动)
// ============================================
export const PALETTE = {
  // 玩家战机颜色 (原版雷电战机是青蓝色)
  PLAYER_BODY: '#00cccc',      // 机身主色
  PLAYER_WING: '#0088aa',      // 机翼
  PLAYER_COCKPIT: '#ffffff',   // 驾驶舱
  PLAYER_ENGINE: '#00ffff',    // 引擎发光
  
  // 主武器
  VULCAN_BULLET: '#ffff00',    // 散弹 - 黄色
  LASER_CORE: '#ff4444',       // 激光核心 - 红
  LASER_OUTER: '#ff8888',      // 激光外层
  
  // 副武器
  MISSILE_BODY: '#00ff00',     // 导弹 - 绿
  HOMING_TRAIL: '#ff8800',     // 追踪弹尾迹
  
  // 敌人颜色
  ENEMY_RED: '#cc2222',
  ENEMY_BLUE: '#2222cc',
  ENEMY_GREEN: '#22aa22',
  ENEMY_YELLOW: '#cccc22',
  ENEMY_BROWN: '#8b4513',
  ENEMY_GRAY: '#666666',
  ENEMY_DARK: '#333333',
  
  // 敌弹颜色
  ENEMY_BULLET_RED: '#ff4444',
  ENEMY_BULLET_BLUE: '#4444ff',
  ENEMY_BULLET_PINK: '#ff66ff',
  ENEMY_BULLET_ORANGE: '#ff8844',
  
  // 道具颜色
  ITEM_RED_BG: '#cc0000',
  ITEM_BLUE_BG: '#0000cc',
  ITEM_P_GLOW: '#ffaa00',
  ITEM_B_GLOW: '#00ff00',
  ITEM_MEDAL: '#ffd700',
  
  // 爆炸
  EXPLOSION_WHITE: '#ffffff',
  EXPLOSION_YELLOW: '#ffff00',
  EXPLOSION_ORANGE: '#ff8800',
  EXPLOSION_RED: '#ff0000',
  EXPLOSION_DARK: '#440000',
};

// ============================================
// 关卡主题颜色
// ============================================
export const STAGE_THEMES = [
  { name: 'Countryside', bg: '#1a3d1a', ground: '#2d5a2d' },    // 第1关: 乡村
  { name: 'City', bg: '#1a1a3d', ground: '#333333' },           // 第2关: 城市
  { name: 'Ocean', bg: '#0a1a3d', ground: '#003366' },          // 第3关: 海洋
  { name: 'Desert', bg: '#3d2d1a', ground: '#8b7355' },         // 第4关: 沙漠
  { name: 'Forest', bg: '#0d2d0d', ground: '#1a4a1a' },         // 第5关: 森林
  { name: 'Base', bg: '#1a1a1a', ground: '#444444' },           // 第6关: 基地
  { name: 'Sky', bg: '#0a2d4d', ground: '#4d88aa' },            // 第7关: 天空
  { name: 'Space', bg: '#050510', ground: '#1a0a2d' },          // 第8关: 太空
];

// ============================================
// 向量2D
// ============================================
export interface Vector2 {
  x: number;
  y: number;
}

// ============================================
// 边界框
// ============================================
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// 精灵配置 (用于像素画还原)
// ============================================
export const SPRITE_CONFIG = {
  // 玩家战机 (原版尺寸约 24x28)
  PLAYER_WIDTH: 24,
  PLAYER_HEIGHT: 28,
  
  // 小型敌机 (约 16x16)
  ENEMY_SMALL_SIZE: 16,
  
  // 中型敌机 (约 32x28)
  ENEMY_MEDIUM_WIDTH: 32,
  ENEMY_MEDIUM_HEIGHT: 28,
  
  // 大型敌机 (约 48x40)
  ENEMY_LARGE_WIDTH: 48,
  ENEMY_LARGE_HEIGHT: 40,
  
  // 道具 (约 16x16)
  ITEM_SIZE: 16,
  
  // 子弹
  BULLET_PLAYER_WIDTH: 4,
  BULLET_PLAYER_HEIGHT: 12,
  BULLET_ENEMY_SIZE: 8,
};
