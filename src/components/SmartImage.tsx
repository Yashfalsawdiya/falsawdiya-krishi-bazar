import React, { useState, useEffect } from 'react';
import { ImageSource } from '../types';
import { cn, getDirectImageURL } from '../lib/utils';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface SmartImageProps {
  src: string | ImageSource | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onClick?: (e: React.MouseEvent) => void;
  priority?: boolean;
  preferCloudPrimary?: boolean; // When true, uses high-res Drive/Cloud fallback URL first, falls back to base64 if unavailable
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className, 
  fallbackSrc = '',
  objectFit = 'cover',
  onClick,
  priority = false,
  preferCloudPrimary = false // Default FALSE: Normal products/categories keep primary base64. Only Hero Banner passes true!
}) => {
  // Sync calculation: Prioritize cloud HD URL if preferCloudPrimary is set, with seamless fallback to base64
  const resolveInitialSource = (source: string | ImageSource | undefined): { url: string; usingCloudFirst: boolean } => {
    if (!source) return { url: getDirectImageURL(fallbackSrc), usingCloudFirst: false };
    if (typeof source === 'string') return { url: getDirectImageURL(source), usingCloudFirst: false };

    if (preferCloudPrimary && source.fallback && source.fallback.trim() !== '') {
      return { url: getDirectImageURL(source.fallback), usingCloudFirst: true };
    }

    if (source.primary && source.primary.trim() !== '') {
      return { url: getDirectImageURL(source.primary), usingCloudFirst: false };
    }

    if (source.fallback && source.fallback.trim() !== '') {
      return { url: getDirectImageURL(source.fallback), usingCloudFirst: true };
    }

    return { url: getDirectImageURL(fallbackSrc), usingCloudFirst: false };
  };

  const initial = resolveInitialSource(src);
  const [currentSrc, setCurrentSrc] = useState<string>(initial.url);
  const [usingCloudFirst, setUsingCloudFirst] = useState<boolean>(initial.usingCloudFirst);
  const [hasError, setHasError] = useState(false);
  const [isPrimaryFailed, setIsPrimaryFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isAdmin } = useAppContext();

  // Update if props change
  useEffect(() => {
    const fresh = resolveInitialSource(src);
    if (fresh.url !== currentSrc) {
      setCurrentSrc(fresh.url);
      setUsingCloudFirst(fresh.usingCloudFirst);
      setHasError(false);
      setIsPrimaryFailed(false);
      setIsLoaded(false);
    }
  }, [src, fallbackSrc, preferCloudPrimary]);

  const handleError = () => {
    if (typeof src !== 'string' && src && !isPrimaryFailed) {
      setIsPrimaryFailed(true);

      // If we attempted Cloud first and it failed (e.g. offline, private permissions), fall back to local Base64
      if (usingCloudFirst && src.primary && src.primary.trim() !== '') {
        setCurrentSrc(getDirectImageURL(src.primary));
        return;
      }

      // If we attempted Base64 first and it failed, fall back to Cloud URL
      if (!usingCloudFirst && src.fallback && src.fallback.trim() !== '') {
        setCurrentSrc(getDirectImageURL(src.fallback));
        return;
      }

      // If both or remaining fallback failed, fall back to fallbackSrc
      setHasError(true);
      setCurrentSrc(getDirectImageURL(fallbackSrc));
    } else {
      // Both or single source failed
      setHasError(true);
      setCurrentSrc(getDirectImageURL(fallbackSrc));
    }
  };

  return (
    <div 
      className={cn("relative overflow-hidden group/img", className)}
      onClick={onClick}
    >
      {currentSrc && currentSrc !== "" && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "w-full h-full transition-opacity duration-200",
            hasError ? "opacity-40 grayscale" : (isLoaded ? "opacity-100" : "opacity-0"),
            objectFit === 'cover' && "object-cover",
            objectFit === 'contain' && "object-contain",
            objectFit === 'fill' && "object-fill",
            objectFit === 'none' && "object-none",
            objectFit === 'scale-down' && "object-scale-down"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          referrerPolicy="no-referrer"
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchPriority: "high" } : {})}
          onContextMenu={(e) => !isAdmin && e.preventDefault()}
          onDragStart={(e) => !isAdmin && e.preventDefault()}
          draggable={isAdmin}
        />
      )}

      {/* Protective Overlay for Non-Admins */}
      {!isAdmin && isLoaded && !hasError && (
        <div 
          className="absolute inset-0 z-20 cursor-default select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
          <AlertCircle className="w-1/3 h-1/3 text-gray-300 mb-1" />
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">
            Image Missing
          </span>
        </div>
      )}
      
      {(!currentSrc || currentSrc === "") && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-1/2 h-1/2 text-gray-200 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default SmartImage;
