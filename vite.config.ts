import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ["gifler"],
  },
  build: {
    commonjsOptions: {
      include: ['/gifler/', '/node_modules/']
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
