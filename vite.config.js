import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: '/',
  }

  if (command === 'build') {
    // Replace 'your-repository-name' with your actual GitHub repo name
    config.base = '/your-repository-name/'
  }

  return config
})