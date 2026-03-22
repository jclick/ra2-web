import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ResourceManager } from '../../engine/gameRes/ResourceManager'

interface FileImporterProps {
  onImportComplete: (resourceManager: ResourceManager) => void
  onCancel: () => void
}

export const FileImporter: React.FC<FileImporterProps> = ({
  onImportComplete,
  onCancel,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resourceManagerRef = useRef<ResourceManager>(new ResourceManager())

  // 监听资源管理器的加载进度
  useEffect(() => {
    resourceManagerRef.current.onLoading((p, text) => {
      setProgress(p)
      setStatus(text)
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

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

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setIsImporting(true)
    setProgress(0)
    setStatus('开始导入...')

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setStatus(`正在导入: ${file.name} (${i + 1}/${selectedFiles.length})`)
        setProgress((i / selectedFiles.length) * 100)
        
        await resourceManagerRef.current.importFile(file)
      }

      setProgress(100)
      setStatus('导入完成！')
      
      // 显示统计信息
      const stats = resourceManagerRef.current.getStats()
      console.log('导入统计:', stats)
      
      // 延迟后通知完成
      setTimeout(() => {
        onImportComplete(resourceManagerRef.current)
      }, 500)
    } catch (error) {
      setStatus(`导入失败: ${error}`)
      console.error('导入失败:', error)
    } finally {
      setIsImporting(false)
    }
  }, [selectedFiles, onImportComplete])

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

  return (
    <div className="importer-container">
      <div className="ra-panel" style={{ maxWidth: 700, margin: '40px auto' }}>
        <h1 className="ra-panel-title">导入游戏资源</h1>
        
        <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
          请将红色警戒2的游戏文件拖放到下方，或点击浏览按钮选择文件。
          <br />
          支持的文件类型：MIX, SHP, VXL, PAL, INI, MAP 等
        </p>

        {/* 拖放区域 */}
        <div
          className={`drop-zone ${isDragging ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#4CAF50' : '#666'}`,
            borderRadius: 8,
            padding: 40,
            textAlign: 'center',
            background: isDragging ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 10 }}>📁</div>
          <p>将文件拖放到此处</p>
          <p style={{ color: '#888', marginTop: 10 }}>或</p>
          <button 
            className="ra-button" 
            onClick={handleBrowseClick}
            disabled={isImporting}
          >
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

        {/* 文件列表 */}
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 10 }}>已选择的文件 ({selectedFiles.length})</h3>
            <div 
              style={{ 
                maxHeight: 200, 
                overflowY: 'auto',
                border: '1px solid #333',
                borderRadius: 4,
              }}
            >
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
                    disabled={isImporting}
                    style={{
                      background: '#f44336',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      padding: '4px 8px',
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                    }}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 进度显示 */}
        {isImporting && (
          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8 }}>{status}</div>
            <div
              style={{
                width: '100%',
                height: 8,
                background: '#333',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#4CAF50',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#888' }}>
              {Math.round(progress)}%
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: 20,
            gap: 10,
          }}
        >
          <button 
            className="ra-button ra-button-secondary" 
            onClick={onCancel}
            disabled={isImporting}
          >
            取消
          </button>
          <button 
            className="ra-button" 
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || isImporting}
          >
            {isImporting ? '导入中...' : `开始导入 (${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FileImporter
