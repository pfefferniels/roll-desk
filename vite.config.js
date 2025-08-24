import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import eslint from 'vite-plugin-eslint';
import * as path from 'path';
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css';

// Detect whether we're building as a library or an app
const isLib = process.env.BUILD_LIB === 'true';

export default defineConfig(() => {
    return {
        build:
            isLib
                ? {
                    lib: {
                        entry: path.resolve(__dirname, 'src/index.ts'),
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
            libInjectCss(),
            dts({
                include: 'src',
                tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
            })
        ],
        worker: {
            format: 'es',
        },
    };
});
