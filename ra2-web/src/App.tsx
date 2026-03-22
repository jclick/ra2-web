import { useState, useCallback } from 'react'
import { GameEngine } from './engine/Engine'
import { ResourceManager } from './engine/gameRes/ResourceManager'
import { ResourceImporter } from './gui/component/ResourceImporter'
import { LoadingScreen } from './gui/component/LoadingScreen'
import { MainMenu } from './gui/screen/MainMenu'
import { GameCanvas } from './gui/component/GameCanvas'

type AppState = 'menu' | 'loading' | 'game' | 'import'

function App() {
  const [appState, setAppState] = useState<AppState>('menu')
  const [loadingText, setLoadingText] = useState('初始化...')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [engine, setEngine] = useState<GameEngine | null>(null)

  const handleImportComplete = useCallback(async (rm: ResourceManager) => {
    setAppState('loading')
    setLoadingText('正在初始化游戏引擎...')
    
    try {
      // 初始化游戏引擎
      const gameEngine = new GameEngine(rm)
      await gameEngine.initialize()
      
      setLoadingProgress(100)
      setEngine(gameEngine)
      setAppState('game')
    } catch (error) {
      console.error('初始化失败:', error)
      alert('游戏初始化失败: ' + (error as Error).message)
      setAppState('menu')
    }
  }, [])

  const handleStartGame = useCallback(() => {
    setAppState('import')
  }, [])

  const handleBackToMenu = useCallback(() => {
    setAppState('menu')
    if (engine) {
      engine.dispose()
      setEngine(null)
    }
  }, [engine])

  return (
    <div className="app">
      {appState === 'menu' && (
        <MainMenu onStartGame={handleStartGame} />
      )}

      {appState === 'import' && (
        <ResourceImporter 
          onImportComplete={handleImportComplete}
          onCancel={() => setAppState('menu')}
        />
      )}

      {appState === 'loading' && (
        <LoadingScreen 
          text={loadingText}
          progress={loadingProgress}
        />
      )}

      {appState === 'game' && engine && (
        <GameCanvas 
          engine={engine}
          onExit={handleBackToMenu}
        />
      )}
    </div>
  )
}

export default App
