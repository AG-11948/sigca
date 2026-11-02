import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En desarrollo, /api y /uploads se redirigen al backend (evita problemas de CORS)
  const destino = env.VITE_BACKEND_URL || 'http://localhost:4000';
  const proxy = { '/api': destino, '/uploads': destino };
  return {
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
