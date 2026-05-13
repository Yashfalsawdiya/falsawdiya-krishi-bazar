import React, { useState, useEffect } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  primarySrc: string;
  fallbackSrc?: string;
  placeholderSrc?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({ 
  primarySrc, 
  fallbackSrc, 
  placeholderSrc = 'https://placehold.co/600x400?text=Image+Loading',
  alt,
  className,
  ...props 
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(primarySrc || fallbackSrc || placeholderSrc);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setCurrentSrc(primarySrc || fallbackSrc || placeholderSrc);
    setIsError(false);
    setRetryCount(0);
  }, [primarySrc, fallbackSrc, placeholderSrc]);

  const handleError = () => {
    if (!isError) {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      } else {
        setCurrentSrc(placeholderSrc);
        setIsError(true);
      }
    } else if (retryCount < 2) {
      // Small retry logic
      setRetryCount(prev => prev + 1);
      const temp = currentSrc;
      setCurrentSrc('');
      setTimeout(() => setCurrentSrc(temp), 500);
    }
  };

  return (
    <img 
      src={currentSrc} 
      alt={alt} 
      onError={handleError}
      className={className}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};

export default SafeImage;
