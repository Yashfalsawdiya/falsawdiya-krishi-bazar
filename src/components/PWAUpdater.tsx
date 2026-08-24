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
    const name = branding?.name || 'फल्सावदिया कृषि बाजार';
    const shortName = 'कृषि बाजार';
    
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

    const updateManifest = async () => {
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
    };

    updateManifest();

    return () => {};
  }, [appContent]);

  return null;
};

export default PWAUpdater;
