import React, { useState, useMemo } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Monitor, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Check, 
  X, 
  Sparkles, 
  ExternalLink,
  Info,
  Layers
} from 'lucide-react';
import { DeviceType, DeviceBanner, DeviceBannersMap, ImageSource } from '../types';
import { AppContent } from '../context/AppContext';
import { 
  DEVICE_METADATA, 
  ORDERED_DEVICE_TYPES, 
  normalizeDeviceBanners 
} from '../utils/deviceBanners';
import DualImageInput from './DualImageInput';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDeviceBannerManagerProps {
  contentForm: AppContent;
  setContentForm: React.Dispatch<React.SetStateAction<AppContent>>;
  onSaveContent?: () => Promise<void>;
}

const AdminDeviceBannerManager: React.FC<AdminDeviceBannerManagerProps> = ({
  contentForm,
  setContentForm,
  onSaveContent
}) => {
  const [activeDeviceTab, setActiveDeviceTab] = useState<DeviceType>('mobile');
  const [editingBanner, setEditingBanner] = useState<DeviceBanner | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<{ banner: DeviceBanner; device: DeviceType } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // New banner form state
  const [newBanner, setNewBanner] = useState<{
    image: string | ImageSource;
    title: string;
    subtitle: string;
    link: string;
    isActive: boolean;
  }>({
    image: '',
    title: '',
    subtitle: '',
    link: '',
    isActive: true
  });

  // Normalize device banners from current contentForm
  const currentBannersMap: DeviceBannersMap = useMemo(() => {
    return normalizeDeviceBanners(contentForm);
  }, [contentForm]);

  const activeDeviceMeta = DEVICE_METADATA[activeDeviceTab];
  const activeDeviceBanners = currentBannersMap[activeDeviceTab] || [];

  // Helper to commit changes to contentForm (and sync mobile with legacy banners)
  const commitBannersMap = (newMap: DeviceBannersMap) => {
    // Keep legacy contentForm.banners in sync with mobile banners
    const legacyMobileBanners = newMap.mobile.map(b => ({
      id: b.id,
      image: b.image,
      title: b.title || '',
      subtitle: b.subtitle || ''
    }));

    setContentForm(prev => ({
      ...prev,
      banners: legacyMobileBanners,
      deviceBanners: newMap
    }));
  };

  const handleMoveBanner = async (device: DeviceType, index: number, direction: 'up' | 'down') => {
    const list = [...(currentBannersMap[device] || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Re-assign displayOrder
    const updatedList = list.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    const updatedMap: DeviceBannersMap = {
      ...currentBannersMap,
      [device]: updatedList
    };

    commitBannersMap(updatedMap);
  };

  const handleToggleActive = (device: DeviceType, bannerId: string) => {
    const list = currentBannersMap[device] || [];
    const updatedList = list.map(b => {
      if (b.id === bannerId) {
        return { ...b, isActive: b.isActive === false ? true : false, updatedAt: new Date().toISOString() };
      }
      return b;
    });

    commitBannersMap({
      ...currentBannersMap,
      [device]: updatedList
    });
  };

  const handleDeleteConfirm = () => {
    if (!bannerToDelete) return;
    const { banner, device } = bannerToDelete;
    const list = currentBannersMap[device] || [];

    // Safety rule: never delete if only 1 banner left
    if (list.length <= 1) {
      alert('कम से कम 1 Hero Banner हमेशा मौजूद होना अनिवार्य है। आप अंतिम बैनर को डिलीट नहीं कर सकते।');
      setBannerToDelete(null);
      return;
    }

    const filtered = list.filter(b => b.id !== banner.id);
    const reordered = filtered.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    commitBannersMap({
      ...currentBannersMap,
      [device]: reordered
    });

    setBannerToDelete(null);
  };

  const handleAddNewBanner = () => {
    const list = currentBannersMap[activeDeviceTab] || [];
    const newId = `${activeDeviceTab}-${Date.now()}`;
    const bannerItem: DeviceBanner = {
      id: newId,
      deviceType: activeDeviceTab,
      image: newBanner.image,
      title: newBanner.title.trim(),
      subtitle: newBanner.subtitle.trim(),
      link: newBanner.link.trim(),
      displayOrder: list.length + 1,
      isActive: newBanner.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedMap: DeviceBannersMap = {
      ...currentBannersMap,
      [activeDeviceTab]: [...list, bannerItem]
    };

    commitBannersMap(updatedMap);

    // Reset form
    setNewBanner({
      image: '',
      title: '',
      subtitle: '',
      link: '',
      isActive: true
    });
    setIsAddModalOpen(false);
  };

  const handleUpdateEditingBanner = () => {
    if (!editingBanner) return;
    const device = editingBanner.deviceType;
    const list = currentBannersMap[device] || [];

    const updatedList = list.map(b => {
      if (b.id === editingBanner.id) {
        return {
          ...editingBanner,
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    commitBannersMap({
      ...currentBannersMap,
      [device]: updatedList
    });

    setEditingBanner(null);
  };

  const handleDirectSave = async () => {
    if (!onSaveContent) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await onSaveContent();
      setSaveFeedback('बैनर सफलतापूर्वक सुरक्षित हो गए!');
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveFeedback('सुरक्षित करने में त्रुटि हुई');
    } finally {
      setIsSaving(false);
    }
  };

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      case 'laptop': return <Laptop className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Text Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 via-green-50 to-amber-50 p-5 rounded-3xl border border-emerald-100">
        <div>
          <h3 className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            डिवाइस-वार हीरो बैनर प्रबंधन (Responsive Hero Banners)
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            प्रत्येक स्क्रीन (मोबाइल, टैबलेट, लैपटॉप व डेस्कटॉप) के लिए अलग और सटीक अनुपात में बैनर प्रबंधित करें।
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-xs self-start sm:self-auto">
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-700">बैनर टेक्स्ट (Title/Subtitle)</p>
            <p className="text-[9px] text-gray-400">
              {contentForm.showBannerText !== false ? 'टेक्स्ट चालू है' : 'टेक्स्ट बंद है'}
            </p>
          </div>
          <button 
            type="button"
            id="toggle-banner-text-btn"
            onClick={() => {
              setContentForm(prev => ({
                ...prev,
                showBannerText: prev.showBannerText !== false ? false : true
              }));
            }}
            className={cn(
              "w-12 h-6 rounded-full relative transition-colors duration-200 cursor-pointer",
              contentForm.showBannerText !== false ? "bg-[#2D5A27]" : "bg-gray-300"
            )}
            title="होम स्क्रीन पर बैनर का शीर्षक व उप-शीर्षक दिखाना या छिपाना"
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-xs",
              contentForm.showBannerText !== false ? "left-7" : "left-1"
            )} />
          </button>
        </div>
      </div>

      {/* Device Navigation Tabs */}
      <div className="bg-gray-100/80 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1 border border-gray-200">
        {ORDERED_DEVICE_TYPES.map(type => {
          const meta = DEVICE_METADATA[type];
          const count = (currentBannersMap[type] || []).length;
          const isActive = activeDeviceTab === type;

          return (
            <button
              key={type}
              type="button"
              id={`tab-device-${type}`}
              onClick={() => setActiveDeviceTab(type)}
              className={cn(
                "flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 relative cursor-pointer",
                isActive
                  ? "bg-white text-[#2D5A27] shadow-sm border border-emerald-100"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              <span className="text-base">{meta.iconText}</span>
              <span>{meta.hindiLabel}</span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-black ml-1",
                isActive 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-gray-200 text-gray-600"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Device Specification & Guidelines Card */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl shrink-0 text-emerald-700">
              {activeDeviceMeta.iconText}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                {activeDeviceMeta.hindiLabel} हीरो बैनर ({activeDeviceMeta.label} Banners)
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold border border-gray-200">
                  अनुपात: {activeDeviceMeta.aspectRatioLabel}
                </span>
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">{activeDeviceMeta.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              id="btn-add-device-banner"
              onClick={() => {
                setNewBanner({
                  image: '',
                  title: '',
                  subtitle: '',
                  link: '',
                  isActive: true
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#2D5A27] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#23471f] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + नया Hero Banner जोड़ें
            </button>

            {onSaveContent && (
              <button
                type="button"
                id="btn-save-device-banners"
                onClick={handleDirectSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="सभी डिवाइस बैनर तुरंत डेटाबेस में सुरक्षित करें"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'सुरक्षित हो रहा है...' : 'परिवर्तन सुरक्षित करें'}
              </button>
            )}
          </div>
        </div>

        {saveFeedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            {saveFeedback}
          </div>
        )}

        {/* Recommended dimensions banner */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>सर्वश्रेष्ठ प्रदर्शन के लिए अनुशंसित आकार:</strong> {activeDeviceMeta.recommendedResolution}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
            सुरक्षित क्रॉपिंग व नो-स्ट्रेच गारंटी
          </span>
        </div>
      </div>

      {/* Fallback Warning if 0 banners for this device */}
      {activeDeviceBanners.length === 0 && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-3xl p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h4 className="font-bold text-amber-900 text-base">
              इस डिवाइस के लिए कोई Hero Banner उपलब्ध नहीं है!
            </h4>
            <p className="text-xs text-amber-700 max-w-md mx-auto mt-1">
              खाली स्क्रीन से बचने के लिए अभी सिस्टम डिफ़ॉल्ट बैनर दिखा रहा है। कृपया कम से कम 1 बैनर अवश्य जोड़ें।
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            + इस डिवाइस के लिए बैनर जोड़ें
          </button>
        </div>
      )}

      {/* Banners List */}
      <div className="space-y-4">
        {activeDeviceBanners.map((banner, idx) => {
          const isOnlyBanner = activeDeviceBanners.length <= 1;

          return (
            <motion.div
              key={banner.id}
              layout
              className={cn(
                "bg-white rounded-3xl p-5 border transition-all duration-200 shadow-xs group",
                banner.isActive === false 
                  ? "border-gray-200 opacity-80 bg-gray-50/50" 
                  : "border-gray-200 hover:border-emerald-200 hover:shadow-md"
              )}
            >
              {/* Top Bar of Banner Card */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    {activeDeviceMeta.iconText} {activeDeviceMeta.hindiLabel} बैनर
                  </span>
                  <span className={cn(
                    "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase",
                    banner.isActive !== false 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-gray-200 text-gray-600 border border-gray-300"
                  )}>
                    {banner.isActive !== false ? 'सक्रिय (Active)' : 'निष्क्रिय (Hidden)'}
                  </span>
                  {idx === 0 && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                      स्लाइडर में पहला (First Slide)
                    </span>
                  )}
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveBanner(activeDeviceTab, idx, 'up')}
                    title={idx === 0 ? "पहले स्थान पर है" : "ऊपर ले जाएं (Move Up)"}
                    className={cn(
                      "p-2 rounded-xl transition-all cursor-pointer",
                      idx === 0
                        ? "text-gray-300 bg-gray-50 cursor-not-allowed opacity-40"
                        : "text-amber-600 bg-amber-50 hover:bg-amber-100 active:scale-90"
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={idx === activeDeviceBanners.length - 1}
                    onClick={() => handleMoveBanner(activeDeviceTab, idx, 'down')}
                    title={idx === activeDeviceBanners.length - 1 ? "अंतिम स्थान पर है" : "नीचे ले जाएं (Move Down)"}
                    className={cn(
                      "p-2 rounded-xl transition-all cursor-pointer",
                      idx === activeDeviceBanners.length - 1
                        ? "text-gray-300 bg-gray-50 cursor-not-allowed opacity-40"
                        : "text-amber-600 bg-amber-50 hover:bg-amber-100 active:scale-90"
                    )}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  {/* Toggle Active / Inactive */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(activeDeviceTab, banner.id)}
                    title={banner.isActive !== false ? "बैनर छिपाएं (Deactivate)" : "बैनर दिखाएं (Activate)"}
                    className={cn(
                      "p-2 rounded-xl transition-all cursor-pointer",
                      banner.isActive !== false 
                        ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                        : "text-gray-500 bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    {banner.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingBanner({ ...banner })}
                    title="बैनर संपादित करें (Edit Banner)"
                    className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete Button with Critical 1-Banner Rule */}
                  <button
                    type="button"
                    disabled={isOnlyBanner}
                    onClick={() => {
                      if (isOnlyBanner) return;
                      setBannerToDelete({ banner, device: activeDeviceTab });
                    }}
                    title={
                      isOnlyBanner 
                        ? "कम से कम 1 बैनर हमेशा होना चाहिए (अंतिम बैनर डिलीट नहीं किया जा सकता)" 
                        : "बैनर हटाएं (Delete Banner)"
                    }
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isOnlyBanner
                        ? "text-gray-300 bg-gray-100 cursor-not-allowed opacity-40"
                        : "text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 cursor-pointer"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Content: Aspect-Ratio Frame Preview + Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 items-center">
                {/* Visual Frame Preview */}
                <div className="md:col-span-6 lg:col-span-5">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                      <span>लाइव डिस्प्ले प्रीव्यू ({activeDeviceMeta.aspectRatioLabel})</span>
                      <span className="text-emerald-700 font-semibold">{activeDeviceMeta.label} View</span>
                    </span>

                    {/* Frame styled to match the device aspect ratio */}
                    <div className={cn(
                      "relative w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 bg-gradient-to-br from-emerald-900 via-green-800 to-[#1f3d1b]",
                      activeDeviceTab === 'mobile' && "aspect-[5/4] max-w-[320px] mx-auto",
                      activeDeviceTab === 'tablet' && "aspect-[16/9]",
                      activeDeviceTab === 'laptop' && "aspect-[21/9]",
                      activeDeviceTab === 'desktop' && "aspect-[24/9]"
                    )}>
                      {banner.image ? (
                        <SmartImage
                          src={banner.image}
                          alt={banner.title || 'Banner Preview'}
                          className="absolute inset-0 w-full h-full"
                          objectFit="cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white/70">
                          <Layers className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-[11px] font-bold">कोई फोटो अपलोड नहीं है</p>
                          <p className="text-[9px] text-white/50">डिफ़ॉल्ट ग्रेडिएंट बैकग्राउंड सक्रिय</p>
                        </div>
                      )}

                      {/* Live Text Overlay Preview */}
                      {contentForm.showBannerText !== false && (banner.title || banner.subtitle) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-white pointer-events-none">
                          {banner.title && (
                            <h5 className="text-xs md:text-sm font-bold line-clamp-1 text-white drop-shadow-md">
                              {banner.title}
                            </h5>
                          )}
                          {banner.subtitle && (
                            <p className="text-[10px] md:text-[11px] text-white/90 line-clamp-1 drop-shadow-sm">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details & Quick Edit */}
                <div className="md:col-span-6 lg:col-span-7 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">शीर्षक (Title)</span>
                    <p className="font-bold text-gray-900 text-sm md:text-base mt-0.5">
                      {banner.title || <span className="text-gray-400 italic">कोई शीर्षक नहीं दिया गया</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">उप-शीर्षक (Subtitle)</span>
                    <p className="text-xs md:text-sm text-gray-600 mt-0.5 font-medium">
                      {banner.subtitle || <span className="text-gray-400 italic">कोई उप-शीर्षक नहीं</span>}
                    </p>
                  </div>

                  {banner.link && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>लिंक: {banner.link}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-[11px] text-gray-400">
                    <span>क्रम संख्या: {banner.displayOrder}</span>
                    <button
                      type="button"
                      onClick={() => setEditingBanner({ ...banner })}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      फोटो या टेक्स्ट बदलें
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ADD BANNER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
                    {activeDeviceMeta.iconText}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">
                      नया {activeDeviceMeta.hindiLabel} Hero Banner जोड़ें
                    </h4>
                    <p className="text-xs text-gray-500">
                      अनुशंसित आकार: {activeDeviceMeta.recommendedResolution}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <DualImageInput
                  label={`${activeDeviceMeta.hindiLabel} बैनर फोटो (Banner Image)`}
                  value={newBanner.image}
                  onChange={source => setNewBanner(prev => ({ ...prev, image: source }))}
                  description={`इस डिवाइस के लिए ${activeDeviceMeta.aspectRatioLabel} अनुपात वाली तस्वीर अपलोड करें।`}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">शीर्षक (Title - वैकल्पिक)</label>
                  <input
                    type="text"
                    value={newBanner.title}
                    onChange={e => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="जैसे: खाद और बीज पर भारी छूट!"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-3.5 text-sm outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">उप-शीर्षक (Subtitle - वैकल्पिक)</label>
                  <input
                    type="text"
                    value={newBanner.subtitle}
                    onChange={e => setNewBanner(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="जैसे: सीमित समय के लिए विशेष ऑफर"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-3.5 text-sm outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">क्लिक लिंक / एक्शन URL (वैकल्पिक)</label>
                  <input
                    type="text"
                    value={newBanner.link}
                    onChange={e => setNewBanner(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="जैसे: /products या /schemes या /agri-news"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-3.5 text-sm outline-none transition-all font-medium"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-800">बैनर स्थिति (Active Status)</p>
                    <p className="text-[11px] text-gray-500">तुरंत होम स्क्रीन पर दिखाना शुरू करें</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBanner(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors duration-200 cursor-pointer",
                      newBanner.isActive ? "bg-[#2D5A27]" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-xs",
                      newBanner.isActive ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleAddNewBanner}
                  className="px-6 py-2.5 rounded-xl bg-[#2D5A27] text-white font-bold text-xs hover:bg-[#23471f] active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  बैनर जोड़ें (Add Banner)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT BANNER MODAL */}
      <AnimatePresence>
        {editingBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">
                      {DEVICE_METADATA[editingBanner.deviceType].hindiLabel} बैनर संपादित करें
                    </h4>
                    <p className="text-xs text-gray-500">
                      क्रम #{editingBanner.displayOrder} • {DEVICE_METADATA[editingBanner.deviceType].recommendedResolution}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <DualImageInput
                  label={`${DEVICE_METADATA[editingBanner.deviceType].hindiLabel} बैनर फोटो (Banner Image)`}
                  value={editingBanner.image}
                  onChange={source => setEditingBanner(prev => prev ? { ...prev, image: source } : null)}
                  description={`अनुपात: ${DEVICE_METADATA[editingBanner.deviceType].aspectRatioLabel}`}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">शीर्षक (Title)</label>
                  <input
                    type="text"
                    value={editingBanner.title || ''}
                    onChange={e => setEditingBanner(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-3.5 text-sm outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">उप-शीर्षक (Subtitle)</label>
                  <input
                    type="text"
                    value={editingBanner.subtitle || ''}
                    onChange={e => setEditingBanner(prev => prev ? { ...prev, subtitle: e.target.value } : null)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-3.5 text-sm outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">क्लिक लिंक (Redirect URL)</label>
                  <input
                    type="text"
                    value={editingBanner.link || ''}
                    onChange={e => setEditingBanner(prev => prev ? { ...prev, link: e.target.value } : null)}
                    placeholder="जैसे: /products"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl p-3.5 text-sm outline-none transition-all font-medium"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-800">सक्रिय स्थिति (Active)</p>
                    <p className="text-[11px] text-gray-500">क्या यह बैनर होम स्लाइडर में दिखेगा</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBanner(prev => prev ? { ...prev, isActive: prev.isActive === false ? true : false } : null)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors duration-200 cursor-pointer",
                      editingBanner.isActive !== false ? "bg-[#2D5A27]" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-xs",
                      editingBanner.isActive !== false ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleUpdateEditingBanner}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  बदलाव सुरक्षित करें (Save Changes)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {bannerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="font-bold text-gray-900 text-base">
                  क्या आप इस Hero Banner को हटाना चाहते हैं?
                </h4>
                <p className="text-xs text-gray-500">
                  {bannerToDelete.banner.title ? `"${bannerToDelete.banner.title}"` : `${DEVICE_METADATA[bannerToDelete.device].hindiLabel} बैनर #${bannerToDelete.banner.displayOrder}`} को हटाया जा रहा है।
                </p>
              </div>

              <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl text-[11px] text-red-700 text-center font-medium">
                यह बैनर {DEVICE_METADATA[bannerToDelete.device].hindiLabel} होम स्लाइडर से हमेशा के लिए हट जाएगा।
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBannerToDelete(null)}
                  className="py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-xs"
                >
                  हाँ, हटाएं (Confirm Delete)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDeviceBannerManager;
