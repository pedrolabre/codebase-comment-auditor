import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 3000
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    globals: false,
    testTimeout: 20000,
    isolate: false
  }
})
