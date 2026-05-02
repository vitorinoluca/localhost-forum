import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    // Misma familia IPv4 que el API en dev (server usa 127.0.0.1). En Windows,
    // `localhost` puede ir a ::1 y el proxy falla con ECONNRESET/ECONNREFUSED.
    var apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000';
    return {
        plugins: [react()],
        build: {
            sourcemap: mode !== 'production',
        },
        server: {
            port: 5174,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    timeout: 120000,
                    proxyTimeout: 120000,
                },
            },
        },
    };
});
