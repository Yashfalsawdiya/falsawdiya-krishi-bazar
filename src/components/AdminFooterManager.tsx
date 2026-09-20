import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Phone, 
  MapPin, 
  MessageCircle, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Lock, 
  Award, 
  ExternalLink,
  Layers,
  Sparkles,
  HelpCircle,
  CreditCard,
  Share2,
  ListFilter
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { FooterConfig, FooterColumn, FooterLinkItem, FooterTrustHighlight } from '../types';
import { getDefaultFooterConfig, mergeFooterConfig } from '../utils/footerDefaults';

export const AdminFooterManager: React.FC = () => {
  const { appContent, updateFooterContent, legalPagesContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  const contactData = legalPagesContent?.contactUs;
  const initialPhone = contactData?.phone || '8982338046';
  const initialAddress = appContent?.contactInfo?.address || 
    contactData?.address || 
    'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)';

  const initialWhatsapp = appContent?.whatsappSection?.groupLink || `https://wa.me/918982338046?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार`;
  const initialFb = appContent?.facebookSection?.pageUrl || 'https://facebook.com';
  const initialIg = appContent?.instagramSection?.profileUrl || 'https://instagram.com';
  const initialYt = appContent?.youtubeChannel?.url || 'https://youtube.com';

  // Config state
  const [config, setConfig] = useState<Required<FooterConfig>>(() => {
    return mergeFooterConfig(appContent?.footer, {
      brandName: branding.name,
      tagline: branding.tagline,
      phone: initialPhone,
      address: initialAddress,
      whatsappUrl: initialWhatsapp,
      facebookUrl: initialFb,
      instagramUrl: initialIg,
      youtubeUrl: initialYt
    });
  });

  const [activeSubTab, setActiveSubTab] = useState<'brandContact' | 'social' | 'columns' | 'bottomPayment' | 'highlights'>('brandContact');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state if external appContent changes
  useEffect(() => {
    if (appContent?.footer) {
      setConfig(mergeFooterConfig(appContent.footer, {
        brandName: branding.name,
        tagline: branding.tagline,
        phone: initialPhone,
        address: initialAddress,
        whatsappUrl: initialWhatsapp,
        facebookUrl: initialFb,
        instagramUrl: initialIg,
        youtubeUrl: initialYt
      }));
    }
  }, [appContent?.footer]);

  // Update a single flat property
  const updateField = <K extends keyof FooterConfig>(key: K, value: FooterConfig[K]) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Link modification helpers
  const handleUpdateColumnTitle = (colIndex: number, newTitle: string) => {
    setConfig(prev => {
      const updatedCols = [...prev.columns];
      updatedCols[colIndex] = {
        ...updatedCols[colIndex],
        title: newTitle
      };
      return { ...prev, columns: updatedCols };
    });
  };

  const handleUpdateLink = (colIndex: number, linkIndex: number, field: 'label' | 'path', value: string) => {
    setConfig(prev => {
      const updatedCols = [...prev.columns];
      const col = { ...updatedCols[colIndex] };
      const links = [...col.links];
      links[linkIndex] = {
        ...links[linkIndex],
        [field]: value
      };
      col.links = links;
      updatedCols[colIndex] = col;
      return { ...prev, columns: updatedCols };
    });
  };

  const handleAddLink = (colIndex: number) => {
    setConfig(prev => {
      const updatedCols = [...prev.columns];
      const col = { ...updatedCols[colIndex] };
      const newId = `link-${Date.now()}`;
      col.links = [
        ...col.links,
        { id: newId, label: 'नया लिंक', path: '/' }
      ];
      updatedCols[colIndex] = col;
      return { ...prev, columns: updatedCols };
    });
  };

  const handleRemoveLink = (colIndex: number, linkIndex: number) => {
    setConfig(prev => {
      const updatedCols = [...prev.columns];
      const col = { ...updatedCols[colIndex] };
      col.links = col.links.filter((_, i) => i !== linkIndex);
      updatedCols[colIndex] = col;
      return { ...prev, columns: updatedCols };
    });
  };

  // Payment methods helpers
  const handleUpdatePaymentMethod = (index: number, val: string) => {
    setConfig(prev => {
      const updated = [...prev.paymentMethods];
      updated[index] = val;
      return { ...prev, paymentMethods: updated };
    });
  };

  const handleAddPaymentMethod = () => {
    setConfig(prev => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, 'NetBanking']
    }));
  };

  const handleRemovePaymentMethod = (index: number) => {
    setConfig(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((_, i) => i !== index)
    }));
  };

  // Highlights helpers
  const handleUpdateHighlight = (index: number, field: 'title' | 'subtitle', val: string) => {
    setConfig(prev => {
      const updated = [...prev.highlights];
      updated[index] = {
        ...updated[index],
        [field]: val
      };
      return { ...prev, highlights: updated };
    });
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('क्या आप फुटर को मूल डिफ़ॉल्ट सेटिंग्स पर रीसेट करना चाहते हैं?')) {
      const def = getDefaultFooterConfig({
        brandName: branding.name,
        tagline: branding.tagline,
        phone: initialPhone,
        address: initialAddress,
        whatsappUrl: initialWhatsapp,
        facebookUrl: initialFb,
        instagramUrl: initialIg,
        youtubeUrl: initialYt
      });
      setConfig(def);
      setNotification({
        type: 'success',
        message: 'डिफ़ॉल्ट सेटिंग्स लोड कर दी गई हैं। सुरक्षित करने के लिए "सुरक्षित करें" बटन दबाएं।'
      });
    }
  };

  // Save changes to Firebase
  const handleSave = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      await updateFooterContent(config);
      setNotification({
        type: 'success',
        message: 'फुटर की संपूर्ण सामग्री सफलतापूर्वक सुरक्षित हो गई है! अब लाइव वेबसाइट के फुटर में दिखाई दे रही है।'
      });
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to save footer content:', err);
      setNotification({
        type: 'error',
        message: 'फुटर सेव करने में समस्या आई। कृपया पुनः प्रयास करें।'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1b4317] to-[#2D5A27] text-white p-6 rounded-3xl shadow-sm border border-emerald-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-200 mb-2">
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            डेस्कटॉप / कंप्यूटर फुटर एडिटर
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            वेबसाइट फुटर सामग्री प्रबंधन (Footer Editor)
          </h2>
          <p className="text-xs md:text-sm text-emerald-100/80 mt-1 max-w-2xl">
            वेबसाइट के नीचे दिखने वाले पूरे फुटर की टेक्स्ट, लिंक्स, संपर्क, सोशल मीडिया, मेनू कॉलम व पेमेंट बैज बिना कोड बदले यहाँ से सीधे एडिट करें।
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="डिफ़ॉल्ट पर रीसेट करें"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            रीसेट
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#EAB308] hover:bg-[#d4a107] text-[#16311A] rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#16311A] border-t-transparent rounded-full animate-spin" />
                सेव हो रहा है...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                फुटर सुरक्षित करें
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar bg-white p-2 rounded-2xl border border-gray-100 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('brandContact')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'brandContact'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          ब्रांड, हेल्पलाइन व पता
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('columns')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'columns'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          4 कॉलम मेनू व लिंक्स
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('social')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'social'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          सोशल मीडिया लिंक्स
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bottomPayment')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'bottomPayment'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          कॉपीराइट व पेमेंट बैज
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('highlights')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'highlights'
              ? 'bg-[#2D5A27] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          टॉप ट्रस्ट हाइलाइट्स
        </button>
      </div>

      {/* Tab 1: Brand, Helpline, Address */}
      {activeSubTab === 'brandContact' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#2D5A27]" />
              ब्रांड जानकारी एवं संपर्क/हेल्पलाइन
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              फुटर के बाएं भाग में दिखने वाला स्टोर नाम, टैगलाइन, विवरण, हेल्पलाइन व पता यहाँ से बदलें।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                ब्रांड / स्टोर का नाम (Brand Name)
              </label>
              <input
                type="text"
                value={config.brandName || ''}
                onChange={e => updateField('brandName', e.target.value)}
                placeholder="उदा. फल्सावदिया कृषि बाजार"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                टैगलाइन (Tagline)
              </label>
              <input
                type="text"
                value={config.tagline || ''}
                onChange={e => updateField('tagline', e.target.value)}
                placeholder="उदा. किसान का भरोसा, हमारी पहचान"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                संक्षिप्त विवरण (Description / About Store)
              </label>
              <textarea
                rows={3}
                value={config.description || ''}
                onChange={e => updateField('description', e.target.value)}
                placeholder="किसानों की समृद्धि और आधुनिक कृषि क्रांति का समर्पित डिजिटल मंच..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#2D5A27] outline-none transition-all leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                हेल्पलाइन बॉक्स शीर्षक (Helpline Title)
              </label>
              <input
                type="text"
                value={config.helplineTitle || ''}
                onChange={e => updateField('helplineTitle', e.target.value)}
                placeholder="उदा. हेल्पलाइन व ऑर्डर सहायता"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                हेल्पलाइन मोबाइल/फोन नंबर (Phone Number)
              </label>
              <input
                type="text"
                value={config.helphoneNumber || ''}
                onChange={e => updateField('helphoneNumber', e.target.value)}
                placeholder="उदा. 8982338046 या +91 8982338046"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                कॉल बटन टेक्स्ट (Call Button Text)
              </label>
              <input
                type="text"
                value={config.callButtonText || ''}
                onChange={e => updateField('callButtonText', e.target.value)}
                placeholder="उदा. कॉल करें"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                दुकान / केंद्र का पूरा पता (Physical Address)
              </label>
              <textarea
                rows={2}
                value={config.address || ''}
                onChange={e => updateField('address', e.target.value)}
                placeholder="उदा. डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#2D5A27] outline-none transition-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 4 Columns Menus & Links */}
      {activeSubTab === 'columns' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">4 कॉलम मेनू गाइड:</p>
              <p className="mt-0.5 text-amber-800">
                प्रत्येक कॉलम का शीर्षक और उसमें मौजूद सभी लिंक्स के नाम (Labels) व रूट्स (Paths) यहाँ एडिट किए जा सकते हैं। आप नए लिंक्स भी जोड़ सकते हैं।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {config.columns.map((col, colIdx) => (
              <div key={col.id || colIdx} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      कॉलम {colIdx + 1} शीर्षक
                    </span>
                    <input
                      type="text"
                      value={col.title}
                      onChange={e => handleUpdateColumnTitle(colIdx, e.target.value)}
                      placeholder="कॉलम शीर्षक"
                      className="w-full p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950 focus:bg-white focus:border-[#2D5A27] outline-none"
                    />
                  </div>

                  <div className="space-y-3 mb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      लिंक्स की सूची ({col.links.length})
                    </span>

                    {col.links.map((link, linkIdx) => (
                      <div key={link.id || linkIdx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 relative group">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="text"
                            value={link.label}
                            onChange={e => handleUpdateLink(colIdx, linkIdx, 'label', e.target.value)}
                            placeholder="लिंक का नाम"
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:border-[#2D5A27] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(colIdx, linkIdx)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors shrink-0"
                            title="लिंक हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={link.path}
                          onChange={e => handleUpdateLink(colIdx, linkIdx, 'path', e.target.value)}
                          placeholder="रूट उदा. /about"
                          className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 font-mono focus:border-[#2D5A27] outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddLink(colIdx)}
                  className="w-full py-2 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-dashed border-gray-300 transition-all cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> नया लिंक जोड़ें
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Social Media Links */}
      {activeSubTab === 'social' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#2D5A27]" />
              सोशल मीडिया व कम्युनिटी लिंक्स
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              WhatsApp, Facebook, Instagram और YouTube के डायरेक्ट लिंक्स यहाँ सेट करें।
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                सोशल मीडिया सेक्शन शीर्षक (Heading)
              </label>
              <input
                type="text"
                value={config.socialTitle || ''}
                onChange={e => updateField('socialTitle', e.target.value)}
                placeholder="उदा. सोशल मीडिया व कम्युनिटी"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="text-xs font-bold text-[#25D366] flex items-center gap-1.5 mb-1.5">
                  <MessageCircle className="w-4 h-4" /> WhatsApp कम्युनिटी / चैट लिंक
                </label>
                <input
                  type="text"
                  value={config.whatsappUrl || ''}
                  onChange={e => updateField('whatsappUrl', e.target.value)}
                  placeholder="https://wa.me/918982338046..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-1.5">
                  <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">f</span> Facebook पेज URL
                </label>
                <input
                  type="text"
                  value={config.facebookUrl || ''}
                  onChange={e => updateField('facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-pink-600 flex items-center gap-1.5 mb-1.5">
                  <span className="w-4 h-4 rounded bg-pink-600 text-white flex items-center justify-center text-[10px] font-black">ig</span> Instagram प्रोफाइल URL
                </label>
                <input
                  type="text"
                  value={config.instagramUrl || ''}
                  onChange={e => updateField('instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/yourprofile"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-red-600 flex items-center gap-1.5 mb-1.5">
                  <span className="w-4 h-4 rounded bg-red-600 text-white flex items-center justify-center text-[10px] font-black">yt</span> YouTube चैनल URL
                </label>
                <input
                  type="text"
                  value={config.youtubeUrl || ''}
                  onChange={e => updateField('youtubeUrl', e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Copyright & Payment Badges */}
      {activeSubTab === 'bottomPayment' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2D5A27]" />
              कॉपीराइट, बॉटम टेक्स्ट एवं पेमेंट गेटवे बैज
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              फुटर की सबसे निचली पट्टी में दिखने वाला कॉपीराइट नोट एवं स्वीकार्य पेमेंट मेथड्स (UPI, PhonePe आदि) को कस्टमाइज़ करें।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                कॉपीराइट टेक्स्ट (Copyright Suffix)
              </label>
              <input
                type="text"
                value={config.copyrightText || ''}
                onChange={e => updateField('copyrightText', e.target.value)}
                placeholder="सर्वाधिकार सुरक्षित। (All Rights Reserved)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                यह © {new Date().getFullYear()} [ब्रांड नाम] के बाद जुड़ेगा।
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                अतिरिक्त बॉटम टेक्स्ट (वैकल्पिक)
              </label>
              <input
                type="text"
                value={config.bottomText || ''}
                onChange={e => updateField('bottomText', e.target.value)}
                placeholder="उदा. सुरक्षित एवं विश्वसनीय किसान सेवा"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                सुरक्षित भुगतान शीर्षक (Payment Guarantee Label)
              </label>
              <input
                type="text"
                value={config.paymentLabel || ''}
                onChange={e => updateField('paymentLabel', e.target.value)}
                placeholder="उदा. 100% सुरक्षित ऑनलाइन भुगतान:"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 block">
                  स्वीकार्य पेमेंट मेथड्स / बैज (Payment Method Badges)
                </label>
                <button
                  type="button"
                  onClick={handleAddPaymentMethod}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> नया पेमेंट तरीका जोड़ें
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {config.paymentMethods.map((method, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-2 rounded-xl">
                    <input
                      type="text"
                      value={method}
                      onChange={e => handleUpdatePaymentMethod(idx, e.target.value)}
                      placeholder="उदा. UPI"
                      className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none focus:border-[#2D5A27]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePaymentMethod(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors shrink-0"
                      title="हटाएं"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Top Trust Highlights */}
      {activeSubTab === 'highlights' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2D5A27]" />
              टॉप ट्रस्ट व सुविधा हाइलाइट्स (Top Value Highlights Banner)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              फुटर के ठीक ऊपर दिखने वाली 4 प्रमुख विशेषताओं (100% असली व प्रमाणित, 5,000+ संतुष्ट किसान आदि) का शीर्षक और उप-शीर्षक।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.highlights.map((item, idx) => (
              <div key={item.id || idx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  हाइलाइट #{idx + 1}
                </span>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    शीर्षक (Highlight Title)
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={e => handleUpdateHighlight(idx, 'title', e.target.value)}
                    placeholder="उदा. 100% असली व प्रमाणित"
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:border-[#2D5A27] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    उप-शीर्षक (Highlight Subtitle)
                  </label>
                  <input
                    type="text"
                    value={item.subtitle}
                    onChange={e => handleUpdateHighlight(idx, 'subtitle', e.target.value)}
                    placeholder="उदा. सरकारी अनुज्ञा प्राप्त कृषि इनपुट्स"
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:border-[#2D5A27] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Preview Box */}
      <div className="bg-[#122715] text-white p-6 rounded-3xl border border-[#23481F] shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Sparkles className="w-4 h-4 text-amber-300" />
            लाइव फुटर प्रीव्यू (Preview of Computer/Laptop Screen)
          </div>
          <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-gray-300">
            वास्तविक वेबसाइट रूप
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 text-xs">
          <div className="md:col-span-4 space-y-2">
            <h4 className="font-bold text-sm text-white">{config.brandName}</h4>
            <p className="text-[11px] text-[#EAB308] font-semibold">{config.tagline}</p>
            <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">{config.description}</p>
            <div className="p-2.5 bg-[#1F4525] rounded-xl flex items-center justify-between text-[11px]">
              <div>
                <p className="text-[10px] text-emerald-200">{config.helplineTitle}</p>
                <p className="font-bold text-white">+91 {config.helphoneNumber}</p>
              </div>
              <span className="px-2.5 py-1 bg-[#EAB308] text-[#16311A] font-bold rounded-lg text-[10px]">
                {config.callButtonText}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 flex items-start gap-1">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{config.address}</span>
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {config.columns.map((col, idx) => (
              <div key={idx} className="space-y-2">
                <h5 className="font-bold text-[11px] text-[#EAB308] border-b border-white/10 pb-1">
                  {col.title}
                </h5>
                <ul className="space-y-1 text-[10px] text-gray-300">
                  {col.links.slice(0, 4).map((l, lIdx) => (
                    <li key={lIdx} className="truncate">› {l.label}</li>
                  ))}
                  {col.links.length > 4 && (
                    <li className="text-[9px] text-gray-500 font-italic">+{col.links.length - 4} और...</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-gray-400">
          <p>© {new Date().getFullYear()} {config.brandName}. {config.copyrightText}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>{config.paymentLabel}</span>
            {config.paymentMethods.map((pm, i) => (
              <span key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-white font-semibold text-[9px]">
                {pm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFooterManager;
