import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite build --mode static` → browser-only build (relative asset paths, see .env.static).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'static' ? './' : '/',
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
}));
