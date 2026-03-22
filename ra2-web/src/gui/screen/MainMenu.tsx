import React from 'react'

interface MainMenuProps {
  onStartGame: () => void
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  return (
    <div 
      className="main-menu"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 
          style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            color: '#c41e3a',
            textShadow: '0 0 20px rgba(196, 30, 58, 0.5)',
            marginBottom: 10,
            letterSpacing: 4,
          }}
        >
          红色警戒2
        </h1>
        
        <p 
          style={{
            fontSize: '1.2rem',
            color: '#888',
            marginBottom: 50,
            letterSpacing: 8,
          }}
        >
          WEB EDITION
        </p>

        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 15,
            minWidth: 250,
          }}
        >
          <button 
            className="ra-button"
            onClick={onStartGame}
            style={{ fontSize: '1.1rem', padding: '15px 30px' }}
          >
            开始游戏
          </button>
          
          <button 
            className="ra-button"
            disabled
            style={{ opacity: 0.5 }}
          >
            多人对战 (开发中)
          </button>
          
          <button 
            className="ra-button"
            disabled
            style={{ opacity: 0.5 }}
          >
            战役模式 (开发中)
          </button>
          
          <button 
            className="ra-button"
            disabled
            style={{ opacity: 0.5 }}
          >
            地图编辑器 (开发中)
          </button>
        </div>

        <div 
          style={{
            marginTop: 60,
            color: '#666',
            fontSize: '0.85rem',
            textAlign: 'center',
            lineHeight: 1.8,
          }}
        >
          <p>基于 TypeScript + React + Three.js 构建</p>
          <p>仅供学习研究使用 | 需要原版游戏资源</p>
          <p style={{ marginTop: 10 }}><a 
            href="https://github.com/electronicarts/CnC_Remastered_Collection"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#888' }}
          >
            EA官方开源项目
          </a></p>
        </div>
      </div>
    </div>
  )
}
