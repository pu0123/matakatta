import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages では https://pu0123.github.io/matakatta/ に置くため、公開用のビルドだけ base を変える
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/matakatta/' : '/',
  plugins: [react()],
}))
