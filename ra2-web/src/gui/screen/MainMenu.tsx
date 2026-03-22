import React, { useState } from 'react'
import { SoundSettings } from '../component/SoundSettings'

interface MainMenuProps {
  onStartGame: () => void
  onStartCampaign: () => void
  onStartMultiplayer: () => void
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onStartCampaign, onStartMultiplayer }) => {
  const [showSoundSettings, setShowSoundSettings] = useState(false)

  return (
    <>
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
              className="ra-button primary"
              onClick={onStartGame}
              style={{ 
                fontSize: '1.1rem', 
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(196, 30, 58, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              开始游戏
            </button>
            
            <button 
              className="ra-button"
              onClick={onStartCampaign}
              style={{ 
                fontSize: '1.1rem', 
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #4169e1 0%, #0000cd 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(65, 105, 225, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              战役模式
            </button>
            
            <button 
              className="ra-button"
              onClick={onStartMultiplayer}
              style={{ 
                fontSize: '1.1rem',
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #228b22 0%, #006400 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(34, 139, 34, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              多人对战
            </button>
            
            <button 
              className="ra-button"
              onClick={() => setShowSoundSettings(true)}
              style={{ 
                fontSize: '1.1rem',
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #ff8c00 0%, #ff6347 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(255, 140, 0, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              🔊 音效设置
            </button>
            
            <button 
              className="ra-button"
              disabled
              style={{ 
                opacity: 0.5,
                fontSize: '1.1rem',
                padding: '15px 30px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#888',
                borderRadius: 8,
              }}
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

      {showSoundSettings && (
        <SoundSettings onClose={() => setShowSoundSettings(false)} />
      )}
    </>
  )
}
