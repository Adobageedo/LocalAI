import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose sur toutes les adresses réseau
    port: 5173,
    strictPort: true,
    hmr: {
      // Options Hot Module Replacement pour améliorer la stabilité
      clientPort: 5173,
      overlay: true,
      timeout: 5000,
    },
    proxy: {
      // Configuration du proxy pour rediriger les requêtes /api vers le backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
