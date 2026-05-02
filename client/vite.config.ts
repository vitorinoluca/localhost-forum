import react from '@vitejs/plugin-react';
import historyApiFallback from 'connect-history-api-fallback';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import { seoPublicFilesPlugin } from './vite-plugins/seo-public-files';

function spaHistoryFallback(): Plugin {
  const handler = historyApiFallback({
    disableDotRule: true,
    verbose: false,
  });

  function skipHistory(url: string | undefined): boolean {
    if (!url) return true;
    const path = url.split('?')[0] ?? url;
    if (path.startsWith('/api')) return true;
    if (path.startsWith('/@')) return true;
    if (path.startsWith('/node_modules')) return true;
    if (path === '/robots.txt' || path === '/sitemap.xml' || path === '/ads.txt') return true;
    return false;
  }

  return {
    name: 'spa-history-fallback',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (skipHistory(req.url)) return next();
        return handler(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (skipHistory(req.url)) return next();
        return handler(req, res, next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000';

  return {
    appType: 'spa',
    plugins: [seoPublicFilesPlugin(mode), spaHistoryFallback(), react()],
    build: {
      sourcemap: mode !== 'production',
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 120000,
          proxyTimeout: 120000,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 120000,
          proxyTimeout: 120000,
        },
      },
    },
  };
});
