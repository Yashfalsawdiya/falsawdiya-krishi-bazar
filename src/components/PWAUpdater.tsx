import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

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
    const iconUrl = branding?.pwaIcon || 'https://img.icons8.com/color/512/wheat.png';

    // 1. Update Title and Favicons
    document.title = name;
    
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = iconUrl;

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;

    // 2. Dynamic Manifest
    const manifest = {
      name: name,
      short_name: shortName,
      description: appContent.branding?.tagline || 'Falsawdiya Krishi Bazaar - For Farmers',
      start_url: '/',
      display: 'standalone',
      background_color: '#F5F2ED',
      theme_color: '#2D5A27',
      orientation: 'portrait',
      icons: [
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png'
        }
      ]
    };

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    
    // Revoke old blob URL if it exists to avoid memory leak
    const oldUrl = manifestLink.getAttribute('data-blob-url');
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    
    manifestLink.href = manifestURL;
    manifestLink.setAttribute('data-blob-url', manifestURL);

    return () => {
      URL.revokeObjectURL(manifestURL);
    };
  }, [appContent]);

  return null;
};

export default PWAUpdater;
