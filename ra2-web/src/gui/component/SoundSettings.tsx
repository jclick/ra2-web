import { useState, useEffect } from 'react'
import './SoundSettings.css'
import { getSoundManager } from '../../game/audio/SoundManager'

interface SoundSettingsProps {
  onClose: () => void
}

export function SoundSettings({ onClose }: SoundSettingsProps) {
  const [initialized, setInitialized] = useState(false)
  const [bgmVolume, setBgmVolume] = useState(50)
  const [sfxVolume, setSfxVolume] = useState(80)
  const [evaVolume, setEvaVolume] = useState(100)
  const [muted, setMuted] = useState(false)

  const soundManager = getSoundManager()

  useEffect(() => {
    // 初始化音频系统
    soundManager.initialize().then(success => {
      setInitialized(success)
    })
  }, [soundManager])

  const handleBgmChange = (value: number) => {
    setBgmVolume(value)
    soundManager.setBgmVolume(value / 100)
  }

  const handleSfxChange = (value: number) => {
    setSfxVolume(value)
    soundManager.setSfxVolume(value / 100)
  }

  const handleEvaChange = (value: number) => {
    setEvaVolume(value)
    soundManager.setEvaVolume(value / 100)
  }

  const handleMuteToggle = () => {
    const newMuted = !muted
    setMuted(newMuted)
    soundManager.setMuted(newMuted)
  }

  const handleTestSound = () => {
    soundManager.playClick()
  }

  const handleTestAlert = () => {
    soundManager.playAlert()
  }

  return (
    <div className="sound-settings-overlay">
      <div className="sound-settings-panel">
        <h2>🔊 音效设置</h2>
        
        {!initialized && (
          <div className="warning">
            音频系统初始化失败，请检查浏览器设置
          </div>
        )}

        <div className="volume-control">
          <label>
            <span>背景音乐</span>
            <span>{bgmVolume}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={bgmVolume}
            onChange={(e) => handleBgmChange(Number(e.target.value))}
            disabled={muted}
          />
        </div>

        <div className="volume-control">
          <label>
            <span>游戏音效</span>
            <span>{sfxVolume}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVolume}
            onChange={(e) => handleSfxChange(Number(e.target.value))}
            disabled={muted}
          />
        </div>

        <div className="volume-control">
          <label>
            <span>语音 (EVA)</span>
            <span>{evaVolume}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={evaVolume}
            onChange={(e) => handleEvaChange(Number(e.target.value))}
            disabled={muted}
          />
        </div>

        <div className="mute-toggle">
          <button
            className={`mute-btn ${muted ? 'muted' : ''}`}
            onClick={handleMuteToggle}
          >
            {muted ? '🔇 已静音' : '🔊 声音开启'}
          </button>
        </div>

        <div className="test-sounds">
          <h4>测试音效</h4>
          <div className="test-buttons">
            <button onClick={handleTestSound} disabled={muted}>
              点击音效
            </button>
            <button onClick={handleTestAlert} disabled={muted}>
              警告音效
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button className="close-btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
