import React, { useState, useEffect } from 'react';
import { ImageSource } from '../types';
import { cn, getDirectImageURL } from '../lib/utils';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface SmartImageProps {
  src: string | ImageSource | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onClick?: (e: React.MouseEvent) => void;
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className, 
  fallbackSrc = 'https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&q=80&w=400',
  objectFit = 'cover',
  onClick
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isPrimaryFailed, setIsPrimaryFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsPrimaryFailed(false);
    setIsLoaded(false);
    
    if (!src) {
      setCurrentSrc(getDirectImageURL(fallbackSrc));
      return;
    }

    if (typeof src === 'string') {
      setCurrentSrc(getDirectImageURL(src));
    } else {
      // It's an ImageSource object
      if (src.primary) {
        setCurrentSrc(getDirectImageURL(src.primary));
      } else if (src.fallback) {
        setCurrentSrc(getDirectImageURL(src.fallback));
      } else {
        setCurrentSrc(getDirectImageURL(fallbackSrc));
      }
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
      className={cn("relative overflow-hidden", className)}
      onClick={onClick}
    >
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "w-full h-full transition-opacity duration-300",
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
          loading="lazy"
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
      
      {!currentSrc && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-1/2 h-1/2 text-gray-200 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default SmartImage;
