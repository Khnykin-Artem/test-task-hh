import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Относительные пути к ассетам: сборка работает и на корне домена,
  // и в подкаталоге GitHub Pages (/<repo>/).
  base: './',
  server: {
    port: 5173,
    host: true,
  },
})