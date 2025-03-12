import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import * as path from 'path';
import dts from 'vite-plugin-dts'

// Detect whether we're building as a library or an app
const isLib = process.env.BUILD_LIB === 'true';

export default defineConfig(() => {
    return {
        build:
            isLib
                ? {
                    lib: {
                        entry: path.resolve(__dirname, 'src/components/index.ts'),
                        formats: ['es']
                    },
                    rollupOptions: {
                        external: ['react', 'react/jsx-runtime', '@mui/material', 'react-dom'],
                        output: {
                            globals: {
                                react: 'React',
                                'react-dom': 'ReactDOM',
                            },
                        },
                    },
                    copyPublicDir: false
                }
                : {
                    outDir: 'build',
                },
        plugins: [
            react(),
            eslint(),
            dts({
                include: 'src/components',
                tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
            })
        ],
        worker: {
            format: 'es',
        },
        optimizeDeps: {
            include: ['@mui/material'],
            esbuildOptions: {
                target: "es2020",
            },

        },
        server: {
            fs: {
                // Allow serving files from one level up to the project root
                allow: ['/Users'],
            },
        },
    };
});
