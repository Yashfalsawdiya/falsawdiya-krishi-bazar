import React, { useRef, useState, useEffect } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { X, ZoomIn, ZoomOut, Maximize, Loader2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ImageSource } from '../types';
import { getHighResImageURL, cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | ImageSource;
  altText: string;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ isOpen, onClose, imageSrc, altText }) => {
  const imgRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAppContext();

  // Reset loading when image changes
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
    }
  }, [imageSrc, isOpen]);

  const onUpdate = ({ x, y, scale }: { x: number; y: number; scale: number }) => {
    if (imgRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      imgRef.current.style.setProperty('transform', value);
    }
  };

  // Convert to string and get high res URL
  const highResSrc = getHighResImageURL(imageSrc);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex flex-col"
        >
          {/* Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex justify-between items-center p-5 text-white z-10 bg-gradient-to-b from-black/60 to-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                <Maximize className="w-4 h-4 text-gray-300" />
              </div>
              <h3 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{altText}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90 border border-white/5"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>

          {/* Zoom Container */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#EAB308]" />
                <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">High Quality loading...</p>
              </div>
            )}
            <QuickPinchZoom onUpdate={onUpdate} containerProps={{ style: { width: '100%', height: '100%' } }}>
              <div ref={imgRef} className="w-full h-full flex items-center justify-center">
                {highResSrc && highResSrc !== "" && (
                  <img
                    src={highResSrc}
                    alt={altText}
                    className={cn(
                      "max-w-full max-h-full shadow-2xl rounded-sm transition-all duration-500",
                      loading ? "opacity-0 scale-95 blur-xl" : "opacity-100 scale-100 blur-0"
                    )}
                    onLoad={() => setLoading(false)}
                    referrerPolicy="no-referrer"
                    onContextMenu={(e) => !isAdmin && e.preventDefault()}
                    onDragStart={(e) => !isAdmin && e.preventDefault()}
                    draggable={isAdmin}
                  />
                )}
              </div>
            </QuickPinchZoom>

            {/* Protective Overlay for Non-Admins in Fullscreen */}
            {!isAdmin && !loading && highResSrc && (
              <div 
                className="absolute inset-0 z-30 cursor-default select-none touch-none pointer-events-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Fixed Watermark overlay */}
                <div className="absolute inset-0 flex flex-wrap items-center justify-center content-center gap-12 rotate-[-15deg] opacity-[0.05] p-20">
                  {[...Array(20)].map((_, i) => (
                    <span key={i} className="text-xl font-black uppercase text-white whitespace-nowrap">
                      फल्सावदिया कृषि बाज़ार
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Instruction */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="p-8 text-center text-white/80 z-10 bg-gradient-to-t from-black/60 to-transparent"
          >
            <div className="inline-flex items-center gap-6 px-6 py-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                <ZoomIn className="w-4 h-4 text-[#EAB308]" />
                Pinch to Zoom
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="text-[11px] sm:text-sm font-medium">
                अंगुलियों से ज़ूम करें
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageZoomModal;
