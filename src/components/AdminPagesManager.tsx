import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, FileText, RotateCcw, AlertTriangle, 
  PhoneCall, ShieldAlert, Save, Plus, Trash2, Edit3, CheckCircle2, 
  ExternalLink, Sparkles, RefreshCw, Layers, MapPin, Mail, Phone, Clock, Truck, ChevronDown, ChevronUp, Info, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { 
  LegalPagesContent, 
  AboutUsPageData, 
  PrivacyPolicyPageData, 
  TermsConditionsPageData, 
  RefundPolicyPageData, 
  AiDisclaimerPageData, 
  ChemicalSafetyPageData, 
  ContactUsPageData, 
  PageSectionItem 
} from '../types';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';
import { Link } from 'react-router-dom';

type PageKey = 'aboutUs' | 'privacyPolicy' | 'termsConditions' | 'refundPolicy' | 'aiDisclaimer' | 'chemicalSafety' | 'contactUs';

interface PageMetaConfig {
  key: PageKey;
  label: string;
  hindiTitle: string;
  route: string;
  icon: React.ElementType;
  badgeColor: string;
}

const PAGES_CONFIG: PageMetaConfig[] = [
  {
    key: 'aboutUs',
    label: 'About Us',
    hindiTitle: 'हमारे बारे में',
    route: '/about',
    icon: Building2,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    key: 'privacyPolicy',
    label: 'Privacy Policy',
    hindiTitle: 'गोपनीयता नीति',
    route: '/privacy',
    icon: ShieldCheck,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    key: 'termsConditions',
    label: 'Terms & Conditions',
    hindiTitle: 'नियम एवं शर्तें',
    route: '/terms',
    icon: FileText,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    key: 'refundPolicy',
    label: 'Refund Policy',
    hindiTitle: 'वापसी व रिफंड',
    route: '/refund-policy',
    icon: RotateCcw,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    key: 'aiDisclaimer',
    label: 'AI Disclaimer',
    hindiTitle: 'कृषि एवं AI अस्वीकरण',
    route: '/disclaimer',
    icon: AlertTriangle,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  {
    key: 'chemicalSafety',
    label: 'Chemical Safety',
    hindiTitle: 'रासायनिक सुरक्षा निर्देश',
    route: '/safety-guidelines',
    icon: ShieldAlert,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    key: 'contactUs',
    label: 'Contact Us',
    hindiTitle: 'संपर्क करें',
    route: '/contact',
    icon: PhoneCall,
    badgeColor: 'bg-green-100 text-green-800 border-green-200'
  }
];

export const AdminPagesManager: React.FC = () => {
  const { legalPagesContent, updateLegalPagesContent, resetLegalPageContent } = useAppContext();
  
  const [selectedPage, setSelectedPage] = useState<PageKey>('aboutUs');
  const [localContent, setLocalContent] = useState<Required<LegalPagesContent>>(legalPagesContent || DEFAULT_LEGAL_PAGES_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (legalPagesContent) {
      setLocalContent(legalPagesContent);
    }
  }, [legalPagesContent]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateLegalPagesContent(localContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving legal pages:', err);
      alert('कंटेंट सुरक्षित करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPage = async (pageKey: PageKey) => {
    const pageLabel = PAGES_CONFIG.find(p => p.key === pageKey)?.hindiTitle || pageKey;
    const confirmReset = window.confirm(`क्या आप "${pageLabel}" के सभी बदलाव हटाकर मूल डिफ़ॉल्ट कंटेंट पर रीसेट करना चाहते हैं?`);
    if (!confirmReset) return;

    try {
      setIsSaving(true);
      await resetLegalPageContent(pageKey);
      setLocalContent(prev => ({
        ...prev,
        [pageKey]: DEFAULT_LEGAL_PAGES_CONTENT[pageKey]
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error resetting page:', err);
      alert('रीसेट करने में त्रुटि आई।');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to update specific page object
  const updatePage = <K extends PageKey>(key: K, updater: (prev: Required<LegalPagesContent>[K]) => Required<LegalPagesContent>[K]) => {
    setLocalContent(prev => ({
      ...prev,
      [key]: updater(prev[key])
    }));
  };

  const currentPageConfig = PAGES_CONFIG.find(p => p.key === selectedPage)!;

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-[#2D5A27] rounded-full text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" />
              <span>पेज कंटेंट एवं सूचना संपादक</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#4A3728]">
              पेज व नीतियां प्रबंधन (Legal & Information Pages)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              यहाँ से आप About Us, Privacy Policy, Terms, Refund, AI Disclaimer, Chemical Safety और Contact Us के सभी टेक्स्ट, बुलेट पॉइंट्स व सेक्शन को कभी भी बदल, जोड़ या हटा सकते हैं।
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={currentPageConfig.route}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold border border-gray-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span>पेज देखें ({currentPageConfig.label})</span>
            </Link>

            <button
              onClick={() => handleResetPage(selectedPage)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
              title="इस पेज को मूल डिफ़ॉल्ट पर रीसेट करें"
            >
              <RefreshCw className="w-4 h-4" />
              <span>डिफ़ॉल्ट रीसेट</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D5A27] hover:bg-[#23481f] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#EAB308]" />
              <span>{isSaving ? 'सुरक्षित हो रहा है...' : 'बदलाव सुरक्षित करें'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>कंटेंट सफलतापूर्वक सेव हो गया है! सभी यूज़र्स के लिए तुरंत अपडेट हो जाएगा।</span>
          </div>
        )}

        {/* Horizontal Page Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-gray-100">
          {PAGES_CONFIG.map(page => {
            const Icon = page.icon;
            const isActive = selectedPage === page.key;
            return (
              <button
                key={page.key}
                onClick={() => setSelectedPage(page.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm shadow-emerald-900/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#EAB308]' : 'text-gray-500'}`} />
                <span>{page.hindiTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Content Based on Selected Page */}
      <div className="space-y-6">
        {selectedPage === 'aboutUs' && (
          <AboutUsEditor 
            data={localContent.aboutUs} 
            onChange={updated => updatePage('aboutUs', () => updated)} 
          />
        )}

        {selectedPage === 'privacyPolicy' && (
          <GenericPolicyEditor 
            pageTitle="Privacy Policy (गोपनीयता नीति)"
            data={localContent.privacyPolicy}
            onChange={updated => updatePage('privacyPolicy', () => updated)}
            extraFields={(data, onChange) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">सपोर्ट ईमेल (Support Email)</label>
                  <input
                    type="email"
                    value={data.contactEmail || ''}
                    onChange={e => onChange({ ...data, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">सपोर्ट फोन (Support Phone)</label>
                  <input
                    type="text"
                    value={data.contactPhone || ''}
                    onChange={e => onChange({ ...data, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
                  />
                </div>
              </div>
            )}
          />
        )}

        {selectedPage === 'termsConditions' && (
          <GenericPolicyEditor 
            pageTitle="Terms & Conditions (नियम एवं शर्तें)"
            data={localContent.termsConditions}
            onChange={updated => updatePage('termsConditions', () => updated)}
            extraFields={(data, onChange) => (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">कानूनी क्षेत्राधिकार (Jurisdiction / Governing Law)</label>
                <input
                  type="text"
                  value={data.governingLaw || ''}
                  onChange={e => onChange({ ...data, governingLaw: e.target.value })}
                  placeholder="उदा. मंदसौर (मध्य प्रदेश) क्षेत्राधिकार"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
                />
              </div>
            )}
          />
        )}

        {selectedPage === 'refundPolicy' && (
          <RefundPolicyEditor 
            data={localContent.refundPolicy}
            onChange={updated => updatePage('refundPolicy', () => updated)}
          />
        )}

        {selectedPage === 'aiDisclaimer' && (
          <AiDisclaimerEditor 
            data={localContent.aiDisclaimer}
            onChange={updated => updatePage('aiDisclaimer', () => updated)}
          />
        )}

        {selectedPage === 'chemicalSafety' && (
          <ChemicalSafetyEditor 
            data={localContent.chemicalSafety}
            onChange={updated => updatePage('chemicalSafety', () => updated)}
          />
        )}

        {selectedPage === 'contactUs' && (
          <ContactUsEditor 
            data={localContent.contactUs}
            onChange={updated => updatePage('contactUs', () => updated)}
          />
        )}
      </div>

      {/* Floating Bottom Save Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-emerald-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>संपादित हो रहा है: <strong>{currentPageConfig.hindiTitle}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleResetPage(selectedPage)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            रीसेट करें
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#2D5A27] hover:bg-[#22461e] text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-[#EAB308]" />
            <span>{isSaving ? 'सेव हो रहा है...' : 'सुरक्षित करें'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   SUB-EDITORS FOR INDIVIDUAL PAGES
========================================================= */

/** 1. About Us Editor **/
const AboutUsEditor: React.FC<{
  data: AboutUsPageData;
  onChange: (data: AboutUsPageData) => void;
}> = ({ data, onChange }) => {
  const [newHighlight, setNewHighlight] = useState('');
  const [newService, setNewService] = useState({ title: '', desc: '' });

  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    onChange({
      ...data,
      highlights: [...(data.highlights || []), newHighlight.trim()]
    });
    setNewHighlight('');
  };

  const removeHighlight = (index: number) => {
    onChange({
      ...data,
      highlights: data.highlights.filter((_, i) => i !== index)
    });
  };

  const addService = () => {
    if (!newService.title.trim()) return;
    onChange({
      ...data,
      services: [
        ...(data.services || []),
        { id: `s_${Date.now()}`, title: newService.title.trim(), desc: newService.desc.trim() }
      ]
    });
    setNewService({ title: '', desc: '' });
  };

  const removeService = (id: string) => {
    onChange({
      ...data,
      services: data.services.filter(s => s.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#2D5A27]" />
          <span>शीर्ष बैनर एवं मुख्य परिचय (Banner & Introduction)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">पेज शीर्षक (Banner Title)</label>
            <input
              type="text"
              value={data.bannerTitle || ''}
              onChange={e => onChange({ ...data, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">उप-शीर्षक (Banner Subtitle)</label>
            <input
              type="text"
              value={data.bannerSubtitle || ''}
              onChange={e => onChange({ ...data, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">मुख्य परिचय टेक्स्ट (Intro Text)</label>
          <textarea
            rows={3}
            value={data.introText || ''}
            onChange={e => onChange({ ...data, introText: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
          />
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>हमारा लक्ष्य एवं दृष्टि (Mission & Vision)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">मिशन शीर्षक (Mission Title)</label>
            <input
              type="text"
              value={data.missionTitle || ''}
              onChange={e => onChange({ ...data, missionTitle: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27]"
            />
            <label className="block text-xs font-bold text-gray-700">मिशन विवरण (Mission Text)</label>
            <textarea
              rows={3}
              value={data.missionText || ''}
              onChange={e => onChange({ ...data, missionText: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">विज़न शीर्षक (Vision Title)</label>
            <input
              type="text"
              value={data.visionTitle || ''}
              onChange={e => onChange({ ...data, visionTitle: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27]"
            />
            <label className="block text-xs font-bold text-gray-700">विज़न विवरण (Vision Text)</label>
            <textarea
              rows={3}
              value={data.visionText || ''}
              onChange={e => onChange({ ...data, visionText: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27]"
            />
          </div>
        </div>

        {/* Story */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <label className="block text-xs font-bold text-gray-700">हमारी पृष्ठभूमि व कहानी (Our Story)</label>
          <input
            type="text"
            value={data.storyTitle || ''}
            onChange={e => onChange({ ...data, storyTitle: e.target.value })}
            placeholder="कहानी शीर्षक"
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] mb-2"
          />
          <textarea
            rows={3}
            value={data.storyText || ''}
            onChange={e => onChange({ ...data, storyText: e.target.value })}
            placeholder="पृष्ठभूमि का संपूर्ण विवरण..."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27]"
          />
        </div>
      </div>

      {/* Services Manager */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>मुख्य सेवाएँ एवं सुविधाएँ (Services List)</span>
          </span>
          <span className="text-xs text-gray-400 font-normal">{data.services?.length || 0} सेवाएँ</span>
        </h3>

        <div className="space-y-2.5">
          {data.services?.map((serv, index) => (
            <div key={serv.id || index} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <input
                  type="text"
                  value={serv.title}
                  onChange={e => {
                    const newServices = [...data.services];
                    newServices[index].title = e.target.value;
                    onChange({ ...data, services: newServices });
                  }}
                  className="w-full font-bold text-xs bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-[#4A3728]"
                />
                <textarea
                  rows={2}
                  value={serv.desc}
                  onChange={e => {
                    const newServices = [...data.services];
                    newServices[index].desc = e.target.value;
                    onChange({ ...data, services: newServices });
                  }}
                  className="w-full text-[11px] bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600"
                />
              </div>
              <button
                onClick={() => removeService(serv.id)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                title="सेवा हटाएं"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Service */}
        <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2">
          <p className="text-xs font-bold text-[#2D5A27]">➕ नई सेवा जोड़ें</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="सेवा का नाम / शीर्षक"
              value={newService.title}
              onChange={e => setNewService({ ...newService, title: e.target.value })}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-gray-200"
            />
            <input
              type="text"
              placeholder="सेवा का संक्षिप्त विवरण"
              value={newService.desc}
              onChange={e => setNewService({ ...newService, desc: e.target.value })}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-gray-200"
            />
          </div>
          <button
            onClick={addService}
            disabled={!newService.title.trim()}
            className="px-3.5 py-1.5 bg-[#2D5A27] text-white font-bold text-xs rounded-xl disabled:opacity-40"
          >
            सेवा जोड़ें
          </button>
        </div>
      </div>

      {/* Highlights / Key Bullet Points */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>विशेषताएँ एवं मुख्य बिंदु (Key Highlights)</span>
          </span>
        </h3>

        <div className="space-y-2">
          {data.highlights?.map((hl, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              <input
                type="text"
                value={hl}
                onChange={e => {
                  const newHls = [...data.highlights];
                  newHls[index] = e.target.value;
                  onChange({ ...data, highlights: newHls });
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white"
              />
              <button
                onClick={() => removeHighlight(index)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Highlight */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="नया मुख्य बिंदु लिखें..."
            value={newHighlight}
            onChange={e => setNewHighlight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHighlight()}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200"
          />
          <button
            onClick={addHighlight}
            disabled={!newHighlight.trim()}
            className="px-4 py-2 bg-[#2D5A27] text-white font-bold text-xs rounded-xl disabled:opacity-40"
          >
            जोड़ें
          </button>
        </div>
      </div>

      {/* Founder / Leadership Message */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728]">
          संचालक / संस्थापक संदेश (Founder / Leadership)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">नाम</label>
            <input
              type="text"
              value={data.founderName || ''}
              onChange={e => onChange({ ...data, founderName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">पद / भूमिका (Role)</label>
            <input
              type="text"
              value={data.founderRole || ''}
              onChange={e => onChange({ ...data, founderRole: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">संदेश (Founder Message)</label>
          <textarea
            rows={2}
            value={data.founderMessage || ''}
            onChange={e => onChange({ ...data, founderMessage: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>
      </div>

      {/* Custom Sections Editor */}
      <SectionsListEditor 
        sections={data.sections || []} 
        onChange={sections => onChange({ ...data, sections })} 
      />
    </div>
  );
};

/** 2. Generic Policy Editor (Privacy Policy, Terms, etc.) **/
interface GenericPolicyEditorProps<T extends {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated?: string;
  introText: string;
  sections: PageSectionItem[];
}> {
  pageTitle: string;
  data: T;
  onChange: (data: T) => void;
  extraFields?: (data: T, onChange: (data: T) => void) => React.ReactNode;
}

function GenericPolicyEditor<T extends {
  bannerTitle: string;
  bannerSubtitle: string;
  lastUpdated?: string;
  introText: string;
  sections: PageSectionItem[];
}>({ pageTitle, data, onChange, extraFields }: GenericPolicyEditorProps<T>) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#2D5A27]" />
          <span>{pageTitle} - मुख्य विवरण</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">पेज शीर्षक (Banner Title)</label>
            <input
              type="text"
              value={data.bannerTitle || ''}
              onChange={e => onChange({ ...data, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">उप-शीर्षक (Subtitle)</label>
            <input
              type="text"
              value={data.bannerSubtitle || ''}
              onChange={e => onChange({ ...data, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">अंतिम अपडेट तारीख (Last Updated)</label>
            <input
              type="text"
              value={data.lastUpdated || ''}
              onChange={e => onChange({ ...data, lastUpdated: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">प्रस्तावना / परिचय (Intro Text)</label>
          <textarea
            rows={3}
            value={data.introText || ''}
            onChange={e => onChange({ ...data, introText: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2D5A27] font-medium"
          />
        </div>

        {extraFields && (
          <div className="pt-2 border-t border-gray-100">
            {extraFields(data, onChange)}
          </div>
        )}
      </div>

      {/* Sections List */}
      <SectionsListEditor 
        sections={data.sections || []} 
        onChange={sections => onChange({ ...data, sections })} 
      />
    </div>
  );
}

/** 3. Refund Policy Editor **/
const RefundPolicyEditor: React.FC<{
  data: RefundPolicyPageData;
  onChange: (data: RefundPolicyPageData) => void;
}> = ({ data, onChange }) => {
  const [newCond, setNewCond] = useState('');

  const addCond = () => {
    if (!newCond.trim()) return;
    onChange({
      ...data,
      nonReturnableConditions: [...(data.nonReturnableConditions || []), newCond.trim()]
    });
    setNewCond('');
  };

  const removeCond = (index: number) => {
    onChange({
      ...data,
      nonReturnableConditions: data.nonReturnableConditions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <span>रिफंड नीति मुख्य सेटिंग्स</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">शीर्षक (Title)</label>
            <input
              type="text"
              value={data.bannerTitle || ''}
              onChange={e => onChange({ ...data, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">उपशीर्षक (Subtitle)</label>
            <input
              type="text"
              value={data.bannerSubtitle || ''}
              onChange={e => onChange({ ...data, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">वापसी की समय सीमा (Return Window)</label>
            <input
              type="text"
              value={data.returnWindowText || ''}
              onChange={e => onChange({ ...data, returnWindowText: e.target.value })}
              placeholder="उदा. 24 से 48 घंटे के भीतर"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 font-bold text-amber-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">परिचय टेक्स्ट</label>
          <textarea
            rows={2}
            value={data.introText || ''}
            onChange={e => onChange({ ...data, introText: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">रिफंड भुगतान प्रक्रिया विवरण (Refund Process Text)</label>
          <textarea
            rows={2}
            value={data.refundProcessText || ''}
            onChange={e => onChange({ ...data, refundProcessText: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>
      </div>

      {/* Non-returnable conditions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>किन परिस्थितियों में वापसी स्वीकार नहीं होगी? (Non-Returnable Conditions)</span>
        </h3>

        <div className="space-y-2">
          {data.nonReturnableConditions?.map((cond, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black flex items-center justify-center shrink-0">
                ✕
              </span>
              <input
                type="text"
                value={cond}
                onChange={e => {
                  const newConds = [...data.nonReturnableConditions];
                  newConds[index] = e.target.value;
                  onChange({ ...data, nonReturnableConditions: newConds });
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white"
              />
              <button
                onClick={() => removeCond(index)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="नई गैर-वापसी शर्त जोड़ें..."
            value={newCond}
            onChange={e => setNewCond(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCond()}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200"
          />
          <button
            onClick={addCond}
            disabled={!newCond.trim()}
            className="px-4 py-2 bg-rose-700 text-white font-bold text-xs rounded-xl disabled:opacity-40"
          >
            जोड़ें
          </button>
        </div>
      </div>

      <SectionsListEditor 
        sections={data.sections || []} 
        onChange={sections => onChange({ ...data, sections })} 
      />
    </div>
  );
};

/** 4. AI Disclaimer Editor **/
const AiDisclaimerEditor: React.FC<{
  data: AiDisclaimerPageData;
  onChange: (data: AiDisclaimerPageData) => void;
}> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>कृषि एवं AI अस्वीकरण मुख्य सेटिंग्स</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">शीर्षक (Title)</label>
            <input
              type="text"
              value={data.bannerTitle || ''}
              onChange={e => onChange({ ...data, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">उपशीर्षक (Subtitle)</label>
            <input
              type="text"
              value={data.bannerSubtitle || ''}
              onChange={e => onChange({ ...data, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">अंतिम अपडेट तारीख</label>
            <input
              type="text"
              value={data.lastUpdated || ''}
              onChange={e => onChange({ ...data, lastUpdated: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">परिचय टेक्स्ट (Intro)</label>
          <textarea
            rows={2}
            value={data.introText || ''}
            onChange={e => onChange({ ...data, introText: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-rose-700 mb-1">आपातकालीन/विशेष चेतावनी बॉक्स (Emergency Notice Box)</label>
          <textarea
            rows={2}
            value={data.emergencyNotice || ''}
            onChange={e => onChange({ ...data, emergencyNotice: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-rose-200 bg-rose-50/50 font-semibold text-rose-900"
          />
        </div>
      </div>

      <SectionsListEditor 
        sections={data.sections || []} 
        onChange={sections => onChange({ ...data, sections })} 
      />
    </div>
  );
};

/** 5. Chemical Safety Editor **/
const ChemicalSafetyEditor: React.FC<{
  data: ChemicalSafetyPageData;
  onChange: (data: ChemicalSafetyPageData) => void;
}> = ({ data, onChange }) => {
  const [newDo, setNewDo] = useState('');
  const [newDont, setNewDont] = useState('');
  const [newEmergency, setNewEmergency] = useState({ title: '', number: '', desc: '' });

  const addDo = () => {
    if (!newDo.trim()) return;
    onChange({ ...data, dosList: [...(data.dosList || []), newDo.trim()] });
    setNewDo('');
  };

  const removeDo = (index: number) => {
    onChange({ ...data, dosList: data.dosList.filter((_, i) => i !== index) });
  };

  const addDont = () => {
    if (!newDont.trim()) return;
    onChange({ ...data, dontsList: [...(data.dontsList || []), newDont.trim()] });
    setNewDont('');
  };

  const removeDont = (index: number) => {
    onChange({ ...data, dontsList: data.dontsList.filter((_, i) => i !== index) });
  };

  const addEmergency = () => {
    if (!newEmergency.title.trim() || !newEmergency.number.trim()) return;
    onChange({
      ...data,
      emergencyNumbers: [...(data.emergencyNumbers || []), { ...newEmergency }]
    });
    setNewEmergency({ title: '', number: '', desc: '' });
  };

  const removeEmergency = (index: number) => {
    onChange({
      ...data,
      emergencyNumbers: data.emergencyNumbers.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-600" />
          <span>रासायनिक सुरक्षा निर्देश - मुख्य सेटिंग्स</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">शीर्षक (Title)</label>
            <input
              type="text"
              value={data.bannerTitle || ''}
              onChange={e => onChange({ ...data, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">उपशीर्षक (Subtitle)</label>
            <input
              type="text"
              value={data.bannerSubtitle || ''}
              onChange={e => onChange({ ...data, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">अंतिम अपडेट तारीख</label>
            <input
              type="text"
              value={data.lastUpdated || ''}
              onChange={e => onChange({ ...data, lastUpdated: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">परिचय टेक्स्ट</label>
          <textarea
            rows={2}
            value={data.introText || ''}
            onChange={e => onChange({ ...data, introText: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>
      </div>

      {/* Emergency Helpline Numbers */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-rose-600" />
            <span>आपातकालीन सहायता नंबर (Emergency Helplines)</span>
          </span>
        </h3>

        <div className="space-y-2">
          {data.emergencyNumbers?.map((em, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                <input
                  type="text"
                  value={em.title}
                  onChange={e => {
                    const newEms = [...data.emergencyNumbers];
                    newEms[index].title = e.target.value;
                    onChange({ ...data, emergencyNumbers: newEms });
                  }}
                  placeholder="विभाग / सेवा"
                  className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 font-bold text-[#4A3728]"
                />
                <input
                  type="text"
                  value={em.number}
                  onChange={e => {
                    const newEms = [...data.emergencyNumbers];
                    newEms[index].number = e.target.value;
                    onChange({ ...data, emergencyNumbers: newEms });
                  }}
                  placeholder="फोन नंबर"
                  className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 font-black text-rose-700"
                />
                <input
                  type="text"
                  value={em.desc}
                  onChange={e => {
                    const newEms = [...data.emergencyNumbers];
                    newEms[index].desc = e.target.value;
                    onChange({ ...data, emergencyNumbers: newEms });
                  }}
                  placeholder="विवरण"
                  className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-gray-200 text-gray-600"
                />
              </div>
              <button
                onClick={() => removeEmergency(index)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Emergency */}
        <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-2">
          <p className="text-xs font-bold text-rose-800">➕ नया हेल्पलाइन नंबर जोड़ें</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="नाम (उदा. एम्बुलेंस)"
              value={newEmergency.title}
              onChange={e => setNewEmergency({ ...newEmergency, title: e.target.value })}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-gray-200"
            />
            <input
              type="text"
              placeholder="नंबर (उदा. 108)"
              value={newEmergency.number}
              onChange={e => setNewEmergency({ ...newEmergency, number: e.target.value })}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-gray-200"
            />
            <input
              type="text"
              placeholder="विवरण"
              value={newEmergency.desc}
              onChange={e => setNewEmergency({ ...newEmergency, desc: e.target.value })}
              className="px-3 py-2 text-xs bg-white rounded-xl border border-gray-200"
            />
          </div>
          <button
            onClick={addEmergency}
            disabled={!newEmergency.title.trim() || !newEmergency.number.trim()}
            className="px-3.5 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl disabled:opacity-40"
          >
            नंबर जोड़ें
          </button>
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Do's */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 space-y-3">
          <h3 className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>क्या करें (Do's - सही तरीके)</span>
          </h3>

          <div className="space-y-2">
            {data.dosList?.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">✓</span>
                <input
                  type="text"
                  value={item}
                  onChange={e => {
                    const newDos = [...data.dosList];
                    newDos[index] = e.target.value;
                    onChange({ ...data, dosList: newDos });
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white"
                />
                <button
                  onClick={() => removeDo(index)}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="नया निर्देश..."
              value={newDo}
              onChange={e => setNewDo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDo()}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200"
            />
            <button
              onClick={addDo}
              disabled={!newDo.trim()}
              className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-40"
            >
              जोड़ें
            </button>
          </div>
        </div>

        {/* Don'ts */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-100 space-y-3">
          <h3 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>क्या न करें (Don'ts - गलतियां)</span>
          </h3>

          <div className="space-y-2">
            {data.dontsList?.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-rose-600 font-bold text-xs">✕</span>
                <input
                  type="text"
                  value={item}
                  onChange={e => {
                    const newDonts = [...data.dontsList];
                    newDonts[index] = e.target.value;
                    onChange({ ...data, dontsList: newDonts });
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white"
                />
                <button
                  onClick={() => removeDont(index)}
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="नया निषेध..."
              value={newDont}
              onChange={e => setNewDont(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDont()}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200"
            />
            <button
              onClick={addDont}
              disabled={!newDont.trim()}
              className="px-3 py-1.5 bg-rose-700 text-white font-bold text-xs rounded-xl disabled:opacity-40"
            >
              जोड़ें
            </button>
          </div>
        </div>
      </div>

      <SectionsListEditor 
        sections={data.sections || []} 
        onChange={sections => onChange({ ...data, sections })} 
      />
    </div>
  );
};

/** 6. Contact Us Editor **/
const ContactUsEditor: React.FC<{
  data: ContactUsPageData;
  onChange: (data: ContactUsPageData) => void;
}> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-[#2D5A27]" />
          <span>संपर्क सूत्र एवं स्टोर की जानकारी</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">पेज शीर्षक (Title)</label>
            <input
              type="text"
              value={data.bannerTitle || ''}
              onChange={e => onChange({ ...data, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">उपशीर्षक (Subtitle)</label>
            <input
              type="text"
              value={data.bannerSubtitle || ''}
              onChange={e => onChange({ ...data, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">परिचय संदेश</label>
          <textarea
            rows={2}
            value={data.introText || ''}
            onChange={e => onChange({ ...data, introText: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>

        {/* Contact Numbers & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span>कॉल नंबर (Phone)</span>
            </label>
            <input
              type="text"
              value={data.phone || ''}
              onChange={e => onChange({ ...data, phone: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 font-bold text-[#4A3728]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>व्हाट्सएप नंबर (WhatsApp)</span>
            </label>
            <input
              type="text"
              value={data.whatsapp || ''}
              onChange={e => onChange({ ...data, whatsapp: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 font-bold text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>ईमेल पता (Email)</span>
            </label>
            <input
              type="email"
              value={data.email || ''}
              onChange={e => onChange({ ...data, email: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 font-medium text-blue-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>दुकान का पूरा पता (Full Store Address)</span>
          </label>
          <textarea
            rows={2}
            value={data.address || ''}
            onChange={e => onChange({ ...data, address: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>दुकान खुलने का समय (Working Hours)</span>
            </label>
            <input
              type="text"
              value={data.timings || ''}
              onChange={e => onChange({ ...data, timings: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>डिलीवरी क्षेत्र (Delivery Area Coverage)</span>
            </label>
            <input
              type="text"
              value={data.deliveryArea || ''}
              onChange={e => onChange({ ...data, deliveryArea: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">अतिरिक्त सहायता नोट / सलाह (Custom Notes)</label>
          <input
            type="text"
            value={data.customNotes || ''}
            onChange={e => onChange({ ...data, customNotes: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200"
          />
        </div>
      </div>

      <SectionsListEditor 
        sections={data.sections || []} 
        onChange={sections => onChange({ ...data, sections })} 
      />
    </div>
  );
};

/* =========================================================
   REUSABLE DYNAMIC SECTIONS LIST EDITOR
========================================================= */

const SectionsListEditor: React.FC<{
  sections: PageSectionItem[];
  onChange: (sections: PageSectionItem[]) => void;
}> = ({ sections, onChange }) => {
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec: PageSectionItem = {
      id: `sec_${Date.now()}`,
      title: newSectionTitle.trim(),
      content: newSectionContent.trim(),
      bullets: []
    };
    onChange([...sections, newSec]);
    setNewSectionTitle('');
    setNewSectionContent('');
  };

  const removeSection = (id: string) => {
    const confirmDelete = window.confirm('क्या आप इस पूरे सेक्शन को हटाना चाहते हैं?');
    if (confirmDelete) {
      onChange(sections.filter(s => s.id !== id));
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    onChange(reordered);
  };

  const updateSectionField = (index: number, field: keyof PageSectionItem, value: any) => {
    const updated = [...sections];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onChange(updated);
  };

  const addBulletToSection = (sectionIndex: number, bulletText: string) => {
    if (!bulletText.trim()) return;
    const sec = sections[sectionIndex];
    const updatedBullets = [...(sec.bullets || []), bulletText.trim()];
    updateSectionField(sectionIndex, 'bullets', updatedBullets);
  };

  const removeBulletFromSection = (sectionIndex: number, bulletIndex: number) => {
    const sec = sections[sectionIndex];
    const updatedBullets = (sec.bullets || []).filter((_, i) => i !== bulletIndex);
    updateSectionField(sectionIndex, 'bullets', updatedBullets);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#4A3728] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2D5A27]" />
            <span>विस्तृत सेक्शन व क्लॉज (Page Sections & Clauses)</span>
          </h3>
          <p className="text-[11px] text-gray-500">
            आप किसी भी सेक्शन के शीर्षक, कंटेंट और बुलेट्स को एडिट कर सकते हैं, नए सेक्शन जोड़ सकते हैं या हटा सकते हैं।
          </p>
        </div>
        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
          कुल {sections.length} सेक्शन
        </span>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((sec, secIndex) => (
          <div 
            key={sec.id || secIndex} 
            className="p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-200 space-y-3 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="w-6 h-6 rounded-lg bg-[#2D5A27] text-[#EAB308] text-xs font-black flex items-center justify-center shrink-0">
                  {secIndex + 1}
                </span>
                <input
                  type="text"
                  value={sec.title}
                  onChange={e => updateSectionField(secIndex, 'title', e.target.value)}
                  placeholder="सेक्शन शीर्षक"
                  className="w-full font-bold text-xs bg-white px-3 py-2 rounded-xl border border-gray-200 text-[#4A3728] focus:border-[#2D5A27]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => moveSection(secIndex, 'up')}
                  disabled={secIndex === 0}
                  className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-lg"
                  title="ऊपर ले जाएं"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveSection(secIndex, 'down')}
                  disabled={secIndex === sections.length - 1}
                  className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-lg"
                  title="नीचे ले जाएं"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeSection(sec.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="सेक्शन हटाएं"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">सेक्शन कंटेंट (विवरण)</label>
              <textarea
                rows={3}
                value={sec.content}
                onChange={e => updateSectionField(secIndex, 'content', e.target.value)}
                placeholder="सेक्शन का मुख्य विवरण लिखें..."
                className="w-full text-xs bg-white px-3 py-2 rounded-xl border border-gray-200 text-gray-800 focus:border-[#2D5A27]"
              />
            </div>

            {/* Bullets Management inside Section */}
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-gray-600">बुलेट पॉइंट्स (Bullet Points - वैकल्पिक)</label>
              
              {sec.bullets && sec.bullets.length > 0 && (
                <div className="space-y-1.5">
                  {sec.bullets.map((bullet, bIndex) => (
                    <div key={bIndex} className="flex items-center gap-2">
                      <span className="text-[#2D5A27] font-bold text-xs">•</span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={e => {
                          const newBullets = [...(sec.bullets || [])];
                          newBullets[bIndex] = e.target.value;
                          updateSectionField(secIndex, 'bullets', newBullets);
                        }}
                        className="flex-1 text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => removeBulletFromSection(secIndex, bIndex)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Bullet Input */}
              <BulletInput 
                onAdd={text => addBulletToSection(secIndex, text)} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add New Section Card */}
      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
        <h4 className="text-xs font-bold text-[#2D5A27] flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>नया सेक्शन जोड़ें (Add New Section)</span>
        </h4>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="सेक्शन शीर्षक (उदा. 7. विशेष छूट एवं कूपन नियम)"
            value={newSectionTitle}
            onChange={e => setNewSectionTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-gray-200"
          />
          <textarea
            rows={2}
            placeholder="सेक्शन का मुख्य विवरण लिखें..."
            value={newSectionContent}
            onChange={e => setNewSectionContent(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-gray-200"
          />
          <button
            onClick={addSection}
            disabled={!newSectionTitle.trim()}
            className="px-4 py-2 bg-[#2D5A27] text-white font-bold text-xs rounded-xl disabled:opacity-40 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>सेक्शन जोड़ें</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const BulletInput: React.FC<{ onAdd: (text: string) => void }> = ({ onAdd }) => {
  const [val, setVal] = useState('');
  const handleAdd = () => {
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal('');
  };
  return (
    <div className="flex gap-2 pt-1">
      <input
        type="text"
        placeholder="नया बुलेट पॉइंट लिखें..."
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200"
      />
      <button
        onClick={handleAdd}
        disabled={!val.trim()}
        className="px-3 py-1 bg-emerald-700 text-white font-bold text-xs rounded-lg disabled:opacity-40"
      >
        + बुलेट जोड़ें
      </button>
    </div>
  );
};

export default AdminPagesManager;
