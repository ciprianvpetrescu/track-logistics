import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // main.js loads http://localhost:5173 directly, so the port must not
    // drift. Without strictPort Vite silently falls back to 5174 when 5173
    // is busy and the desktop window comes up blank.
    port: 5173,
    strictPort: true,
  },
})
