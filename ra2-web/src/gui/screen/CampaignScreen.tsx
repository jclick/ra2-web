import { useState } from 'react'
import './CampaignScreen.css'

// RA2 阵营和国家
const ALLIES = [
  { id: 'america', name: '美国', flag: '🇺🇸', color: '#4169E1' },
  { id: 'germany', name: '德国', flag: '🇩🇪', color: '#FFD700' },
  { id: 'korea', name: '韩国', flag: '🇰🇷', color: '#FF4500' },
  { id: 'france', name: '法国', flag: '🇫🇷', color: '#87CEEB' },
  { id: 'england', name: '英国', flag: '🇬🇧', color: '#DC143C' },
]

const SOVIETS = [
  { id: 'russia', name: '俄国', flag: '🇷🇺', color: '#DC143C' },
  { id: 'iraq', name: '伊拉克', flag: '🇮🇶', color: '#228B22' },
  { id: 'cuba', name: '古巴', flag: '🇨🇺', color: '#8B4513' },
  { id: 'libya', name: '利比亚', flag: '🇱🇾', color: '#32CD32' },
]

// AI 难度
const DIFFICULTIES = [
  { id: 'easy', name: '简单', color: '#32CD32' },
  { id: 'medium', name: '中等', color: '#FFD700' },
  { id: 'hard', name: '困难', color: '#FF4500' },
  { id: 'brutal', name: '冷酷', color: '#DC143C' },
]

// 地图列表
const MAPS = [
  { id: 'snow', name: '冰雪世界', size: '2人', type: '雪地' },
  { id: 'temperate', name: '温带草原', size: '2人', type: '草地' },
  { id: 'urban', name: '城市废墟', size: '2人', type: '城市' },
  { id: 'desert', name: '沙漠风暴', size: '2人', type: '沙漠' },
]

interface CampaignScreenProps {
  onStartCampaign: (config: CampaignConfig) => void
  onCancel: () => void
}

export interface CampaignConfig {
  playerCountry: string
  opponentCountry: string
  difficulty: string
  map: string
}

export function CampaignScreen({ onStartCampaign, onCancel }: CampaignScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [playerCountry, setPlayerCountry] = useState<string>('')
  const [opponentCountry, setOpponentCountry] = useState<string>('')
  const [difficulty, setDifficulty] = useState<string>('medium')
  const [selectedMap, setSelectedMap] = useState<string>('snow')

  const handleCountrySelect = (countryId: string) => {
    setPlayerCountry(countryId)
    setStep(2)
  }

  const handleOpponentSelect = (countryId: string) => {
    setOpponentCountry(countryId)
    setStep(3)
  }

  const handleStart = () => {
    onStartCampaign({
      playerCountry,
      opponentCountry,
      difficulty,
      map: selectedMap,
    })
  }

  // 步骤 1: 选择国家
  if (step === 1) {
    return (
      <div className="campaign-screen">
        <h1>选择你的国家</h1>
        
        <div className="faction-section">
          <h2>🛡️ 盟军</h2>
          <div className="country-grid">
            {ALLIES.map(country => (
              <button
                key={country.id}
                className="country-card allies"
                style={{ '--country-color': country.color } as React.CSSProperties}
                onClick={() => handleCountrySelect(country.id)}
              >
                <span className="flag">{country.flag}</span>
                <span className="name">{country.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="faction-section">
          <h2>☭ 苏军</h2>
          <div className="country-grid">
            {SOVIETS.map(country => (
              <button
                key={country.id}
                className="country-card soviets"
                style={{ '--country-color': country.color } as React.CSSProperties}
                onClick={() => handleCountrySelect(country.id)}
              >
                <span className="flag">{country.flag}</span>
                <span className="name">{country.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="back-btn" onClick={onCancel}>返回</button>
      </div>
    )
  }

  // 步骤 2: 选择对手
  if (step === 2) {
    const isPlayerAllied = ALLIES.some(c => c.id === playerCountry)
    const opponents = isPlayerAllied ? SOVIETS : ALLIES
    const playerName = [...ALLIES, ...SOVIETS].find(c => c.id === playerCountry)?.name

    return (
      <div className="campaign-screen">
        <h1>选择对手</h1>
        
        <div className="selected-info">
          <p>你选择了: <strong>{playerName}</strong></p>
        </div>

        <div className="opponent-section">
          <h2>选择敌人</h2>
          <div className="country-grid">
            {opponents.map(country => (
              <button
                key={country.id}
                className={`country-card ${isPlayerAllied ? 'soviets' : 'allies'}`}
                style={{ '--country-color': country.color } as React.CSSProperties}
                onClick={() => handleOpponentSelect(country.id)}
              >
                <span className="flag">{country.flag}</span>
                <span className="name">{country.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="difficulty-section">
          <h3>难度</h3>
          <div className="difficulty-grid">
            {DIFFICULTIES.map(diff => (
              <button
                key={diff.id}
                className={`difficulty-btn ${difficulty === diff.id ? 'selected' : ''}`}
                style={{ color: diff.color }}
                onClick={() => setDifficulty(diff.id)}
              >
                {diff.name}
              </button>
            ))}
          </div>
        </div>

        <div className="button-row">
          <button className="back-btn" onClick={() => setStep(1)}>上一步</button>
        </div>
      </div>
    )
  }

  // 步骤 3: 选择地图
  const playerName = [...ALLIES, ...SOVIETS].find(c => c.id === playerCountry)?.name
  const opponentName = [...ALLIES, ...SOVIETS].find(c => c.id === opponentCountry)?.name
  const difficultyName = DIFFICULTIES.find(d => d.id === difficulty)?.name

  return (
    <div className="campaign-screen">
      <h1>选择战场</h1>
      
      <div className="summary">
        <div className="summary-item">
          <span className="label">你:</span>
          <span className="value">{playerName}</span>
        </div>
        <div className="summary-item">
          <span className="label">对手:</span>
          <span className="value">{opponentName}</span>
        </div>
        <div className="summary-item">
          <span className="label">难度:</span>
          <span className={`value difficulty-${difficulty}`}>{difficultyName}</span>
        </div>
      </div>

      <div className="map-section">
        <h2>选择地图</h2>
        <div className="map-grid">
          {MAPS.map(map => (
            <button
              key={map.id}
              className={`map-card ${selectedMap === map.id ? 'selected' : ''}`}
              onClick={() => setSelectedMap(map.id)}
            >
              <div className="map-preview"></div>
              <div className="map-info">
                <span className="map-name">{map.name}</span>
                <span className="map-details">{map.size} · {map.type}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="button-row">
        <button className="back-btn" onClick={() => setStep(2)}>上一步</button>
        <button className="start-btn" onClick={handleStart}>开始战役</button>
      </div>
    </div>
  )
}
