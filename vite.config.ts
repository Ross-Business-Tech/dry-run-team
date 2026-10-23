import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/storage/**', 'src/config/**'],
      exclude: ['**/*.test.ts'],
      // Gate only the pure logic and storage: UI is covered by Playwright instead.
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
  },
})
