import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget =
    env.BACKEND_URL ||
    (env.BACKEND_PORT ? `http://localhost:${env.BACKEND_PORT}` : 'http://localhost:8010');

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': '/src' } },
    // Proxy /api to FastAPI: same-origin in dev, so no CORS and session cookies just work.
    // Ports come from the launcher (run_strategy_ui.sh), which picks free ones.
    server: {
      port: Number(process.env.FRONTEND_PORT) || 3011,
      strictPort: true,
      host: true,
      proxy: {
        '/api/scalping_old': {
          target: 'https://172.105.55.70/scalping_old_api',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/scalping_old/, '/api'),
        },
        '/api/scalping_paper': {
          target: 'https://172.105.55.70/scalping_paper_api',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/scalping_paper/, '/api'),
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
