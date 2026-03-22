import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@game': path.resolve(__dirname, './src/game'),
      '@gui': path.resolve(__dirname, './src/gui'),
      '@data': path.resolve(__dirname, './src/data'),
      '@network': path.resolve(__dirname, './src/network'),
      '@util': path.resolve(__dirname, './src/util'),
    },
  },
  server: {
    port: 4000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three', '@react-three/fiber'],
          'react': ['react', 'react-dom'],
        },
      },
    },
  },
})
