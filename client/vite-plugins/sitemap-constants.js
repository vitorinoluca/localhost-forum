/**
 * Copia de server/src/utils/sitemap-constants.ts — mantener ambos archivos alineados.
 */
export var SITEMAP_STATIC_ENTRIES = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/terms', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
];
export function isBlockedSitemapPathname(pathname) {
    var p = pathname.replace(/\/$/, '') || '/';
    if (p === '/login' ||
        p === '/register' ||
        p === '/verify-email' ||
        p === '/profile/edit' ||
        p === '/admin' ||
        p === '/notifications') {
        return true;
    }
    if (p.startsWith('/profile/') || p.startsWith('/admin')) {
        return true;
    }
    return false;
}
export var ROBOTS_DISALLOW_PATHS = [
    '/login',
    '/register',
    '/verify-email',
    '/profile/edit',
    '/profile/',
    '/admin',
    '/notifications',
];
