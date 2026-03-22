import { Game } from './Game';

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  new Game('game-canvas');
  console.log('雷电 - Raiden Arcade Replica v1.0');
  console.log('Original by SEIBU KAIHATSU © 1990');
  console.log('Replica built with OpenClaw');
});

// 防止右键菜单
document.addEventListener('contextmenu', (e) => e.preventDefault());

// 防止空格滚动页面
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
  }
});