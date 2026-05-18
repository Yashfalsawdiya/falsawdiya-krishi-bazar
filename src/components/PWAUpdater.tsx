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
    
    // Extract string URL from potentially complex branding icons
    const getIconUrl = (source: string | ImageSource | undefined) => {
      if (!source) return '/icon-512.png';
      if (typeof source === 'string') return source;
      return source.primary || source.fallback || '/icon-512.png';
    };

    const iconUrl = getIconUrl(branding?.pwaIcon);

    // 3. Process Maskable Icon with Canvas to ensure padding (Safety Zone)
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

          // Fill background (Adaptive background)
          ctx.fillStyle = '#FFFFFF'; // White background for the icon container
          ctx.fillRect(0, 0, size, size);

          if (isMaskable) {
            // Add substantial padding for maskable icons (Safe Zone)
            // Logos should be within center 80% (10% padding on each side)
            // But for a better "centered" look on Android, 15-20% is safer.
            const padding = size * 0.2; 
            const drawSize = size - (padding * 2);
            ctx.drawImage(img, padding, padding, drawSize, drawSize);
          } else {
            // For 'any' purpose, fill a bit more but still keep some breathing room
            const padding = size * 0.05;
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
        id: 'com.krishibazaar.app.falsawdiya.pwa.v2',
        name: name,
        short_name: shortName,
        description: appContent.branding?.tagline || 'मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी',
        start_url: '/?source=pwa_install',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        background_color: '#FFFFFF',
        theme_color: '#2D5A27',
        orientation: 'portrait',
        dir: 'ltr',
        lang: 'hi-IN',
        categories: ['agriculture', 'business', 'news', 'shopping', 'social'],
        prefer_related_applications: false,
        icons: [
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
          },
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
          }
        ],
        shortcuts: [
          {
            name: 'मंडी भाव',
            short_name: 'मंडी',
            url: '/mandi',
            description: 'ताज़ा मंडी भाव देखें',
            icons: [{ src: anyIcon192, sizes: '192x192' }]
          },
          {
            name: 'उत्पाद',
            short_name: 'दुकान',
            url: '/products',
            description: 'दवाइयाँ और बीज खरीदें',
            icons: [{ src: anyIcon192, sizes: '192x192' }]
          }
        ],
        screenshots: [
          {
            src: anyIcon512,
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'कृषि बाज़ार होम स्क्रीन'
          },
          {
            src: anyIcon512,
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'कृषि बाज़ार मोबाइल ऐप'
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
