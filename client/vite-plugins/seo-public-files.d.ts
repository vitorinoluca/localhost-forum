import type { Plugin } from 'vite';
export declare function buildAdsTxt(mode: string): string | null;
export declare function buildRobotsTxt(mode: string): string;
export declare function buildSitemapXml(mode: string): string;
export declare function seoPublicFilesPlugin(mode: string): Plugin;
