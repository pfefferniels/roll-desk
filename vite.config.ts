import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * `/editor` as a file GitHub Pages can find.
 *
 * Pages resolves a path to a file and offers no rewrite rule, so `/editor`
 * matches nothing and it falls back to `404.html`, leaving the URL alone.
 * That is all the router needs: it reads the route off `location.pathname`,
 * so the fallback page only has to BE the app. Hence a copy of the built
 * index.html, taken from the bundle so it carries the same hashed asset names.
 *
 * `enforce: 'post'` because index.html is emitted by Vite's own build plugins,
 * which run after ordinary user plugins.
 */
const spaFallback = (): Plugin => ({
    name: 'spa-fallback',
    enforce: 'post',
    generateBundle(_options, bundle) {
        const index = bundle['index.html'];
        if (index?.type !== 'asset') throw new Error('no built index.html to copy to 404.html');
        this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
});

export default defineConfig(() => {
    return {
        resolve: {
            dedupe: ['react', 'react-dom'],
        },
        build: {
            outDir: 'build',
        },
        plugins: [
            react(),
            spaFallback(),
        ],
        worker: {
            format: 'es',
        },
        test: {
            server: {
                deps: {
                    // linked-rolls ships extensionless ESM imports, which Vite
                    // resolves but Node's loader does not. Only its own files:
                    // its nested dependencies are Node's business.
                    inline: [/\/linked-rolls\/lib\//],
                },
            },
        },
    };
});
