import React, { useState, useEffect, useRef } from 'react';
import { ImageSource } from '../types';
import { 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Eye
} from 'lucide-react';
import { fileToBase64, compressImage, cn, getDirectImageURL } from '../lib/utils';

interface DualImageInputProps {
  label: string;
  value: string | ImageSource | undefined;
  onChange: (value: ImageSource) => void;
  description?: string;
}

const DualImageInput: React.FC<DualImageInputProps> = ({ label, value, onChange, description }) => {
  const [primary, setPrimary] = useState<string>('');
  const [fallback, setFallback] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const checkTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value) {
      setPrimary('');
      setFallback('');
    } else if (typeof value === 'string') {
      // If it's a base64 image or a URL
      if (value.startsWith('data:image') || value.startsWith('http') || value.startsWith('https')) {
        setPrimary(value);
        setFallback('');
      } else {
        // It's likely an emoji or other string icon, not an image for the DualInput
        setPrimary('');
        setFallback('');
      }
    } else {
      setPrimary(value.primary || '');
      setFallback(value.fallback || '');
    }
  }, [value]);

  const validateUrl = (url: string) => {
    if (!url) {
      setUrlStatus('idle');
      return;
    }
    
    const directUrl = getDirectImageURL(url);
    
    // Basic regex for direct image links
    const isImage = /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(directUrl.split('?')[0]);
    const isHosted = /drive\.google\.com|docs\.google\.com|googleusercontent\.com|imgbb\.com|cloudinary\.com|cdn\./.test(directUrl);
    
    if (isImage || isHosted) {
      setUrlStatus('checking');
      
      // Simple image load test
      const img = new Image();
      img.onload = () => setUrlStatus('valid');
      img.onerror = () => setUrlStatus('invalid');
      img.src = directUrl;
    } else {
      setUrlStatus('invalid');
    }
  };

  const handlePrimaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const compressed = await compressImage(base64);
      const newValue = { primary: compressed, fallback };
      setPrimary(compressed);
      onChange(newValue);
    } catch (error) {
      console.error("Upload error:", error);
      alert("फोटो अपलोड करने में समस्या आई।");
    } finally {
      setUploading(false);
    }
  };

  const handleFallbackChange = (url: string) => {
    setFallback(url);
    const newValue = { primary, fallback: url };
    onChange(newValue);

    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    checkTimeout.current = setTimeout(() => validateUrl(url), 500);
  };

  const clearPrimary = () => {
    setPrimary('');
    onChange({ primary: '', fallback });
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 transition-all hover:border-gray-200 group">
      <div className="flex justify-between items-start">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
          {description && <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{description}</p>}
        </div>
        <button 
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            "p-2 rounded-xl transition-all",
            showPreview ? "bg-[#2D5A27] text-white" : "bg-white text-gray-400 hover:text-[#2D5A27]"
          )}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Option: Upload */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#2D5A27]/10 flex items-center justify-center">
              <Upload className="w-3 h-3 text-[#2D5A27]" />
            </div>
            <span className="text-[10px] font-bold text-[#4A3728] uppercase tracking-wide">गैलरी से चुनें (Pick from Gallery)</span>
          </div>
          
          <div className={cn(
            "relative h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden",
            primary ? "border-[#2D5A27] bg-white" : "border-gray-200 bg-gray-50 hover:bg-white"
          )}>
            {primary ? (
              <>
                <img src={primary} alt="Primary" className="w-full h-full object-contain p-2" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <label className="p-2 bg-[#2D5A27] text-white rounded-xl shadow-lg cursor-pointer active:scale-95 transition-transform">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePrimaryUpload} />
                  </label>
                  <button 
                    type="button"
                    onClick={clearPrimary}
                    className="p-2 bg-red-500 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-[#2D5A27] text-white text-[8px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-2.5 h-2.5" /> UPLOADED
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-[#2D5A27]/5 rounded-xl flex items-center justify-center">
                  {uploading ? <Loader2 className="w-5 h-5 text-[#2D5A27] animate-spin" /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-[#2D5A27] block">गैलरी से चुनें</span>
                  <span className="text-[8px] text-gray-400">High Quality Photos</span>
                </div>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePrimaryUpload} />
              </>
            )}
          </div>
        </div>

        {/* Fallback Option: URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
              <LinkIcon className="w-3 h-3 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-[#4A3728] uppercase tracking-wide">Google Drive Image URL</span>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input 
                type="text" 
                value={fallback}
                onChange={(e) => handleFallbackChange(e.target.value)}
                placeholder="Google Drive या direct image link यहाँ पेस्ट करें..."
                className={cn(
                  "w-full bg-white border-2 rounded-2xl p-3 pl-10 text-xs font-medium outline-none transition-all",
                  urlStatus === 'valid' ? "border-green-100 focus:border-green-500" :
                  urlStatus === 'invalid' ? "border-red-100 focus:border-red-500" :
                  "border-transparent focus:border-[#2D5A27]"
                )}
              />
              <LinkIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
                {fallback && (
                  <button 
                    type="button"
                    onClick={() => {
                      setFallback('');
                      onChange({ primary, fallback: '' });
                      setUrlStatus('idle');
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5 font-bold" />
                  </button>
                )}
                {urlStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {urlStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {urlStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>

            <div className={cn(
              "h-20 rounded-2xl border-2 border-dashed border-gray-100 bg-white flex items-center justify-center overflow-hidden transition-all",
              fallback ? "opacity-100 scale-100" : "opacity-40 scale-95"
            )}>
              {fallback ? (
                <img 
                  src={getDirectImageURL(fallback)} 
                  alt="URL Preview" 
                  className="w-full h-full object-contain p-2"
                  onError={() => setUrlStatus('invalid')}
                />
              ) : (
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">URL Preview</span>
              )}
            </div>
            
            {urlStatus === 'invalid' && (
              <p className="text-[9px] text-red-500 font-bold px-1 animate-pulse">
                यह एक valid image link नहीं है। कृपया direct link उपयोग करें।
              </p>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Live Logic Preview</p>
          <div className="flex gap-4 items-center justify-center">
            <div className="space-y-1 text-center">
              <div className="w-24 h-24 rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex items-center justify-center bg-gray-50">
                {(primary || fallback) ? (
                  <img 
                    src={primary || getDirectImageURL(fallback)} 
                    alt="Logic Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-200" />
                )}
              </div>
              <p className="text-[8px] font-bold text-[#2D5A27]">{primary ? 'PRIMARY ACTIVE' : fallback ? 'BACKUP ACTIVE' : 'NO IMAGE'}</p>
            </div>
            
            <div className="text-gray-300">
               <ImageIcon className="w-6 h-6" />
            </div>

            <div className="flex-1 text-[10px] space-y-1">
              <div className={cn("flex items-center gap-2", primary ? "text-green-600" : "text-gray-400")}>
                <div className={cn("w-1.5 h-1.5 rounded-full", primary ? "bg-green-500" : "bg-gray-300")} />
                Primary Source: {primary ? "Available (Firebase/B64)" : "Not Set"}
              </div>
              <div className={cn("flex items-center gap-2", fallback ? "text-blue-600" : "text-gray-400")}>
                <div className={cn("w-1.5 h-1.5 rounded-full", fallback ? "bg-blue-500" : "bg-gray-300")} />
                Backup Source: {fallback ? (urlStatus === 'valid' ? "Active (Tested)" : "Set (Testing...)") : "Not Set"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DualImageInput;
