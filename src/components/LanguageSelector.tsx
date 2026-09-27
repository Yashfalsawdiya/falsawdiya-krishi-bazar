import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageCode } from '../i18n/translations';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageSelectorProps {
  variant?: 'compact' | 'pill' | 'drawer' | 'desktop';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Drawer / Side Menu row variant
  if (variant === 'drawer') {
    return (
      <div className={cn("p-3 bg-emerald-50/60 border border-emerald-100/80 rounded-2xl mb-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
            <Languages className="w-4 h-4 text-[#2D5A27]" />
            <span>ऐप की भाषा / Language</span>
          </div>
          <span className="text-[10px] text-[#2D5A27] font-bold uppercase bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            {language === 'hi' ? 'हिंदी' : 'English'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  isSelected
                    ? "bg-[#2D5A27] text-white shadow-xs font-bold scale-[1.02]"
                    : "bg-white text-gray-700 hover:bg-emerald-50 border border-emerald-100/80"
                )}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{lang.nativeLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Tier-1 Header variant
  if (variant === 'desktop') {
    return (
      <div className={cn("relative", className)} ref={containerRef}>
        <div className="flex items-center bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl p-1 shadow-xs transition-all">
          <div className="px-2 flex items-center gap-1 text-white/70">
            <Languages className="w-3.5 h-3.5 text-[#EAB308]" />
          </div>
          <div className="flex items-center gap-1">
            {languages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-[#EAB308] text-[#16311A] shadow-xs"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                  title={`Switch to ${lang.label}`}
                >
                  {lang.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Compact Mobile Header Toggle Pill
  return (
    <div className={cn("inline-flex items-center relative", className)}>
      <div className="flex items-center bg-white/15 border border-white/20 rounded-full p-0.5 shadow-xs">
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer select-none",
                isSelected
                  ? "bg-[#EAB308] text-[#16311A] shadow-xs"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
              title={`भाषा: ${lang.nativeLabel}`}
            >
              {lang.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSelector;
