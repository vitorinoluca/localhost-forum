import { Router } from 'express';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import {
  isBlockedSitemapPathname,
  SITEMAP_STATIC_ENTRIES,
} from '../utils/sitemap-constants.js';

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

sitemapRouter.get('/sitemaps.xml', (_request, response) => {
  response.redirect(301, '/sitemap.xml');
});

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

  for (const { path: p, priority, changefreq } of SITEMAP_STATIC_ENTRIES) {
    if (isBlockedSitemapPathname(p)) continue;
    const loc = p === '/' ? `${base}/` : `${base}${p}`;
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(loc)}</loc>`);
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    lines.push('  </url>');
  }

  for (const row of postRows) {
    const loc = `${base}/posts/${row.id}`;
    try {
      if (isBlockedSitemapPathname(new URL(loc).pathname)) continue;
    } catch {
      continue;
    }
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(loc)}</loc>`);
    lines.push(`    <lastmod>${formatLastmod(row.updated_at)}</lastmod>`);
    lines.push('    <changefreq>weekly</changefreq>');
    lines.push('    <priority>0.7</priority>');
    lines.push('  </url>');
  }

  for (const row of userRows) {
    const loc = `${base}/users/${row.id}`;
    try {
      if (isBlockedSitemapPathname(new URL(loc).pathname)) continue;
    } catch {
      continue;
    }
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
