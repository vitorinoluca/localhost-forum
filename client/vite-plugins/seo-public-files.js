import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { ROBOTS_DISALLOW_PATHS, SITEMAP_STATIC_ENTRIES, } from './sitemap-constants';
function trimEnv(mode, key) {
    var _a;
    var all = loadEnv(mode, process.cwd(), 'VITE_');
    return ((_a = all[key]) !== null && _a !== void 0 ? _a : '').trim();
}
export function buildAdsTxt(mode) {
    var client = trimEnv(mode, 'VITE_GOOGLE_ADSENSE_CLIENT');
    if (!client.startsWith('ca-pub-'))
        return null;
    var pub = client.replace(/^ca-/, '');
    return "google.com, ".concat(pub, ", DIRECT, f08c47fec0942fa0\n");
}
export function buildRobotsTxt(mode) {
    var base = trimEnv(mode, 'VITE_SITE_URL').replace(/\/$/, '');
    var lines = ['User-agent: *', 'Allow: /'];
    for (var _i = 0, ROBOTS_DISALLOW_PATHS_1 = ROBOTS_DISALLOW_PATHS; _i < ROBOTS_DISALLOW_PATHS_1.length; _i++) {
        var path = ROBOTS_DISALLOW_PATHS_1[_i];
        lines.push("Disallow: ".concat(path));
    }
    lines.push('');
    if (base) {
        lines.push("Sitemap: ".concat(base, "/sitemap.xml"), '');
    }
    return lines.join('\n');
}
export function buildSitemapXml(mode) {
    var base = trimEnv(mode, 'VITE_SITE_URL').replace(/\/$/, '');
    if (!base) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"/>\n";
    }
    var urls = SITEMAP_STATIC_ENTRIES.map(function (_a) {
        var path = _a.path, priority = _a.priority, changefreq = _a.changefreq;
        return "  <url>\n    <loc>".concat(base).concat(path === '/' ? '/' : path, "</loc>\n    <changefreq>").concat(changefreq, "</changefreq>\n    <priority>").concat(priority, "</priority>\n  </url>");
    }).join('\n');
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n".concat(urls, "\n</urlset>\n");
}
export function seoPublicFilesPlugin(mode) {
    var outDir = 'dist';
    var resolvedMode = mode;
    function serve(reqUrl, res) {
        var _a;
        var pathOnly = (_a = reqUrl === null || reqUrl === void 0 ? void 0 : reqUrl.split('?')[0]) !== null && _a !== void 0 ? _a : '';
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
            var ads = buildAdsTxt(resolvedMode);
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
        configResolved: function (config) {
            outDir = config.build.outDir;
            resolvedMode = config.mode;
        },
        configureServer: function (server) {
            server.middlewares.use(function (req, res, next) {
                if (serve(req.url, res))
                    return;
                next();
            });
        },
        configurePreviewServer: function (server) {
            server.middlewares.use(function (req, res, next) {
                if (serve(req.url, res))
                    return;
                next();
            });
        },
        closeBundle: function () {
            var robots = buildRobotsTxt(resolvedMode);
            var sitemap = buildSitemapXml(resolvedMode);
            writeFileSync(join(outDir, 'robots.txt'), robots);
            writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
            var ads = buildAdsTxt(resolvedMode);
            if (ads) {
                writeFileSync(join(outDir, 'ads.txt'), ads);
            }
        },
    };
}
