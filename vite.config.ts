import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': '/src' } },
  // Proxy /api to FastAPI: same-origin in dev, so no CORS and session cookies just work.
  // Ports come from the launcher (run_strategy_ui.sh), which picks free ones.
  server: {
    port: Number(process.env.FRONTEND_PORT) || 3011,
    strictPort: true,
    host: true,
    proxy: { '/api': `http://localhost:${process.env.BACKEND_PORT || 8010}` },
  },
});
