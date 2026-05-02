/**
 * Una sola fuente para sitemap (servidor) y build estático (vite-plugins).
 * No indexar flujos de cuenta ni paneles privados.
 */
export var SITEMAP_STATIC_ENTRIES = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/terms', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
];
/** Rutas que no deben aparecer en sitemap.xml (ni como URLs inventadas). */
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
/** Líneas Disallow extra para robots.txt (auth y áreas privadas). */
export var ROBOTS_DISALLOW_PATHS = [
    '/login',
    '/register',
    '/verify-email',
    '/profile/edit',
    '/profile/',
    '/admin',
    '/notifications',
];
