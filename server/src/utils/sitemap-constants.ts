export const SITEMAP_STATIC_ENTRIES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/terms', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
];

export function isBlockedSitemapPathname(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  if (
    p === '/login' ||
    p === '/register' ||
    p === '/verify-email' ||
    p === '/profile/edit' ||
    p === '/admin' ||
    p === '/notifications'
  ) {
    return true;
  }
  if (p.startsWith('/profile/') || p.startsWith('/admin')) {
    return true;
  }
  return false;
}

export const ROBOTS_DISALLOW_PATHS = [
  '/login',
  '/register',
  '/verify-email',
  '/profile/edit',
  '/profile/',
  '/admin',
  '/notifications',
] as const;
