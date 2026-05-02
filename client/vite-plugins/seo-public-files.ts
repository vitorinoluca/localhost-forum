import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { loadEnv } from 'vite';
import {
  ROBOTS_DISALLOW_PATHS,
  SITEMAP_STATIC_ENTRIES,
} from './sitemap-constants';

function trimEnv(mode: string, key: string): string {
  const all = loadEnv(mode, process.cwd(), 'VITE_');
  return (all[key] ?? '').trim();
}

export function buildAdsTxt(mode: string): string | null {
  const client = trimEnv(mode, 'VITE_GOOGLE_ADSENSE_CLIENT');
  if (!client.startsWith('ca-pub-')) return null;
  const pub = client.replace(/^ca-/, '');
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}

export function buildRobotsTxt(mode: string): string {
  const base = trimEnv(mode, 'VITE_SITE_URL').replace(/\/$/, '');
  const lines = ['User-agent: *', 'Allow: /'];
  for (const path of ROBOTS_DISALLOW_PATHS) {
    lines.push(`Disallow: ${path}`);
  }
  lines.push('');
  if (base) {
    lines.push(`Sitemap: ${base}/sitemap.xml`, '');
  }
  return lines.join('\n');
}

export function buildSitemapXml(mode: string): string {
  const base = trimEnv(mode, 'VITE_SITE_URL').replace(/\/$/, '');
  if (!base) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n`;
  }
  const urls = SITEMAP_STATIC_ENTRIES.map(
    ({ path, priority, changefreq }) =>
      `  <url>\n    <loc>${base}${path === '/' ? '/' : path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function seoPublicFilesPlugin(mode: string): Plugin {
  let outDir = 'dist';
  let resolvedMode = mode;

  function serve(
    reqUrl: string | undefined,
    res: { setHeader: (k: string, v: string) => void; end: (b: string) => void },
  ): boolean {
    const pathOnly = reqUrl?.split('?')[0] ?? '';
    if (pathOnly === '/robots.txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(buildRobotsTxt(resolvedMode));
      return true;
    }
    if (pathOnly === '/sitemap.xml') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.end(buildSitemapXml(resolvedMode));
      return true;
    }
    if (pathOnly === '/ads.txt') {
      const ads = buildAdsTxt(resolvedMode);
      if (ads) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(ads);
        return true;
      }
    }
    return false;
  }

  return {
    name: 'seo-public-files',
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
      resolvedMode = config.mode;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (serve(req.url, res)) return;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (serve(req.url, res)) return;
        next();
      });
    },
    closeBundle() {
      const robots = buildRobotsTxt(resolvedMode);
      const sitemap = buildSitemapXml(resolvedMode);
      writeFileSync(join(outDir, 'robots.txt'), robots);
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
      const ads = buildAdsTxt(resolvedMode);
      if (ads) {
        writeFileSync(join(outDir, 'ads.txt'), ads);
      }
    },
  };
}
