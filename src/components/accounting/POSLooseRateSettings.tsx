import React, { useState, useEffect } from 'react';
import {
  Droplet,
  Scale,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CustomLooseRateOption,
  LooseRateCategory,
  POSLooseRateSettings,
} from '../../types/accounting';
import {
  fetchPOSLooseRateSettings,
  savePOSLooseRateSettings,
} from '../../services/accountingService';
import {
  getCachedLooseRateSettings,
  getDefaultLooseRateOptions,
  getLooseRateOptions,
  validateAndBuildCustomLooseRateOption,
} from '../../utils/agriPackagingUtils';

interface Props {
  onSettingsUpdated?: (settings: POSLooseRateSettings) => void;
  onClose?: () => void;
}

interface CategoryFormState {
  value: string;
  unit: 'ml' | 'L' | 'g' | 'kg';
  editingId: string | null;
  error: string | null;
}

export const POSLooseRateSettingsManager: React.FC<Props> = ({ onSettingsUpdated, onClose }) => {
  const [settings, setSettings] = useState<POSLooseRateSettings>(() => getCachedLooseRateSettings());
  const [loading, setLoading] = useState<boolean>(true);
  const [savingCategory, setSavingCategory] = useState<LooseRateCategory | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [liquidForm, setLiquidForm] = useState<CategoryFormState>({
    value: '',
    unit: 'ml',
    editingId: null,
    error: null,
  });

  const [solidForm, setSolidForm] = useState<CategoryFormState>({
    value: '',
    unit: 'g',
    editingId: null,
    error: null,
  });

  const loadSettings = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const latest = await fetchPOSLooseRateSettings();
      setSettings(latest);
      if (onSettingsUpdated) onSettingsUpdated(latest);
    } catch (err: any) {
      setGlobalError(err?.message || 'सेटिंग्स लोड करने में समस्या आई।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const persistSettings = async (
    nextSettings: POSLooseRateSettings,
    category: LooseRateCategory,
    message: string
  ) => {
    setSavingCategory(category);
    setGlobalError(null);
    setSuccessMessage(null);
    try {
      const saved = await savePOSLooseRateSettings(nextSettings);
      setSettings(saved);
      if (onSettingsUpdated) onSettingsUpdated(saved);
      setSuccessMessage(message);
    } catch (err: any) {
      setGlobalError(err?.message || 'Firestore में सुरक्षित करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setSavingCategory(null);
    }
  };

  const handleAddOrUpdateOption = async (
    e: React.FormEvent,
    category: LooseRateCategory
  ) => {
    e.preventDefault();
    const form = category === 'liquid' ? liquidForm : solidForm;
    const setForm = category === 'liquid' ? setLiquidForm : setSolidForm;
    const existingList = category === 'liquid' ? settings.liquid : settings.solid;

    const result = validateAndBuildCustomLooseRateOption({
      category,
      rawValue: form.value,
      unit: form.unit,
      existingCustomOptions: existingList,
      editingId: form.editingId || undefined,
    });

    if (result.valid === false) {
      const validationError = result.error;
      setForm(prev => ({ ...prev, error: validationError }));
      return;
    }

    const updatedList = form.editingId
      ? existingList.map(item => (item.id === form.editingId ? result.option : item))
      : [...existingList, result.option];

    const nextSettings: POSLooseRateSettings = {
      ...settings,
      [category]: updatedList,
      updatedAt: Date.now(),
    };

    const actionText = form.editingId
      ? `कस्टम विकल्प "/ ${result.option.label}" सफलतापूर्वक अपडेट किया गया।`
      : `नया कस्टम विकल्प "/ ${result.option.label}" सफलतापूर्वक जोड़ा गया।`;

    await persistSettings(nextSettings, category, actionText);

    setForm({
      value: '',
      unit: category === 'liquid' ? 'ml' : 'g',
      editingId: null,
      error: null,
    });
  };

  const handleStartEdit = (category: LooseRateCategory, opt: CustomLooseRateOption) => {
    const setForm = category === 'liquid' ? setLiquidForm : setSolidForm;
    setConfirmDeleteId(null);
    setForm({
      value: String(opt.value),
      unit: opt.unit,
      editingId: opt.id,
      error: null,
    });
  };

  const handleCancelEdit = (category: LooseRateCategory) => {
    const setForm = category === 'liquid' ? setLiquidForm : setSolidForm;
    setForm({
      value: '',
      unit: category === 'liquid' ? 'ml' : 'g',
      editingId: null,
      error: null,
    });
  };

  const handleDeleteOption = async (category: LooseRateCategory, opt: CustomLooseRateOption) => {
    const existingList = category === 'liquid' ? settings.liquid : settings.solid;
    const updatedList = existingList.filter(item => item.id !== opt.id);
    const nextSettings: POSLooseRateSettings = {
      ...settings,
      [category]: updatedList,
      updatedAt: Date.now(),
    };

    setConfirmDeleteId(null);
    const form = category === 'liquid' ? liquidForm : solidForm;
    if (form.editingId === opt.id) {
      handleCancelEdit(category);
    }

    await persistSettings(
      nextSettings,
      category,
      `कस्टम विकल्प "/ ${opt.label}" हटाया गया (पुराने बिल सुरक्षित हैं)।`
    );
  };

  const renderCategoryCard = (category: LooseRateCategory) => {
    const isLiquid = category === 'liquid';
    const form = isLiquid ? liquidForm : solidForm;
    const setForm = isLiquid ? setLiquidForm : setSolidForm;
    const customList = isLiquid ? settings.liquid : settings.solid;
    const defaults = getDefaultLooseRateOptions(isLiquid ? 'ml' : 'g');
    const mergedPreview = getLooseRateOptions(isLiquid ? 'ml' : 'g', settings);
    const isSaving = savingCategory === category;

    const unitChoices: Array<'ml' | 'L' | 'g' | 'kg'> = isLiquid ? ['ml', 'L'] : ['g', 'kg'];
    const parsedNum = Number(form.value);
    const isPreviewValid = Number.isFinite(parsedNum) && parsedNum > 0;
    const previewCleanVal = isPreviewValid ? Number(parsedNum.toFixed(3)) : 0;
    const previewBaseQty = isPreviewValid
      ? Math.round((form.unit === 'L' || form.unit === 'kg' ? previewCleanVal * 1000 : previewCleanVal) * 1000) / 1000
      : 0;

    return (
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-5 space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isLiquid ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isLiquid ? <Droplet className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                {isLiquid ? 'Liquid उत्पाद दर विकल्प (ml / L)' : 'Solid / Powder उत्पाद दर विकल्प (g / kg)'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isLiquid
                  ? 'तरल दवाइयों के POS Selling Rate Dropdown के लिए'
                  : 'पाउडर, दानेदार व खाद के POS Selling Rate Dropdown के लिए'}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
              isLiquid
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {defaults.length} डिफ़ॉल्ट · {customList.length} कस्टम
          </span>
        </div>

        {/* Add / Edit Custom Form */}
        <form
          onSubmit={e => handleAddOrUpdateOption(e, category)}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">
              {form.editingId ? 'कस्टम विकल्प एडिट करें:' : 'नया कस्टम विकल्प जोड़ें:'}
            </span>
            {form.editingId && (
              <button
                type="button"
                onClick={() => handleCancelEdit(category)}
                className="text-[11px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>रद्द करें</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              step="any"
              min="0.001"
              placeholder={isLiquid ? 'उदा. 200 या 2.5' : 'उदा. 200 या 5'}
              value={form.value}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  value: e.target.value,
                  error: null,
                }))
              }
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              disabled={isSaving}
            />

            <select
              value={form.unit}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  unit: e.target.value as CategoryFormState['unit'],
                  error: null,
                }))
              }
              className={`px-3 py-2 rounded-xl text-xs font-bold border focus:ring-2 focus:outline-none cursor-pointer ${
                isLiquid
                  ? 'bg-blue-50 border-blue-200 text-blue-900 focus:ring-blue-500'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900 focus:ring-emerald-500'
              }`}
              disabled={isSaving}
            >
              {unitChoices.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>सेव हो रहा है...</span>
                </>
              ) : form.editingId ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>अपडेट करें</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>जोड़ें</span>
                </>
              )}
            </button>
          </div>

          {isPreviewValid && (
            <div className="text-[11px] text-gray-600 flex items-center justify-between px-1">
              <span>
                Dropdown में दिखेगा: <strong className="text-gray-900">/ {previewCleanVal} {form.unit}</strong>
              </span>
              <span>
                आधार समतुल्य: <strong>{previewBaseQty.toLocaleString('en-IN')} {isLiquid ? 'ml' : 'g'}</strong>
              </span>
            </div>
          )}

          {form.error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-[11px] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{form.error}</span>
            </div>
          )}
        </form>

        {/* Combined Dropdown Preview & Options List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 px-1">
            <span>POS Dropdown क्रम सूची (बड़े से छोटे):</span>
            <span className="text-gray-400 font-medium">कुल {mergedPreview.length} विकल्प</span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
            {mergedPreview.map(opt => {
              const customItem = opt.isCustom
                ? customList.find(c => c.id === opt.id || c.label === opt.label)
                : undefined;
              const isConfirmingDelete = Boolean(customItem && confirmDeleteId === customItem.id);
              const isEditingThis = Boolean(customItem && form.editingId === customItem.id);

              return (
                <div
                  key={`${category}_${opt.label}`}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs ${
                    isEditingThis
                      ? 'bg-amber-50/70'
                      : opt.isCustom
                      ? 'bg-blue-50/40'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-extrabold text-gray-900 font-mono">/ {opt.label}</span>
                    {opt.isCustom ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        कस्टम
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-gray-500" />
                        <span>डिफ़ॉल्ट</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-400 mr-1 hidden sm:inline">
                      ({opt.multiplier} {opt.baseUnit})
                    </span>

                    {customItem ? (
                      isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(category, customItem)}
                            disabled={isSaving}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            पुष्टि करें
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isSaving}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            नहीं
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(category, customItem)}
                            disabled={isSaving}
                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="विकल्प एडिट करें"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(customItem.id)}
                            disabled={isSaving}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="विकल्प हटाएँ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )
                    ) : (
                      <span className="text-[10px] text-gray-400 italic px-1">सुरक्षित</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              POS खुली बिक्री दर विकल्प सेटिंग्स (Loose Selling Rate Options)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Liquid (ml/L) व Solid/Powder (g/kg) के Selling Rate Dropdown में कस्टम मात्रा जोड़ें, एडिट करें या हटाएँ। सभी बदलाव Firestore में सुरक्षित रहते हैं।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading || savingCategory !== null}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>सिंक रिफ्रेश करें</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
              title="सेटिंग्स बंद करें"
            >
              <X className="w-3.5 h-3.5" />
              <span>वापस</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {globalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Liquid & Solid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCategoryCard('liquid')}
        {renderCategoryCard('solid')}
      </div>
    </div>
  );
};

export default POSLooseRateSettingsManager;
