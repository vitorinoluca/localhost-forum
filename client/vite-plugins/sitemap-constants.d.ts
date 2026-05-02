/**
 * Copia de server/src/utils/sitemap-constants.ts — mantener ambos archivos alineados.
 */
export declare const SITEMAP_STATIC_ENTRIES: {
    path: string;
    priority: string;
    changefreq: string;
}[];
export declare function isBlockedSitemapPathname(pathname: string): boolean;
export declare const ROBOTS_DISALLOW_PATHS: readonly ["/login", "/register", "/verify-email", "/profile/edit", "/profile/", "/admin", "/notifications"];
