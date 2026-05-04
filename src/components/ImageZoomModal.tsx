import React, { useRef } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  altText: string;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ isOpen, onClose, imageSrc, altText }) => {
  const imgRef = useRef<HTMLImageElement>(null);

  const onUpdate = ({ x, y, scale }: { x: number; y: number; scale: number }) => {
    if (imgRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      imgRef.current.style.setProperty('transform', value);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 text-white z-10">
            <h3 className="text-sm font-medium truncate pr-8">{altText}</h3>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Zoom Container */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <QuickPinchZoom onUpdate={onUpdate} containerProps={{ style: { width: '100%', height: '100%' } }}>
              <img
                ref={imgRef}
                src={imageSrc}
                alt={altText}
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </QuickPinchZoom>
          </div>

          {/* Footer Instruction */}
          <div className="p-4 text-center text-white/60 text-xs">
            ज़ूम करने के लिए पिंच करें या डबल टैप करें (Pinch or double tap to zoom)
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageZoomModal;
