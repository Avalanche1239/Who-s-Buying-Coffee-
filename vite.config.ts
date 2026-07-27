import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        roulette: 'roulette/index.html',
        ladder: 'ladder/index.html',
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
