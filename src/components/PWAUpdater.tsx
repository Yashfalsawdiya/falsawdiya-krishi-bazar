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
      id: 'com.krishibazaar.app.v1',
      name: name,
      short_name: shortName,
      description: appContent.branding?.tagline || 'मध्यप्रदेश के किसानों के लिए मंडी भाव, समाचार और योजनाओं की जानकारी',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#F5F2ED',
      theme_color: '#2D5A27',
      orientation: 'portrait',
      dir: 'ltr',
      lang: 'hi',
      categories: ['agriculture', 'business', 'news'],
      prefer_related_applications: false,
      icons: [
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
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
