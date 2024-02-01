import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig(() => {
    return {
        build: {
            outDir: 'build',
        },
        plugins: [
            react(),
            eslint(),
            wasm(),
            topLevelAwait()
        ],
        worker: {
            format: 'es',
        },
        optimizeDeps: {
            include: ['@mui/material'],
            exclude: ["alignmenttool", "verovio"],
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
