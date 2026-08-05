import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        includeAssets: [
          'icon-192.png',
          'icon-512.png',
          'icon-maskable-192.png',
          'icon-maskable-512.png',
          'manifest.webmanifest',
          'manifest.json',
          'splash-logo.png',
          'logo-1024.png'
        ],
        manifest: {
          name: 'फल्सावदिया कृषि बाज़ार',
          short_name: 'कृषि बाज़ार',
          description: 'मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी',
          theme_color: '#2D5A27',
          background_color: '#FFFFFF',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          id: '/',
          dir: 'ltr',
          lang: 'hi-IN',
          categories: ['agriculture', 'business', 'news'],
          prefer_related_applications: false,
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: 'बाज़ार',
              url: '/products',
              icons: [{ src: '/icon-192.png', sizes: '192x192' }]
            },
            {
              name: 'मंडी भाव',
              url: '/mandi',
              icons: [{ src: '/icon-192.png', sizes: '192x192' }]
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-images-cache',
                expiration: {
                  maxEntries: 1000,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/(?:.*\.googleusercontent\.com|drive\.google\.com|.*\.ggpht\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-drive-images-cache',
                expiration: {
                  maxEntries: 1000,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/(?:img\.youtube\.com|i\.ytimg\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'youtube-thumbnails-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'general-images-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      '__APP_VERSION__': JSON.stringify('1.0.4'), // Stable version, bump manually when needed
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      'process.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(env.VITE_FIREBASE_DATABASE_ID),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
