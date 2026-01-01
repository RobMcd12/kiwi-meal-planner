import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    // Load env from process.env (for Railway) and .env files
    const env = loadEnv(mode, process.cwd(), '');

    // Debug: Log env vars during build (v2)
    console.log('Build environment check v2:');
    console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('- Using hardcoded fallback credentials');

    // Get Supabase config from either VITE_ or NEXT_PUBLIC_ prefixed vars
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ||
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/*.svg', 'icons/*.png'],
          manifest: {
            name: 'Kiwi Meal Planner',
            short_name: 'KiwiMeals',
            description: 'AI-powered weekly meal planning',
            start_url: '/',
            display: 'standalone',
            background_color: '#f8fafc',
            theme_color: '#059669',
            orientation: 'portrait-primary',
            icons: [
              {
                src: '/icons/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any'
              },
              {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          },
          workbox: {
            // Cache all static assets
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            // Runtime caching for API calls
            runtimeCaching: [
              {
                // Cache cookbook/recipe data for offline
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/favorite_meals/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'cookbook-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                  }
                }
              },
              {
                // Cache recipe images
                urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\//,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'recipe-images-cache',
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  }
                }
              },
              {
                // Cache Google Fonts
                urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts-stylesheets'
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  }
                }
              }
            ]
          }
        })
      ],
      define: {
        // Gemini key
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
        // Expose NEXT_PUBLIC vars to import.meta.env for Vite
        'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
        'import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify(supabaseAnonKey),
        // Build version for cache busting - unique per build
        '__APP_VERSION__': JSON.stringify(Date.now().toString()),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
      }
    };
});
