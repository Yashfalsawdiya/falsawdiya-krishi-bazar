import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  MessageCircle,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Phone,
  Loader2,
  AlertTriangle,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AccountingCustomer, CustomerLedgerEntry } from '../../types/accounting';
import {
  MAX_PASSBOOK_IMAGE_ENTRIES,
  buildCustomerPassbookFileName,
  generateCustomerPassbookImage,
  generateCustomerPassbookPdfBlob,
  isPassbookEligibleForImageShare,
  GeneratedPassbookImage,
} from '../../utils/customerPassbookPdfGenerator';
import {
  formatDetailedCustomerPassbookText,
  formatCompactSmsCustomerPassbookText,
  shareFileOrDownloadFallback,
  triggerBlobDownload,
  openWhatsAppWithText,
  openSmsComposer,
  copyTextToClipboard,
} from '../../utils/customerPassbookShareUtils';

interface CustomerPassbookShareModalProps {
  customer: AccountingCustomer;
  ledgerEntries: CustomerLedgerEntry[];
  logoSource?: any;
  onClose: () => void;
}

export const CustomerPassbookShareModal: React.FC<CustomerPassbookShareModalProps> = ({
  customer,
  ledgerEntries,
  logoSource,
  onClose,
}) => {
  const [phoneInput, setPhoneInput] = useState<string>(
    (customer.phone || '').replace(/\D/g, '').slice(-10)
  );
  const [generatedImage, setGeneratedImage] = useState<GeneratedPassbookImage | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pdfActionLoading, setPdfActionLoading] = useState<'share' | 'download' | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [showTextPreview, setShowTextPreview] = useState<boolean>(false);
  const [highlightPdfBox, setHighlightPdfBox] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const entriesCount = Array.isArray(ledgerEntries) ? ledgerEntries.length : 0;
  const canShareImage = isPassbookEligibleForImageShare(ledgerEntries);
  const displayAccount = customer.accountNumber?.trim()
    ? customer.accountNumber.trim()
    : customer.id.slice(0, 6).toUpperCase();

  const pdfFileName = useMemo(
    () => buildCustomerPassbookFileName(customer, 'pdf'),
    [customer]
  );

  const imageFileName = useMemo(
    () => buildCustomerPassbookFileName(customer, 'png'),
    [customer]
  );

  const whatsappPassbookText = useMemo(
    () =>
      formatDetailedCustomerPassbookText(customer, ledgerEntries, {
        maxEntries: 25,
      }),
    [customer, ledgerEntries]
  );

  const fullDetailedText = useMemo(
    () => formatDetailedCustomerPassbookText(customer, ledgerEntries),
    [customer, ledgerEntries]
  );

  const compactSmsText = useMemo(
    () => formatCompactSmsCustomerPassbookText(customer, ledgerEntries),
    [customer, ledgerEntries]
  );

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ text, type });
  };

  useEffect(() => {
    let cancelled = false;

    if (!canShareImage) {
      setGeneratedImage(null);
      setImageLoading(false);
      setImageError(null);
      return;
    }

    const buildImage = async () => {
      setImageLoading(true);
      setImageError(null);
      try {
        const res = await generateCustomerPassbookImage(
          customer,
          ledgerEntries,
          logoSource || '/icon-192.png'
        );
        if (!cancelled) {
          setGeneratedImage(res);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : 'पासबुक इमेज बनाने में त्रुटि हुई।';
          setImageError(msg);
        }
      } finally {
        if (!cancelled) {
          setImageLoading(false);
        }
      }
    };

    buildImage();
    return () => {
      cancelled = true;
    };
  }, [customer, ledgerEntries, logoSource, canShareImage]);

  const notifyPdfRequired = () => {
    setHighlightPdfBox(true);
    showToast(
      `इस पासबुक में ${entriesCount} एंट्रीज़ हैं (${MAX_PASSBOOK_IMAGE_ENTRIES} से अधिक) — पूरी व साफ़ पासबुक के लिए कृपया नीचे से PDF शेयर या डाउनलोड करें।`,
      'info'
    );
    window.setTimeout(() => setHighlightPdfBox(false), 3000);
  };

  const handleShareImage = async () => {
    if (!canShareImage) {
      notifyPdfRequired();
      return;
    }
    if (!generatedImage) return;

    const outcome = await shareFileOrDownloadFallback(
      generatedImage.blob,
      generatedImage.fileName,
      'image/png',
      `खाता पासबुक - ${customer.name}`,
      whatsappPassbookText
    );

    if (outcome === 'shared') {
      showToast('पासबुक इमेज सफलतापूर्वक शेयर की गई!');
    } else if (outcome === 'downloaded') {
      showToast(
        `ब्राउज़र पर डायरेक्ट शेयर सपोर्ट न होने से इमेज (${generatedImage.fileName}) डाउनलोड हो गई है — अब WhatsApp में भेजें।`,
        'info'
      );
    }
  };

  const handleDownloadImage = () => {
    if (!canShareImage) {
      notifyPdfRequired();
      return;
    }
    if (!generatedImage) return;

    triggerBlobDownload(generatedImage.blob, generatedImage.fileName);
    showToast(`पासबुक इमेज (${generatedImage.fileName}) डाउनलोड हो गई!`);
  };

  const handlePdfAction = async (mode: 'share' | 'download') => {
    if (pdfActionLoading) return;
    setPdfActionLoading(mode);
    try {
      const res = await generateCustomerPassbookPdfBlob({
        customer,
        ledgerEntries,
        logoSource: logoSource || '/icon-192.png',
        fileName: pdfFileName,
      });

      if (!res.success || !res.blob) {
        showToast(res.error || 'पासबुक PDF तैयार करने में त्रुटि हुई।', 'error');
        return;
      }

      if (mode === 'download') {
        triggerBlobDownload(res.blob, res.fileName);
        showToast(`पासबुक PDF (${res.fileName}) डाउनलोड हो गई!`);
        return;
      }

      const outcome = await shareFileOrDownloadFallback(
        res.blob,
        res.fileName,
        'application/pdf',
        `खाता पासबुक - ${customer.name}`,
        `खाता पासबुक (खाता #${displayAccount}) - ${customer.name} - फल्सावदिया कृषि बाजार`
      );

      if (outcome === 'shared') {
        showToast('पासबुक PDF सफलतापूर्वक शेयर की गई!');
      } else if (outcome === 'downloaded') {
        showToast(
          `डायरेक्ट फाइल शेयर सपोर्ट न होने से PDF (${res.fileName}) डाउनलोड हो गई है — अब इसे WhatsApp में भेजें।`,
          'info'
        );
      }
    } catch {
      showToast('पासबुक PDF बनाते समय त्रुटि हुई।', 'error');
    } finally {
      setPdfActionLoading(null);
    }
  };

  const handleSendWhatsApp = () => {
    if (!whatsappPassbookText) return;
    openWhatsAppWithText(phoneInput, whatsappPassbookText);
  };

  const handleCopyText = async () => {
    if (!fullDetailedText) return;
    const ok = await copyTextToClipboard(fullDetailedText);
    if (ok) {
      setCopiedText(true);
      showToast('पूरा पासबुक विवरण टेक्स्ट कॉपी हो गया!');
      window.setTimeout(() => setCopiedText(false), 2500);
    } else {
      showToast('टेक्स्ट कॉपी नहीं हो सका।', 'error');
    }
  };

  const handleSendSms = () => {
    if (!compactSmsText) return;
    const res = openSmsComposer(phoneInput, compactSmsText);
    if (!res.opened && res.reason === 'desktop') {
      showToast(
        'कंप्यूटर/लैपटॉप पर SMS ऐप उपलब्ध नहीं है — कृपया "टेक्स्ट कॉपी करें" या "WhatsApp भेजें" का उपयोग करें।',
        'info'
      );
    }
  };

  const handleNativeTextShare = async () => {
    if (!fullDetailedText) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `खाता पासबुक - ${customer.name}`,
          text: fullDetailedText,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await handleCopyText();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Share2 className="w-4.5 h-4.5 text-[#2D5A27] shrink-0" />
              <span>खाता पासबुक शेयर करें (Share Passbook)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              खाता <strong className="font-mono text-gray-800">#{displayAccount}</strong> ·{' '}
              {customer.name}
              {customer.village ? ` · ${customer.village}` : ''}
            </p>
            <p className="text-xs font-extrabold mt-0.5 text-[#2D5A27]">
              बकाया:{' '}
              <span
                className={
                  (customer.currentOutstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-700'
                }
              >
                ₹{(customer.currentOutstanding || 0).toLocaleString('en-IN')}
              </span>{' '}
              <span className="text-gray-500 font-semibold">
                ({entriesCount} लेनदेन)
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer shrink-0"
            aria-label="बंद करें"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inline Toast Banner */}
        {toastMsg && (
          <div
            className={`p-3 rounded-2xl border text-xs font-bold flex items-start justify-between gap-2 ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toastMsg.type === 'info'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {toastMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
              ) : toastMsg.type === 'info' ? (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{toastMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="p-0.5 rounded-lg hover:bg-black/5 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Direct WhatsApp Text Passbook */}
        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#1B4316]">
              <MessageCircle className="w-4 h-4 text-[#2D5A27] shrink-0" />
              <span>WhatsApp पर खाता पासबुक (Text) भेजें</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phoneInput}
                onChange={(e) =>
                  setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="10 अंकों का मोबाइल नंबर (वैकल्पिक)"
                className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-[#2D5A27]"
              />
            </div>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-[#2D5A27] hover:bg-[#1f411b] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp भेजें</span>
            </button>
          </div>
          {!phoneInput.trim() && (
            <p className="text-[11px] text-gray-500 font-medium">
              मोबाइल नंबर खाली होने पर WhatsApp खुलने के बाद चैट चुनने का विकल्प मिलेगा।
            </p>
          )}
          {entriesCount > 25 && (
            <p className="text-[11px] text-emerald-800 font-semibold">
              WhatsApp टेक्स्ट में संपूर्ण बकाया सार व अंतिम 25 लेनदेन जाते हैं; सभी {entriesCount} लेनदेन के लिए PDF शेयर करें।
            </p>
          )}
        </div>

        {/* 2. HD Passbook Image Receipt (Up to 30 Entries) */}
        <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black text-gray-800">
              <ImageIcon className="w-4 h-4 text-[#2D5A27] shrink-0" />
              <span>HD पासबुक इमेज रसीद (अधिकतम {MAX_PASSBOOK_IMAGE_ENTRIES} एंट्रीज़)</span>
            </div>
            {canShareImage && (
              <span className="text-[10px] font-mono text-gray-500 truncate max-w-[210px]">
                {imageFileName}
              </span>
            )}
          </div>

          {!canShareImage ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  इस पासबुक में {entriesCount} एंट्रीज़ हैं ({MAX_PASSBOOK_IMAGE_ENTRIES} से अधिक)।
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {MAX_PASSBOOK_IMAGE_ENTRIES} से ज़्यादा एंट्रीज़ की Image साफ़ पढ़ने योग्य नहीं रहती — कृपया साफ़ और पूरी पासबुक के लिए नीचे से <strong>PDF शेयर</strong> या <strong>PDF डाउनलोड</strong> करें।
                </p>
              </div>
            </div>
          ) : imageLoading ? (
            <div className="h-44 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center gap-2 text-xs font-bold text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#2D5A27]" />
              <span>HD पासबुक इमेज तैयार हो रही है...</span>
            </div>
          ) : imageError ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
              {imageError}
            </div>
          ) : generatedImage ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 max-h-64 overflow-y-auto">
              <img
                src={generatedImage.dataUrl}
                alt={`खाता पासबुक - ${customer.name}`}
                className="w-full h-auto block"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareImage}
              disabled={canShareImage && (imageLoading || !generatedImage)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                canShareImage
                  ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Image शेयर करें</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={canShareImage && (imageLoading || !generatedImage)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                canShareImage
                  ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Image डाउनलोड</span>
            </button>
          </div>
        </div>

        {/* 3. Passbook PDF Share & Download */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
            highlightPdfBox || !canShareImage
              ? 'border-[#2D5A27] bg-emerald-50/40 ring-2 ring-emerald-200'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black text-gray-800">
              <FileText className="w-4 h-4 text-[#2D5A27] shrink-0" />
              <span>पासबुक PDF फ़ाइल (सभी {entriesCount} एंट्रीज़)</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500 truncate max-w-[220px]">
              {pdfFileName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePdfAction('share')}
              disabled={pdfActionLoading !== null}
              className="py-2.5 px-3 bg-[#2D5A27] hover:bg-[#1f411b] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60 transition-colors"
            >
              {pdfActionLoading === 'share' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>PDF शेयर करें</span>
            </button>
            <button
              type="button"
              onClick={() => handlePdfAction('download')}
              disabled={pdfActionLoading !== null}
              className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#1B4316] border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
            >
              {pdfActionLoading === 'download' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PDF डाउनलोड</span>
            </button>
          </div>
        </div>

        {/* 4. Text Copy / SMS / Native Text Share */}
        <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-gray-800">
              पासबुक टेक्स्ट (Copy / SMS / Message)
            </span>
            <button
              type="button"
              onClick={() => setShowTextPreview((v) => !v)}
              className="text-[11px] font-bold text-[#2D5A27] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showTextPreview ? 'टेक्स्ट छुपाएँ' : 'पूरा टेक्स्ट देखें'}</span>
            </button>
          </div>

          {showTextPreview && (
            <div className="space-y-2">
              <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] font-sans text-gray-700 whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
                {fullDetailedText}
              </pre>
              <p className="text-[11px] text-gray-500 font-medium">
                नोट: &ldquo;SMS से भेजें&rdquo; दबाने पर मोबाइल नेटवर्क सीमा के अनुसार संक्षिप्त बकाया सारांश SMS जाता है, जबकि कॉपी व शेयर में पूरा विवरण जाता है।
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              {copiedText ? (
                <Check className="w-3.5 h-3.5 text-[#2D5A27]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedText ? 'कॉपी हुआ' : 'टेक्स्ट कॉपी करें'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendSms}
              className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS से भेजें</span>
            </button>

            <button
              type="button"
              onClick={handleNativeTextShare}
              className="py-2.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Text शेयर करें</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
