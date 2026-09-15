/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const prId = process.env.VERCEL_GIT_PULL_REQUEST_ID?.trim();
  const prBackendUrl = prId
    ? `https://adile-bakery-erp-adile-bakery-erp-pr-${prId}.up.railway.app/api`
    : undefined;

  return {
    plugins: [react()],
    ...(prBackendUrl && {
      define: {
        'import.meta.env.VITE_API_URL': JSON.stringify(prBackendUrl),
      },
    }),
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
})
