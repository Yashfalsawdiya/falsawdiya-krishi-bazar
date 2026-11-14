import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import { AccountingSale } from '../../types/accounting';
import {
  buildSalesInvoiceFileName,
  formatBillDateDdMmYyyy,
  generateSalesInvoicePdfBlob,
} from '../../utils/salesInvoicePdfGenerator';
import {
  copyTextToClipboard,
  formatDetailedSalesBillText,
  GeneratedSalesInvoiceImage,
  generateSalesInvoiceImage,
  isSaleEligibleForImageShare,
  MAX_IMAGE_SHARE_ITEMS,
  openSmsComposer,
  openWhatsAppWithText,
  shareFileOrDownloadFallback,
  triggerBlobDownload,
} from '../../utils/salesInvoiceShareUtils';

interface POSBillShareModalProps {
  sale: AccountingSale | null;
  customerOutstanding?: number;
  includeOutstandingInText?: boolean;
  onClose: () => void;
}

export const POSBillShareModal: React.FC<POSBillShareModalProps> = ({
  sale,
  customerOutstanding = 0,
  includeOutstandingInText = false,
  onClose,
}) => {
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedSalesInvoiceImage | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pdfActionLoading, setPdfActionLoading] = useState<'share' | 'download' | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [showTextPreview, setShowTextPreview] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const itemsCount = sale?.items?.length || 0;
  const canShareImage = sale ? isSaleEligibleForImageShare(sale) : false;

  const pdfFileName = useMemo(
    () => (sale ? buildSalesInvoiceFileName(sale, 'pdf') : ''),
    [sale]
  );

  const detailedBillText = useMemo(() => {
    if (!sale) return '';
    return formatDetailedSalesBillText(sale, {
      customerOutstanding,
      includeOutstanding: includeOutstandingInText,
    });
  }, [sale, customerOutstanding, includeOutstandingInText]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ type, text });
  };

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  // Reset & initialize on sale change
  useEffect(() => {
    if (!sale) {
      setGeneratedImage(null);
      setImageError(null);
      setIsGeneratingImage(false);
      setCopiedText(false);
      setShowTextPreview(false);
      setToastMsg(null);
      return;
    }

    const digits = (sale.customerPhone || '').replace(/\D/g, '');
    setPhoneInput(digits.length >= 10 ? digits.slice(-10) : digits);
    setGeneratedImage(null);
    setImageError(null);
    setCopiedText(false);
    setShowTextPreview(false);
    setToastMsg(null);

    if (!isSaleEligibleForImageShare(sale)) {
      setIsGeneratingImage(false);
      return;
    }

    let cancelled = false;
    setIsGeneratingImage(true);
    generateSalesInvoiceImage(sale, customerOutstanding)
      .then((res) => {
        if (!cancelled) {
          setGeneratedImage(res);
        }
      })
      .catch((err) => {
        console.error('POS Bill image generation failed:', err);
        if (!cancelled) {
          setImageError('बिल इमेज तैयार करने में समस्या आई। कृपया पुनः प्रयास करें या PDF का उपयोग करें।');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsGeneratingImage(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sale, customerOutstanding]);

  if (!sale) return null;

  const handleRetryImage = async () => {
    if (!canShareImage) return;
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const res = await generateSalesInvoiceImage(sale, customerOutstanding);
      setGeneratedImage(res);
    } catch {
      setImageError('बिल इमेज तैयार नहीं हो सकी। कृपया PDF विकल्प का उपयोग करें।');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareImage = async () => {
    if (!canShareImage) {
      showToast('इस बिल में 10 से अधिक आइटम हैं — कृपया PDF शेयर करें।', 'info');
      return;
    }
    if (!generatedImage) return;

    const outcome = await shareFileOrDownloadFallback(
      generatedImage.blob,
      generatedImage.fileName,
      'image/png',
      `बिक्री बिल #${sale.invoiceNo}`,
      detailedBillText
    );

    if (outcome === 'shared') {
      showToast('बिल इमेज सफलतापूर्वक शेयर की गई!');
    } else if (outcome === 'downloaded') {
      showToast(`ब्राउज़र पर डायरेक्ट शेयर सपोर्ट न होने से इमेज (${generatedImage.fileName}) डाउनलोड हो गई है — अब WhatsApp में भेजें।`, 'info');
    }
  };

  const handleDownloadImage = () => {
    if (!canShareImage) {
      showToast('इस बिल में 10 से अधिक आइटम हैं — कृपया PDF डाउनलोड करें।', 'info');
      return;
    }
    if (!generatedImage) return;

    triggerBlobDownload(generatedImage.blob, generatedImage.fileName);
    showToast(`बिल इमेज (${generatedImage.fileName}) डाउनलोड हो गई!`);
  };

  const handlePdfAction = async (mode: 'share' | 'download') => {
    if (pdfActionLoading) return;
    setPdfActionLoading(mode);
    try {
      const res = await generateSalesInvoicePdfBlob(sale, customerOutstanding);
      if (!res.success || !res.blob) {
        showToast(res.error || 'PDF तैयार करने में त्रुटि हुई।', 'error');
        return;
      }

      if (mode === 'download') {
        triggerBlobDownload(res.blob, res.fileName);
        showToast(`PDF (${res.fileName}) डाउनलोड हो गई!`);
        return;
      }

      const outcome = await shareFileOrDownloadFallback(
        res.blob,
        res.fileName,
        'application/pdf',
        `बिक्री बिल #${sale.invoiceNo}`,
        `बिक्री बिल #${sale.invoiceNo} - फल्सावदिया कृषि बाजार`
      );

      if (outcome === 'shared') {
        showToast('बिल PDF सफलतापूर्वक शेयर की गई!');
      } else if (outcome === 'downloaded') {
        showToast(`डायरेक्ट फाइल शेयर सपोर्ट न होने से PDF (${res.fileName}) डाउनलोड हो गई है — अब इसे WhatsApp में भेजें।`, 'info');
      }
    } catch {
      showToast('PDF बनाते समय त्रुटि हुई।', 'error');
    } finally {
      setPdfActionLoading(null);
    }
  };

  const handleSendWhatsApp = () => {
    if (!detailedBillText) return;
    openWhatsAppWithText(phoneInput, detailedBillText);
  };

  const handleCopyText = async () => {
    if (!detailedBillText) return;
    const ok = await copyTextToClipboard(detailedBillText);
    if (ok) {
      setCopiedText(true);
      showToast('पूरा विस्तृत बिल टेक्स्ट कॉपी हो गया!');
      window.setTimeout(() => setCopiedText(false), 2500);
    } else {
      showToast('टेक्स्ट कॉपी नहीं हो सका।', 'error');
    }
  };

  const handleSendSms = () => {
    if (!detailedBillText) return;
    const res = openSmsComposer(phoneInput, detailedBillText);
    if (!res.opened && res.reason === 'desktop') {
      showToast(
        'कंप्यूटर/लैपटॉप पर SMS ऐप उपलब्ध नहीं है — कृपया "टेक्स्ट कॉपी करें" या "WhatsApp भेजें" का उपयोग करें।',
        'info'
      );
    }
  };

  const handleNativeTextShare = async () => {
    if (!detailedBillText) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `बिक्री बिल #${sale.invoiceNo}`,
          text: detailedBillText,
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
              <span>बिक्री बिल शेयर करें (Share POS Bill)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              बिल <strong className="font-mono text-gray-800">#{sale.invoiceNo}</strong> · दिनांक:{' '}
              {formatBillDateDdMmYyyy(sale.date, sale.timestamp)} · {sale.customerName}
            </p>
            <p className="text-xs font-extrabold text-[#2D5A27] mt-0.5">
              कुल बिल: ₹{(sale.finalTotal || 0).toLocaleString('en-IN')} ({itemsCount} उत्पाद)
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
              className="p-0.5 rounded-lg hover:bg-black/5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Direct WhatsApp Text Bill */}
        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#1B4316]">
              <MessageCircle className="w-4 h-4 text-[#2D5A27] shrink-0" />
              <span>WhatsApp पर पूरा बिल (Detailed Text) भेजें</span>
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
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                placeholder="ग्राहक का मोबाइल नं. (10 अंक)"
                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]"
              />
            </div>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-[#2D5A27] hover:bg-[#20401B] text-white text-xs font-black shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp भेजें</span>
            </button>
          </div>
        </div>

        {/* 2. HD Image Receipt (<= 10 Items) & PDF File Share / Download */}
        <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-gray-800">
              <ImageIcon className="w-4 h-4 text-[#2D5A27] shrink-0" />
              <span>HD बिल इमेज रसीद (अधिकतम {MAX_IMAGE_SHARE_ITEMS} उत्पाद)</span>
            </div>
            {isGeneratingImage && (
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                इमेज बन रही है...
              </span>
            )}
          </div>

          {canShareImage ? (
            <>
              {generatedImage ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white max-h-56 overflow-y-auto shadow-2xs">
                  <img
                    src={generatedImage.dataUrl}
                    alt={`बिक्री बिल #${sale.invoiceNo}`}
                    className="w-full h-auto block"
                  />
                </div>
              ) : isGeneratingImage ? (
                <div className="py-8 rounded-xl border border-dashed border-gray-300 bg-white text-center text-xs text-gray-500 font-medium">
                  HD बिल इमेज रसीद तैयार की जा रही है...
                </div>
              ) : imageError ? (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center justify-between gap-2">
                  <span>{imageError}</span>
                  <button
                    type="button"
                    onClick={handleRetryImage}
                    className="px-2.5 py-1 bg-white border border-red-200 rounded-lg text-[11px] font-bold text-red-700 hover:bg-red-100 shrink-0 cursor-pointer"
                  >
                    पुनः प्रयास
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!generatedImage || isGeneratingImage}
                  onClick={handleShareImage}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 border border-gray-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                  <span>Image शेयर करें</span>
                </button>
                <button
                  type="button"
                  disabled={!generatedImage || isGeneratingImage}
                  onClick={handleDownloadImage}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 border border-gray-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                  <span>Image डाउनलोड</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>कृपया PDF शेयर करें (Image Share सीमा: {MAX_IMAGE_SHARE_ITEMS} उत्पाद)</span>
              </div>
              <p className="text-[11px] leading-relaxed font-medium">
                इस बिल में <strong>{itemsCount} उत्पाद</strong> हैं। 10 से अधिक उत्पाद होने पर इमेज में विवरण बहुत छोटा और धुंधला हो जाता है। स्पष्ट प्रिंट व ग्राहक को भेजने के लिए कृपया नीचे दिए गए <strong>PDF शेयर / डाउनलोड</strong> का उपयोग करें।
              </p>
            </div>
          )}

          {/* PDF Share & Download Row */}
          <div className="pt-2 border-t border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-gray-600">
              <span className="font-black text-gray-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2D5A27]" />
                बिल PDF फ़ाइल
              </span>
              <span className="font-mono text-[10px] text-gray-500 truncate max-w-[230px]" title={pdfFileName}>
                {pdfFileName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pdfActionLoading !== null}
                onClick={() => handlePdfAction('share')}
                className="py-2.5 px-3 rounded-xl bg-[#2D5A27] hover:bg-[#20401B] disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                {pdfActionLoading === 'share' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>PDF तैयार हो रही...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>PDF शेयर करें</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={pdfActionLoading !== null}
                onClick={() => handlePdfAction('download')}
                className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-[#1B4316] border border-emerald-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
              >
                {pdfActionLoading === 'download' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>डाउनलोड हो रहा...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>PDF डाउनलोड</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Detailed Text Summary: Copy, SMS & System Text Share */}
        <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-gray-800">
              विस्तृत बिल टेक्स्ट (Copy / SMS / Message)
            </span>
            <button
              type="button"
              onClick={() => setShowTextPreview((prev) => !prev)}
              className="text-[11px] font-bold text-[#2D5A27] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showTextPreview ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>टेक्स्ट छिपाएँ</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>पूरा टेक्स्ट देखें</span>
                </>
              )}
            </button>
          </div>

          {showTextPreview && (
            <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-700 whitespace-pre-wrap font-sans max-h-44 overflow-y-auto leading-relaxed">
              {detailedBillText}
            </pre>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2D5A27]" />
                  <span>कॉपी हो गया</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>टेक्स्ट कॉपी करें</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendSms}
              className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>SMS से भेजें</span>
            </button>

            <button
              type="button"
              onClick={handleNativeTextShare}
              className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
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

export default POSBillShareModal;
