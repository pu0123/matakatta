import { defineConfig } from 'vitest/config'

process.env.TZ = 'Asia/Tokyo'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'functions/**/*.test.ts'],
  },
})
