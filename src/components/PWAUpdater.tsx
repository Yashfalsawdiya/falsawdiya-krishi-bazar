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
    
    const updateManifest = async () => {
      // 1. Update Title and Favicons
      document.title = name;
      
      // Use the stable server-side icon route for favicons too
      const iconUrl192 = '/api/icon?purpose=any&size=192';

      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = iconUrl192; 

      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = '/api/icon?purpose=maskable&size=192';

      // 2. Point to the STABLE server-side manifest instead of a Blob URL
      // This is the key to removing the "Chrome badge" because WebAPK minters can fetch this URL.
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      
      // Revoke any old blobs
      const oldUrl = manifestLink.getAttribute('data-blob-url');
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      
      // Set to stable URL
      manifestLink.href = '/manifest.json';
      manifestLink.removeAttribute('data-blob-url');
    };

    updateManifest();

    return () => {};
  }, [appContent]);

  return null;
};

export default PWAUpdater;
