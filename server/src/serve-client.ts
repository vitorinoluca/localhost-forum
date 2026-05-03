import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';

function defaultClientDistPath(): string {
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const serverPackageRoot = path.resolve(serverDir, '..');
  const repoRoot = path.resolve(serverPackageRoot, '..');
  return path.join(repoRoot, 'client', 'dist');
}

export function attachClientSpaIfPresent(
  app: Express,
  options: { explicitDistPath?: string | undefined } = {},
): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const distPath = options.explicitDistPath
    ? path.resolve(options.explicitDistPath)
    : defaultClientDistPath();

  if (!existsSync(distPath)) {
    return;
  }

  app.use(express.static(distPath, { index: false }));

  const noSpaFallback = new Set(['/sitemap.xml', '/sitemaps.xml', '/robots.txt', '/ads.txt']);

  app.use((request, response, next) => {
    if (request.method !== 'GET') {
      next();
      return;
    }
    if (request.path.startsWith('/api')) {
      response.status(404).json({ message: 'No encontrado.' });
      return;
    }
    if (noSpaFallback.has(request.path)) {
      response.status(404).type('text/plain').send('Not found');
      return;
    }

    response.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });

  console.info(`[spa] Sirviendo cliente desde ${distPath}`);
}
