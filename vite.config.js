import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 9672,
    host: '0.0.0.0',
    allowedHosts: ['0.0.0.0', 'localhost', '127.0.0.1', 'searchable.city'],
  }
})
