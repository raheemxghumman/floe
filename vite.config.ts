import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Spotify only accepts loopback IPs (not "localhost") as redirect URIs,
// so the dev server is pinned to 127.0.0.1:5173.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
})
