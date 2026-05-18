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
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className, 
  fallbackSrc = '',
  objectFit = 'cover',
  onClick,
  priority = false
}) => {
  // Sync calculation to avoid blank first frame
  const resolveSrc = (source: string | ImageSource | undefined): string => {
    if (!source) return getDirectImageURL(fallbackSrc);
    if (typeof source === 'string') return getDirectImageURL(source);
    return getDirectImageURL(source.primary || source.fallback || fallbackSrc);
  };

  const initialSrc = resolveSrc(src);
  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);
  const [isPrimaryFailed, setIsPrimaryFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isAdmin } = useAppContext();

  // Update if props change
  useEffect(() => {
    const newSrc = resolveSrc(src);
    if (newSrc !== currentSrc) {
      setCurrentSrc(newSrc);
      setHasError(false);
      setIsPrimaryFailed(false);
      setIsLoaded(false);
    }
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (typeof src !== 'string' && src?.primary && !isPrimaryFailed) {
      // Primary failed, try fallback
      setIsPrimaryFailed(true);
      if (src.fallback) {
        setCurrentSrc(getDirectImageURL(src.fallback));
      } else {
        setHasError(true);
        setCurrentSrc(getDirectImageURL(fallbackSrc));
      }
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

      {/* Watermark for Non-Admins */}
      {!isAdmin && isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-[0.07] select-none overflow-hidden mix-blend-multiply">
          <div className="grid grid-cols-2 gap-8 rotate-[-25deg] scale-125">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="text-[10px] font-black uppercase text-black whitespace-nowrap">
                फल्सावदिया कृषि बाज़ार
              </span>
            ))}
          </div>
        </div>
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
