import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
        build: {
            outDir: 'build',
        },
        plugins: [react()],
        worker: {
            format: 'es',
        },
        optimizeDeps: {
            include: ['alignmenttool'],
            exclude: ["verovio"],
            esbuildOptions: {
                target: "es2020",
            },
        },
    };
});
