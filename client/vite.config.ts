import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.IMAGE_GENERATION_ENABLED': JSON.stringify(
        env.IMAGE_GENERATION_ENABLED
      ),
      'process.env.PROXY_URL': JSON.stringify(env.PROXY_URL)
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    build: {
      outDir: 'dist/client', // Specify the output directory for the build
      emptyOutDir: true // Optional: Clears the output directory before building
    }
  };
});
