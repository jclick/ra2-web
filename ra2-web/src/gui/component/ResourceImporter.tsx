import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ResourceManager } from '../../engine/gameRes/ResourceManager'

interface ResourceImporterProps {
  onImportComplete: (resourceManager: ResourceManager) => void
  onCancel: () => void
}

export const ResourceImporter: React.FC<ResourceImporterProps> = ({
  onImportComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<'select' | 'importing' | 'complete' | 'error'>('select')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [stats, setStats] = useState({
    mixFiles: 0,
    iniFiles: 0,
    palFiles: 0,
    shpFiles: 0,
    total: 0,
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resourceManagerRef = useRef<ResourceManager>(new ResourceManager())

  // 监听资源管理器的加载进度
  useEffect(() => {
    resourceManagerRef.current.onLoading((p, text) => {
      setProgress(p)
      setStatus(text)
    })
  }, [])

  // 加载本地测试资源
  const loadLocalResources = useCallback(async () => {
    setStep('importing')
    setStatus('正在加载本地资源...')
    setProgress(0)
    
    try {
      // 尝试加载本地的INI文件
      const iniFiles = ['rules.ini', 'rulesmd.ini']
      
      for (let i = 0; i < iniFiles.length; i++) {
        const fileName = iniFiles[i]
        setStatus(`正在加载: ${fileName}`)
        
        try {
          const response = await fetch(`/assets/ini/${fileName}`)
          if (response.ok) {
            const blob = await response.blob()
            const file = new File([blob], fileName, { type: 'text/plain' })
            await resourceManagerRef.current.importFile(file)
          }
        } catch (e) {
          console.warn(`无法加载 ${fileName}:`, e)
        }
        
        setProgress(((i + 1) / iniFiles.length) * 50)
      }
      
      // 加载调色板
      setStatus('正在加载调色板...')
      const palFiles = ['unittem.pal', 'unitsno.pal', 'uniturb.pal']
      
      for (let i = 0; i < palFiles.length; i++) {
        const fileName = palFiles[i]
        
        try {
          const response = await fetch(`/assets/palettes/${fileName}`)
          if (response.ok) {
            const blob = await response.blob()
            const file = new File([blob], fileName, { type: 'application/octet-stream' })
            await resourceManagerRef.current.importFile(file)
          }
        } catch (e) {
          console.warn(`无法加载 ${fileName}:`, e)
        }
        
        setProgress(50 + ((i + 1) / palFiles.length) * 50)
      }
      
      // 更新统计
      const rmStats = resourceManagerRef.current.getStats()
      setStats({
        mixFiles: rmStats.mixFiles,
        iniFiles: 2,
        palFiles: 3,
        shpFiles: rmStats.shpFiles,
        total: rmStats.resources,
      })
      
      setStep('complete')
      setProgress(100)
      setStatus('资源加载完成！')
    } catch (error) {
      console.error('加载本地资源失败:', error)
      setStep('error')
      setStatus('加载失败: ' + error)
    }
  }, [])

  // 导入用户选择的文件
  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setStep('importing')
    setProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setStatus(`正在导入: ${file.name} (${i + 1}/${selectedFiles.length})`)
        setProgress((i / selectedFiles.length) * 100)
        
        await resourceManagerRef.current.importFile(file)
      }

      setProgress(100)
      
      // 更新统计
      const rmStats = resourceManagerRef.current.getStats()
      setStats({
        mixFiles: rmStats.mixFiles,
        iniFiles: rmStats.resources - rmStats.mixFiles - rmStats.palettes - rmStats.shpFiles,
        palFiles: rmStats.palettes,
        shpFiles: rmStats.shpFiles,
        total: rmStats.resources,
      })
      
      setStep('complete')
      setStatus('导入完成！')
    } catch (error) {
      console.error('导入失败:', error)
      setStep('error')
      setStatus('导入失败: ' + error)
    }
  }, [selectedFiles])

  // 完成并进入游戏
  const handleComplete = useCallback(() => {
    onImportComplete(resourceManagerRef.current)
  }, [onImportComplete])

  // 拖放处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files: File[] = []
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
    } else {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i])
      }
    }
    setSelectedFiles(prev => [...prev, ...files])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }, [])

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'mix': return '📦'
      case 'shp': return '🖼️'
      case 'vxl': return '🧊'
      case 'pal': return '🎨'
      case 'ini': return '📄'
      case 'map': return '🗺️'
      case 'wav': return '🔊'
      default: return '📄'
    }
  }

  // 步骤1: 选择资源
  if (step === 'select') {
    return (
      <div className="importer-container">
        <div className="ra-panel" style={{ maxWidth: 700, margin: '40px auto' }}>
          <h1 className="ra-panel-title">导入游戏资源</h1>
          
          <p style={{ marginBottom: 20, lineHeight: 1.6, color: '#ccc' }}>
            请选择如何加载游戏资源。
            <br />
            如果你有原版红警2文件，可以拖放导入；否则可以使用内置的测试资源。
          </p>

          {/* 选项1: 使用测试资源 */}
          <div 
            style={{
              border: '2px solid #4CAF50',
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              background: 'rgba(76, 175, 80, 0.1)',
              cursor: 'pointer',
            }}
            onClick={loadLocalResources}
          >
            <h3 style={{ marginBottom: 10, color: '#4CAF50' }}>✓ 使用测试资源 (推荐)</h3>
            <p style={{ color: '#aaa', fontSize: 14 }}>
              使用内置的规则文件(INI)和调色板开始游戏。
              <br />
              单位将显示为占位图形。
            </p>
          </div>

          {/* 选项2: 拖放导入 */}
          <div 
            style={{
              border: '2px dashed #666',
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <h3 style={{ marginBottom: 10 }}>📁 导入原版资源</h3>
            <p style={{ color: '#aaa', fontSize: 14, marginBottom: 15 }}>
              如果你有 ra2.mix、language.mix 等原版文件，拖放到此处。
            </p>
            
            {selectedFiles.length > 0 && (
              <div style={{ 
                maxHeight: 150, 
                overflowY: 'auto',
                border: '1px solid #333',
                borderRadius: 4,
                marginBottom: 15,
              }}>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: '1px solid #333',
                      background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{getFileIcon(file.name)}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                    <span style={{ color: '#888', marginRight: 12, fontSize: 12 }}>
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        background: '#f44336',
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <button className="ra-button" onClick={handleBrowseClick}>
              浏览文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".mix,.shp,.vxl,.hva,.tmp,.pcx,.wav,.ini,.map,.pal"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          {/* 按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button className="ra-button ra-button-secondary" onClick={onCancel}>
              返回主菜单
            </button>
            <button 
              className="ra-button" 
              onClick={handleImport}
              disabled={selectedFiles.length === 0}
            >
              开始导入 ({selectedFiles.length})
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤2: 导入中
  if (step === 'importing') {
    return (
      <div className="importer-container">
        <div className="ra-panel" style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center' }}>
          <h1 className="ra-panel-title">正在处理...</h1>
          
          <div style={{ margin: '30px 0' }}>
            <div style={{ marginBottom: 15, color: '#aaa' }}>{status}</div>
            
            <div
              style={{
                width: '100%',
                height: 12,
                background: '#333',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            
            <div style={{ marginTop: 10, fontSize: 18, color: '#4CAF50' }}>
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 步骤3: 完成
  if (step === 'complete') {
    return (
      <div className="importer-container">
        <div className="ra-panel" style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
          <h1 className="ra-panel-title">✓ 资源就绪</h1>
          
          <div style={{ margin: '30px 0', textAlign: 'left' }}>
            <h3 style={{ marginBottom: 15, textAlign: 'center' }}>已加载资源</h3>
            
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: 8, 
              padding: 20,
              lineHeight: 2,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📦 MIX 资源包</span>
                <span style={{ color: stats.mixFiles > 0 ? '#4CAF50' : '#888' }}>
                  {stats.mixFiles > 0 ? stats.mixFiles + ' 个' : '无'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📄 INI 规则文件</span>
                <span style={{ color: stats.iniFiles > 0 ? '#4CAF50' : '#888' }}>
                  {stats.iniFiles > 0 ? stats.iniFiles + ' 个' : '无'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🎨 调色板</span>
                <span style={{ color: stats.palFiles > 0 ? '#4CAF50' : '#888' }}>
                  {stats.palFiles > 0 ? stats.palFiles + ' 个' : '无'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🖼️ SHP 图像</span>
                <span style={{ color: stats.shpFiles > 0 ? '#4CAF50' : '#888' }}>
                  {stats.shpFiles > 0 ? stats.shpFiles + ' 个' : '无'}
                </span>
              </div>
              
              <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>总计</span>
                  <span style={{ color: '#4CAF50' }}>{stats.total} 个文件</span>
                </div>
              </div>
            </div>
            
            {stats.mixFiles === 0 && (
              <div style={{ 
                marginTop: 20, 
                padding: 15, 
                background: 'rgba(255, 152, 0, 0.1)', 
                border: '1px solid #FF9800',
                borderRadius: 8,
                color: '#FF9800',
                fontSize: 14,
              }}>
                ⚠️ 未检测到MIX资源文件，游戏将使用占位图形显示。
                <br />
                所有游戏功能正常工作，只是缺少原版图像和音效。
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button className="ra-button ra-button-secondary" onClick={() => setStep('select')}>
              返回
            </button>
            <button className="ra-button" onClick={handleComplete} style={{ fontSize: 18, padding: '12px 30px' }}>
              开始游戏 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤4: 错误
  if (step === 'error') {
    return (
      <div className="importer-container">
        <div className="ra-panel" style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center' }}>
          <h1 className="ra-panel-title" style={{ color: '#f44336' }}>✗ 出错了</h1>
          
          <div style={{ margin: '30px 0', color: '#f44336' }}>
            {status}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button className="ra-button ra-button-secondary" onClick={() => setStep('select')}>
              返回
            </button>
            <button className="ra-button" onClick={onCancel}>
              返回主菜单
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default ResourceImporter
