import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ImageSource } from '../types';

/**
 * Dynamically updates PWA manifest and icons based on appContent from Firestore
 */
const PWAUpdater: React.FC = () => {
  const { appContent } = useAppContext();

  useEffect(() => {
    if (!appContent) return;

    const { branding } = appContent;
    const name = branding?.name || 'फल्सावदिया कृषि बाज़ार';
    const shortName = 'कृषि बाज़ार';
    
    const getIconUrl = (source: string | ImageSource | undefined) => {
      if (!source) return '/icon-512.png';
      if (typeof source === 'string') return source;
      return source.primary || source.fallback || '/icon-512.png';
    };

    const iconUrl = getIconUrl(branding?.pwaIcon);

    const createProcessedIcon = (src: string, size: number, isMaskable: boolean): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          // Force White background for Android Adaptive Icons to look clean
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);

          if (isMaskable) {
            // Android Maskable/Adaptive Safe Zone is within center 80% circle
            // To be really safe and avoid "zoomed" look, we use even more padding
            const padding = size * 0.25; // 25% padding on each side = 50% logo size in middle
            const drawSize = size - (padding * 2);
            // Center the logo perfectly
            ctx.drawImage(img, padding, padding, drawSize, drawSize);
          } else {
            // Standard centered icon with 10% breathing room
            const padding = size * 0.1;
            const drawSize = size - (padding * 2);
            ctx.drawImage(img, padding, padding, drawSize, drawSize);
          }

          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(src);
        img.src = src;
      });
    };

    let currentManifestURL: string | null = null;

    const updateManifest = async () => {
      const maskableIcon512 = await createProcessedIcon(iconUrl, 512, true);
      const anyIcon512 = await createProcessedIcon(iconUrl, 512, false);
      const maskableIcon192 = await createProcessedIcon(iconUrl, 192, true);
      const anyIcon192 = await createProcessedIcon(iconUrl, 192, false);

      // 1. Update Title and Favicons
      document.title = name;
      
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = anyIcon192; 

      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = maskableIcon192; 

      const manifest = {
        id: 'com.krishibazaar.app.falsawdiya.v3', // Incremented version to force update
        name: name,
        short_name: shortName,
        description: appContent.branding?.tagline || 'मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
        background_color: '#FFFFFF',
        theme_color: '#2D5A27',
        orientation: 'portrait',
        dir: 'ltr',
        lang: 'hi-IN',
        categories: ['agriculture', 'business', 'news', 'shopping', 'social'],
        prefer_related_applications: false,
        icons: [
          {
            src: anyIcon192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: maskableIcon192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: anyIcon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: maskableIcon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'मंडी भाव',
            short_name: 'मंडी',
            url: '/mandi',
            icons: [{ src: anyIcon192, sizes: '192x192' }]
          },
          {
            name: 'उत्पाद',
            short_name: 'दुकान',
            url: '/products',
            icons: [{ src: anyIcon192, sizes: '192x192' }]
          }
        ],
        screenshots: [
          {
            src: anyIcon512,
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Home Screen'
          },
          {
            src: anyIcon512,
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard'
          }
        ]
      };

      const stringManifest = JSON.stringify(manifest);
      const blob = new Blob([stringManifest], { type: 'application/json' });
      currentManifestURL = URL.createObjectURL(blob);

      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      
      const oldUrl = manifestLink.getAttribute('data-blob-url');
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      
      manifestLink.href = currentManifestURL;
      manifestLink.setAttribute('data-blob-url', currentManifestURL);
    };

    updateManifest();

    return () => {
      if (currentManifestURL) URL.revokeObjectURL(currentManifestURL);
    };
  }, [appContent]);

  return null;
};

export default PWAUpdater;
