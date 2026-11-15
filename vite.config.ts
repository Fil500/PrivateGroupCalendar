import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Erzeugt /manifest.webmanifest aus den Bezeichnungen in .env bzw. .env.local. */
function manifest(env: Record<string, string>): Plugin {
  const json = JSON.stringify(
    {
      name: env.VITE_APP_NAME || 'Gruppenkalender',
      short_name: env.VITE_APP_SHORT_NAME || 'Kalender',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#f43f5e',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
    null,
    2,
  );
  return {
    name: 'app-manifest',
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('content-type', 'application/manifest+json');
        res.end(json);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: json });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), manifest(loadEnv(mode, process.cwd()))],
  server: {
    // `npm run dev:api` startet die Pages Functions + lokale D1 auf Port 8788
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
}));
