import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.IMAGE_GENERATION_ENABLED': JSON.stringify(
                env.IMAGE_GENERATION_ENABLED
            ),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        base: '/forge-your-journey',
        build: {
            outDir: 'dist/forge-your-journey', // Specify the output directory for the build
            emptyOutDir: true, // Optional: Clears the output directory before building
        },
    };
});
