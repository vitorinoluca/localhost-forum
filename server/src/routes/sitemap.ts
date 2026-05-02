import { Router } from 'express';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

/**
 * Rutas públicas indexables (alineadas con client/src/lib/route.ts).
 * No incluye login, registro, admin, etc.
 */
const STATIC_ENTRIES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/terms', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLastmod(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

export const sitemapRouter = Router();

sitemapRouter.get('/sitemap.xml', async (_request, response) => {
  const base = env.CLIENT_ORIGIN.replace(/\/$/, '');

  let postRows: { id: string; updated_at: Date }[] = [];
  let userRows: { id: string; updated_at: Date }[] = [];

  try {
    const [posts, users] = await Promise.all([
      pool.query<{ id: string; updated_at: Date }>(
        `select id::text as id, updated_at from forum_posts order by updated_at desc limit 2000`,
      ),
      pool.query<{ id: string; updated_at: Date }>(
        `
          select id::text as id, updated_at
          from users
          where banned_at is null
          order by created_at desc
          limit 500
        `,
      ),
    ]);
    postRows = posts.rows;
    userRows = users.rows;
  } catch {
    void undefined;
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const { path: p, priority, changefreq } of STATIC_ENTRIES) {
    const loc = p === '/' ? `${base}/` : `${base}${p}`;
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(loc)}</loc>`);
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    lines.push('  </url>');
  }

  for (const row of postRows) {
    const loc = `${base}/posts/${row.id}`;
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(loc)}</loc>`);
    lines.push(`    <lastmod>${formatLastmod(row.updated_at)}</lastmod>`);
    lines.push('    <changefreq>weekly</changefreq>');
    lines.push('    <priority>0.7</priority>');
    lines.push('  </url>');
  }

  for (const row of userRows) {
    const loc = `${base}/users/${row.id}`;
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(loc)}</loc>`);
    lines.push(`    <lastmod>${formatLastmod(row.updated_at)}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.5</priority>');
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  lines.push('');

  response.type('application/xml; charset=utf-8');
  response.send(lines.join('\n'));
});
