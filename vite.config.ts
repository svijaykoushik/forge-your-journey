import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.IMAGE_GENERATION_ENABLED': JSON.stringify(
        env.IMAGE_GENERATION_ENABLED
      ),
      'process.env.PROXY_URL': JSON.stringify(env.PROXY_URL)
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate', // or 'prompt', 'injectManifest'
        manifest: {
          name: 'Forge Your Journey',
          short_name: 'FYJ',
          description:
            "Step into 'Forge your Journey', the groundbreaking text-based RPG where you are the architect of your own epic tale. This isn't just a 'choose your own adventure'; it's a living story that adapts dynamically to your every decision.",
          start_url: '/',
          icons: [
            {
              src: '/icons/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ],
          screenshots: [
            {
              src: '/screenshots/screenshot.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide'
            },
            {
              src: '/screenshots/screenshot_narrow.png',
              sizes: '412x915',
              type: 'image/png',
              form_factor: 'narrow'
            }
          ],
          theme_color: '#c27aff',
          background_color: '#111826',
          display: 'standalone',
          display_override: ['minimal-ui', 'window-controls-overlay']
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    build: {
      outDir: 'dist/client', // Specify the output directory for the build
      emptyOutDir: true, // Optional: Clears the output directory before building
      copyPublicDir: true
    }
  };
});
