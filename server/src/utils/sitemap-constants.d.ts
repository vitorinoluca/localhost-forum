/**
 * Una sola fuente para sitemap (servidor) y build estático (vite-plugins).
 * No indexar flujos de cuenta ni paneles privados.
 */
export declare const SITEMAP_STATIC_ENTRIES: {
    path: string;
    priority: string;
    changefreq: string;
}[];
/** Rutas que no deben aparecer en sitemap.xml (ni como URLs inventadas). */
export declare function isBlockedSitemapPathname(pathname: string): boolean;
/** Líneas Disallow extra para robots.txt (auth y áreas privadas). */
export declare const ROBOTS_DISALLOW_PATHS: readonly ["/login", "/register", "/verify-email", "/profile/edit", "/profile/", "/admin", "/notifications"];
