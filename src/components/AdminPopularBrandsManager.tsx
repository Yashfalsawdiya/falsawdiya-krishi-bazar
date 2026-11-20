import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Eye,
  EyeOff,
  Check,
  X,
  Search,
  Sprout,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ImageSource } from '../types';
import { AppContent } from '../context/AppContext';
import DualImageInput from './DualImageInput';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export interface PopularBrandItem {
  id: string;
  name: string;
  logo: string | ImageSource;
  isActive?: boolean;
}

interface AdminPopularBrandsManagerProps {
  contentForm: AppContent;
  setContentForm: React.Dispatch<React.SetStateAction<AppContent>>;
  onSaveContent?: (nextContent?: AppContent) => Promise<void>;
}

const AdminPopularBrandsManager: React.FC<AdminPopularBrandsManagerProps> = ({
  contentForm,
  setContentForm,
  onSaveContent,
}) => {
  const partners: PopularBrandItem[] = useMemo(() => {
    return Array.isArray(contentForm?.partners) ? contentForm.partners : [];
  }, [contentForm?.partners]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<{ brand: PopularBrandItem; index: number } | null>(null);

  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState<string | ImageSource>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const stats = useMemo(() => {
    const total = partners.length;
    const active = partners.filter((p) => p.isActive !== false).length;
    const hidden = total - active;
    return { total, active, hidden };
  }, [partners]);

  const isFiltering = searchQuery.trim().length > 0;

  const filteredPartnersWithIndex = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return partners
      .map((brand, index) => ({ brand, index }))
      .filter(({ brand }) => !q || (brand.name || '').toLowerCase().includes(q));
  }, [partners, searchQuery]);

  const persistPartners = async (nextPartners: PopularBrandItem[], feedbackText?: string) => {
    const nextContent: AppContent = {
      ...contentForm,
      partners: nextPartners,
    };
    setContentForm(nextContent);

    if (onSaveContent) {
      setIsSaving(true);
      try {
        await onSaveContent(nextContent);
        if (feedbackText) {
          setStatusMessage({ type: 'success', text: feedbackText });
        }
      } catch (err) {
        console.error('Failed to save Popular Brands:', err);
        setStatusMessage({
          type: 'error',
          text: 'डेटाबेस में सेव करने में त्रुटि हुई। कृपया नीचे "सुरक्षित करें" बटन से पुनः प्रयास करें।',
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setFormName('');
    setFormLogo('');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (brand: PopularBrandItem, index: number) => {
    setEditingIndex(index);
    setFormName(brand.name || '');
    setFormLogo(brand.logo || '');
    setFormIsActive(brand.isActive !== false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('कृपया कंपनी / ब्रांड का नाम दर्ज करें।');
      return;
    }

    const updatedList = [...partners];
    if (editingIndex !== null && updatedList[editingIndex]) {
      updatedList[editingIndex] = {
        ...updatedList[editingIndex],
        name: trimmedName,
        logo: formLogo,
        isActive: formIsActive,
      };
      setIsModalOpen(false);
      await persistPartners(updatedList, `"${trimmedName}" ब्रांड अपडेट होकर सेव हो गया!`);
    } else {
      const newBrand: PopularBrandItem = {
        id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        name: trimmedName,
        logo: formLogo,
        isActive: formIsActive,
      };
      updatedList.push(newBrand);
      setIsModalOpen(false);
      await persistPartners(updatedList, `"${trimmedName}" नया ब्रांड जोड़कर सेव कर दिया गया!`);
    }
  };

  const handleMoveBrand = async (index: number, direction: 'up' | 'down') => {
    if (isFiltering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= partners.length) return;

    const updatedList = [...partners];
    const [moved] = updatedList.splice(index, 1);
    updatedList.splice(targetIndex, 0, moved);
    await persistPartners(updatedList, 'ब्रांड क्रम (Display Order) अपडेट हो गया!');
  };

  const handleToggleVisibility = async (index: number) => {
    const updatedList = [...partners];
    const current = updatedList[index];
    if (!current) return;
    const nextActive = current.isActive === false ? true : false;
    updatedList[index] = {
      ...current,
      isActive: nextActive,
    };
    await persistPartners(
      updatedList,
      nextActive
        ? `"${current.name || 'ब्रांड'}" अब होम पेज पर दिखेगा।`
        : `"${current.name || 'ब्रांड'}" को होम पेज से छिपा दिया गया है।`
    );
  };

  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    const { brand, index } = brandToDelete;
    setBrandToDelete(null);

    const updatedList = partners.filter((_, i) => i !== index);
    await persistPartners(updatedList, `"${brand.name || 'ब्रांड'}" हटा दिया गया है।`);
  };

  const handleManualSave = async () => {
    await persistPartners(partners, 'सभी Popular Brands सफलतापूर्वक सुरक्षित हो गए!');
  };

  const hasLogoValue = (logo: string | ImageSource | undefined) => {
    if (!logo) return false;
    if (typeof logo === 'string') return logo.trim().length > 0;
    return Boolean(logo.primary?.trim() || logo.fallback?.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-amber-50 p-5 rounded-3xl border border-emerald-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center shadow-sm shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2 flex-wrap">
                Popular Brands प्रबंधन (Partner Logos)
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                होम पेज पर दिखने वाली कृषि कंपनियों के नाम, लोगो, दृश्यता (ON/OFF) और दिखाने का क्रम यहाँ से नियंत्रित करें।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              id="btn-add-popular-brand"
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-[#2D5A27] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#23471f] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              नया ब्रांड जोड़ें
            </button>

            {onSaveContent && (
              <button
                type="button"
                id="btn-save-popular-brands-top"
                onClick={handleManualSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSaving ? 'सुरक्षित हो रहा है...' : 'परिवर्तन सुरक्षित करें'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="bg-white/90 rounded-2xl px-3.5 py-2.5 border border-emerald-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">कुल ब्रांड्स</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-white/90 rounded-2xl px-3.5 py-2.5 border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">सक्रिय (दिख रहे हैं)</p>
            <p className="text-lg font-black text-[#2D5A27] mt-0.5">{stats.active}</p>
          </div>
          <div className="bg-white/90 rounded-2xl px-3.5 py-2.5 border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">छिपे हुए (Hidden)</p>
            <p className="text-lg font-black text-gray-600 mt-0.5">{stats.hidden}</p>
          </div>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div
          className={cn(
            'p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-2xs',
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Search Bar */}
      {partners.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="कंपनी / ब्रांड के नाम से खोजें (जैसे: Bayer, Syngenta)..."
              className="w-full bg-gray-50 border border-gray-200 focus:border-[#2D5A27] focus:bg-white rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm outline-none transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                title="खोज साफ़ करें"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {isFiltering && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shrink-0">
              क्रम (Order) बदलने के लिए खोज साफ़ करें
            </span>
          )}
        </div>
      )}

      {/* Brands Grid */}
      {filteredPartnersWithIndex.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center mx-auto">
            <Sprout className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-gray-800 text-base">
            {isFiltering ? 'कोई मिलता-जुलता ब्रांड नहीं मिला' : 'अभी कोई Popular Brand नहीं जोड़ा गया है'}
          </h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {isFiltering
              ? 'कृपया दूसरा नाम खोजें या खोज फ़िल्टर हटाएँ।'
              : 'ऊपर दिए गए "नया ब्रांड जोड़ें" बटन पर क्लिक करके अपनी पहली कंपनी और उसका लोगो जोड़ें।'}
          </p>
          {!isFiltering && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 bg-[#2D5A27] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#23471f] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> पहला ब्रांड जोड़ें
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPartnersWithIndex.map(({ brand, index }) => {
            const isVisible = brand.isActive !== false;
            const hasLogo = hasLogoValue(brand.logo);

            return (
              <div
                key={`${brand.id}-${index}`}
                className={cn(
                  'bg-white rounded-3xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between gap-4',
                  isVisible
                    ? 'border-gray-200/90 hover:border-emerald-300'
                    : 'border-gray-200 bg-gray-50/70 opacity-85'
                )}
              >
                {/* Top Row: Order & Status Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                      #{index + 1}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border',
                        isVisible
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      )}
                    >
                      {isVisible ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" /> सक्रिय (दिख रहा है)
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-gray-500" /> छिपा हुआ (Hidden)
                        </>
                      )}
                    </span>
                  </div>

                  {/* Quick Up/Down Reorder */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFiltering || index === 0 || isSaving}
                      onClick={() => handleMoveBrand(index, 'up')}
                      title="ऊपर ले जाएँ (Move Up)"
                      className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-[#2D5A27] hover:border-emerald-300 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isFiltering || index === partners.length - 1 || isSaving}
                      onClick={() => handleMoveBrand(index, 'down')}
                      title="नीचे ले जाएँ (Move Down)"
                      className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-[#2D5A27] hover:border-emerald-300 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Logo Preview & Name */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 rounded-2xl bg-white border border-gray-200 p-2 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    {hasLogo ? (
                      <SmartImage
                        src={brand.logo}
                        alt={brand.name || 'Brand Logo'}
                        className="w-full h-full"
                        objectFit="contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Sprout className="w-5 h-5 text-emerald-600/60" />
                        <span className="text-[9px] font-bold mt-0.5">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-extrabold text-gray-900 text-base truncate">
                      {brand.name || '(बिना नाम का ब्रांड)'}
                    </h4>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                      <ExternalLink className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate">
                        क्लिक लिंक: उत्पाद खोज ({brand.name || '...'})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Bottom Action Toolbar (Always Accessible on Mobile & Desktop) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleToggleVisibility(index)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer disabled:opacity-50',
                      isVisible
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    )}
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isVisible ? 'छिपाएँ' : 'दिखाएँ'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => openEditModal(brand, index)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-gray-50 text-gray-800 border border-gray-200 hover:bg-emerald-50 hover:text-[#2D5A27] hover:border-emerald-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>सुधारें</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setBrandToDelete({ brand, index })}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हटाएँ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Brand Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="relative bg-white w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {editingIndex !== null ? 'ब्रांड सुधारें (Edit Brand)' : 'नया ब्रांड जोड़ें (Add Brand)'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    कंपनी का नाम और लोगो अपलोड या लिंक से सेट करें
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-5">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    कंपनी / ब्रांड का नाम *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="जैसे: Bayer, Syngenta, UPL, Corteva"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-semibold text-sm"
                  />
                </div>

                <DualImageInput
                  label="कंपनी लोगो (Company Logo)"
                  value={formLogo}
                  onChange={(source) => setFormLogo(source)}
                  description="PNG/WEBP पारदर्शी या सफेद बैकग्राउंड वाला लोगो सबसे अच्छा दिखता है।"
                />

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-800">होम पेज पर दिखाएँ (Visibility)</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formIsActive
                        ? 'यह ब्रांड सभी किसानों को Home Page पर दिखाई देगा।'
                        : 'यह ब्रांड सूची में सुरक्षित रहेगा लेकिन Home Page पर छिपा रहेगा।'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormIsActive((prev) => !prev)}
                    className={cn(
                      'w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer',
                      formIsActive ? 'bg-[#2D5A27]' : 'bg-gray-300'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-xs',
                        formIsActive ? 'left-7' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {/* Live Home Page Carousel Card Preview */}
                <div className="bg-[#FAF8F5] border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Home Page कार्ड प्रीव्यू
                  </span>
                  <div className="flex flex-col justify-between w-[142px] h-[96px] p-2.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
                    <div className="w-full h-12 flex items-center justify-center px-1 py-0.5">
                      {hasLogoValue(formLogo) ? (
                        <SmartImage
                          src={formLogo}
                          alt={formName || 'Preview'}
                          className="w-full h-full"
                          objectFit="contain"
                        />
                      ) : (
                        <span className="text-[11px] font-black text-[#2D5A27] tracking-tight truncate">
                          {formName || 'Brand'}
                        </span>
                      )}
                    </div>
                    <div className="w-full pt-1 border-t border-gray-100 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-gray-600 truncate max-w-[110px] text-center leading-tight">
                        {formName || 'कंपनी नाम'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3.5 px-4 bg-[#2D5A27] hover:bg-[#23471f] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {editingIndex !== null ? 'बदलाव सुरक्षित करें' : 'ब्रांड जोड़ें'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {brandToDelete && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBrandToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] p-7 text-center shadow-2xl space-y-5"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-gray-900">क्या आप सुनिश्चित हैं?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  क्या आप <span className="font-bold text-gray-900">"{brandToDelete.brand.name || 'इस ब्रांड'}"</span> को Popular Brands सूची से हटाना चाहते हैं?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBrandToDelete(null)}
                  className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  नहीं (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                >
                  हाँ, हटाएँ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPopularBrandsManager;
