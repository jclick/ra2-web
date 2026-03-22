import React from 'react'

interface LoadingScreenProps {
  text: string
  progress: number
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  text,
  progress,
}) => {
  return (
    <div className="loading-container">
      <div style={{ textAlign: 'center' }}>
        <div 
          style={{
            width: 80,
            height: 80,
            border: '4px solid #333',
            borderTopColor: '#c41e3a',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 30px',
          }}
        />
        
        <h2 style={{ 
          color: '#fff',
          marginBottom: 20,
          fontWeight: 'bold',
        }}>
          {text}
        </h2>
        
        <div className="loading-bar">
          <div 
            className="loading-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        
        <p style={{ color: '#888', marginTop: 10 }}>
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  )
}
