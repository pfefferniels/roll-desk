import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

export default defineConfig(() => {
    return {
        build: {
            outDir: 'build',
        },
        plugins: [react(), eslint()],
        worker: {
            format: 'es',
        },
        optimizeDeps: {
            include: ['alignmenttool', '@mui/material'],
            exclude: ["verovio"],
            esbuildOptions: {
                target: "es2020",
            },
        },
    };
});
