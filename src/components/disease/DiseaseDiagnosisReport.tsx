import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  Leaf, 
  FlaskConical, 
  Calendar, 
  Sparkles, 
  Share2, 
  Copy, 
  RotateCcw, 
  MessageCircle, 
  Store, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ShoppingCart, 
  Info, 
  Eye, 
  Bug, 
  ShieldAlert, 
  FileText,
  Layers,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';
import { DiseaseAnalysis } from '../../services/gemini';
import { Product } from '../../types';
import { parseDiseaseReport } from '../../utils/diseaseReportParser';
import SmartImage from '../SmartImage';

interface DiseaseDiagnosisReportProps {
  analysisResult: DiseaseAnalysis;
  images: string[];
  activeScanId: string | null;
  onReset: () => void;
  whatsappNumber: string;
  matchedProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, variant?: any) => void;
  addedProductId: string | null;
  getCategoryName?: (catId: string) => string;
}

export const DiseaseDiagnosisReport: React.FC<DiseaseDiagnosisReportProps> = ({
  analysisResult,
  images,
  activeScanId,
  onReset,
  whatsappNumber,
  matchedProducts,
  onSelectProduct,
  onAddToCart,
  addedProductId,
  getCategoryName
}) => {
  const [copied, setCopied] = useState(false);

  // Parse the raw analysis into structured diagnostic sections
  const report = useMemo(() => {
    return parseDiseaseReport(analysisResult.analysis, images.length, analysisResult.keywords || []);
  }, [analysisResult, images.length]);

  // Current formatted timestamp
  const scanDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('hi-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) + ' • ' + d.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
  }, []);

  // WhatsApp share text generator
  const shareText = useMemo(() => {
    return `*फल्सावदिया कृषि बाजार - डिजिटल फसल रोग रिपोर्ट*\n` +
      `🌿 *फसल:* ${report.cropName}\n` +
      `🔍 *रोग / कीट:* ${report.specificName} (${report.pestOrDiseaseType})\n` +
      `⚠️ *गंभीरता:* ${report.severity} (AI सटीकता: ${report.confidenceScore}%)\n\n` +
      `*लक्षण:*\n${report.symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
      (report.chemicalTreatments.length > 0 
        ? `*अनुशंसित रासायनिक उपचार:*\n${report.chemicalTreatments.map(t => `• ${t.title}: ${t.dosage || t.instructions}`).join('\n')}\n\n` 
        : '') +
      (report.organicTreatments.length > 0 
        ? `*जैविक उपचार:*\n${report.organicTreatments.map(t => `• ${t.title}: ${t.dosage || t.instructions}`).join('\n')}\n\n` 
        : '') +
      `📍 *दुकान:* फल्सावदिया कृषि बाजार, डिम्पल चौराहा, शामगढ़ (8:00 AM - 8:00 PM)`;
  }, [report]);

  const handleCopyReport = () => {
    try {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `फसल रोग रिपोर्ट: ${report.cropName} - ${report.specificName}`,
          text: shareText
        });
      } catch (err) {
        handleCopyReport();
      }
    } else {
      handleCopyReport();
    }
  };

  const severityBadgeClass = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-50 text-red-800 border-red-200'
  }[report.severityCode] || 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ============================================================ */}
      {/* MAIN DIAGNOSTIC REPORT CONTAINER */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 overflow-hidden">
        
        {/* REPORT HEADER: Diagnostic Seal & Metadata */}
        <div className="bg-gradient-to-r from-[#2D5A27] via-[#23481e] to-[#1a3816] text-white p-5 sm:p-6 border-b border-green-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                    डिजिटल पादप रोग रिपोर्ट
                  </span>
                  <span className="text-[10px] text-green-200/80 font-medium">
                    {images.length > 1 ? `${images.length} Photos Multi-Scan` : 'AI Verified'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                  फसल स्वास्थ्य परीक्षण परिणाम
                </h2>
              </div>
            </div>

            {/* Quick Actions (Share & Copy) */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleNativeShare}
                className="bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-sm"
                title="रिपोर्ट शेयर करें"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'कॉपी हो गई' : 'शेयर करें'}</span>
              </button>
              <button
                onClick={handleCopyReport}
                className="bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white p-2 rounded-xl text-xs font-bold border border-white/20 shadow-sm"
                title="टेक्स्ट कॉपी करें"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-header Meta Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-3 border-t border-white/10 text-xs text-green-100/90">
            {activeScanId && (
              <span className="flex items-center gap-1 font-mono text-[11px] bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                <FileText className="w-3 h-3 text-emerald-300" />
                ID: {activeScanId.replace('scan_', '#')}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
              <Calendar className="w-3 h-3 text-emerald-300" />
              {scanDate}
            </span>
            <span className="flex items-center gap-1 text-[11px] bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
              <Layers className="w-3 h-3 text-emerald-300" />
              {images.length} तस्वीरें विश्लेषित
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. DIAGNOSIS SUMMARY HERO CARD */}
        {/* ============================================================ */}
        <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-b from-emerald-50/30 to-white">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2D5A27] mb-3">
            <Activity className="w-4 h-4" />
            <span>1. मुख्य निदान सारांश (Diagnosis Summary)</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-900/10 shadow-sm space-y-4">
            {/* Disease Primary Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">पहचानी गई बीमारी / कीट:</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-0.5 rounded-full">
                    {report.pestOrDiseaseType}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#4A3728] mt-1 leading-tight">
                  {report.specificName}
                </h1>
                {report.scientificName && (
                  <p className="text-xs italic text-gray-500 font-medium">
                    वैज्ञानिक नाम: {report.scientificName}
                  </p>
                )}
              </div>

              {/* Crop Name Badge */}
              <div className="flex items-center gap-2 bg-[#F5F2ED] px-3.5 py-2 rounded-2xl border border-gray-200 self-start sm:self-center">
                <Leaf className="w-5 h-5 text-[#2D5A27] shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">प्रभावित फसल</p>
                  <p className="text-xs font-extrabold text-[#4A3728]">{report.cropName}</p>
                </div>
              </div>
            </div>

            {/* Metrics Row: Confidence, Severity, Status */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1">
              {/* Confidence Metric */}
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-tight mb-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>AI सटीकता</span>
                </div>
                <p className="text-base sm:text-xl font-black text-emerald-900">{report.confidenceScore}%</p>
                <p className="text-[9px] font-bold text-emerald-700">उच्च विश्वसनीयता</p>
              </div>

              {/* Severity Metric */}
              <div className={`border rounded-2xl p-3 text-center ${severityBadgeClass}`}>
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-tight mb-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span>रोग की तीव्रता</span>
                </div>
                <p className="text-base sm:text-xl font-black">{report.severity}</p>
                <p className="text-[9px] font-bold opacity-80">गंभीरता स्तर</p>
              </div>

              {/* Curability Status */}
              <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-800 uppercase tracking-tight mb-0.5">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>स्थिति</span>
                </div>
                <p className="text-base sm:text-xl font-black text-blue-900">उपचार योग्य</p>
                <p className="text-[9px] font-bold text-blue-700">समय पर स्प्रे करें</p>
              </div>
            </div>

            {/* Short Summary Callout */}
            {report.summary && (
              <div className="bg-gray-50/80 rounded-xl p-3 text-xs text-gray-700 border border-gray-200/60 leading-relaxed font-medium">
                💡 <strong className="text-gray-900">निदान निष्कर्ष:</strong> {report.summary}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. IDENTIFIED SYMPTOMS (पहचाने गए लक्षण) */}
        {/* ============================================================ */}
        {report.symptoms.length > 0 && (
          <div className="p-5 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2D5A27]">
                <Eye className="w-4 h-4 text-[#2D5A27]" />
                <span>2. पहचाने गए लक्षण (Identified Symptoms)</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {report.symptoms.length} मुख्य लक्षण
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {report.symptoms.map((symptom, idx) => (
                <div 
                  key={idx}
                  className="bg-amber-50/30 border border-amber-200/60 hover:border-amber-300 rounded-2xl p-3.5 flex items-start gap-3 transition-colors shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-900 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                    <Markdown>{symptom}</Markdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. POSSIBLE CAUSES (संभावित कारण) - if detected */}
        {/* ============================================================ */}
        {report.causes.length > 0 && (
          <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-3">
              <Bug className="w-4 h-4 text-amber-700" />
              <span>3. संक्रमण एवं फैलाव के कारण (Possible Causes)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {report.causes.map((cause, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-700 flex items-start gap-2.5 shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <div className="font-medium leading-relaxed">
                    <Markdown>{cause}</Markdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4 & 5. WHAT TO DO NOW / MANAGEMENT & CONTROL */}
        {/* ============================================================ */}
        <div className="p-5 sm:p-6 border-b border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2D5A27]">
              <FlaskConical className="w-4 h-4 text-[#2D5A27]" />
              <span>4. अनुशंसित उपचार एवं प्रबंधन (Recommended Treatment)</span>
            </div>
            {report.treatmentIntro && (
              <span className="text-[11px] font-bold text-[#2D5A27] bg-[#2D5A27]/10 px-2.5 py-0.5 rounded-full">
                उपलब्ध समाधान
              </span>
            )}
          </div>

          {report.treatmentIntro && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-900 font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{report.treatmentIntro}</p>
            </div>
          )}

          {/* SECTION A: CHEMICAL CONTROL (रासायनिक नियंत्रण) */}
          {report.chemicalTreatments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-sm font-extrabold text-gray-900">
                  (क) रासायनिक नियंत्रण (Chemical Solutions)
                </h3>
                <span className="text-[10px] text-gray-500 font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  डोज़ का ध्यान रखें
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {report.chemicalTreatments.map((step) => (
                  <div 
                    key={step.id}
                    className="bg-white rounded-2xl p-4 border-2 border-blue-100 hover:border-blue-300 transition-colors shadow-sm space-y-3"
                  >
                    {/* Header: Step number & Chemical Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                          {step.stepNumber}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight">
                            {step.title}
                          </h4>
                          {step.technicalName && (
                            <p className="text-xs font-semibold text-blue-800">
                              Technical: {step.technicalName}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 px-2 py-0.5 rounded-lg shrink-0">
                        विकल्प {step.stepNumber}
                      </span>
                    </div>

                    {/* Dosage Highlight Pills */}
                    {(step.pumpDosage || step.acreDosage) && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {step.pumpDosage && (
                          <div className="bg-blue-50 border border-blue-200/80 text-blue-900 text-[11px] font-extrabold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                            <span>💧 प्रति पंप:</span>
                            <span className="text-blue-950 font-black">{step.pumpDosage}</span>
                          </div>
                        )}
                        {step.acreDosage && (
                          <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-[11px] font-extrabold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                            <span>🌾 प्रति एकड़:</span>
                            <span className="text-emerald-950 font-black">{step.acreDosage}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Spray / Application Details */}
                    <div className="text-xs text-gray-700 leading-relaxed font-medium bg-gray-50/80 p-3 rounded-xl border border-gray-200/60">
                      <Markdown>{step.instructions}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: ORGANIC CONTROL (जैविक नियंत्रण) */}
          {report.organicTreatments.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-sm font-extrabold text-[#2D5A27]">
                  (ख) जैविक एवं प्राकृतिक उपचार (Organic & Natural Solutions)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  पर्यावरण अनुकूल
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {report.organicTreatments.map((step) => (
                  <div 
                    key={step.id}
                    className="bg-white rounded-2xl p-4 border-2 border-emerald-100 hover:border-emerald-300 transition-colors shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                          🌱
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#2D5A27] text-sm sm:text-base leading-tight">
                            {step.title}
                          </h4>
                          {step.technicalName && (
                            <p className="text-xs font-semibold text-emerald-800">
                              {step.technicalName}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg shrink-0">
                        जैविक उपाय
                      </span>
                    </div>

                    {(step.pumpDosage || step.acreDosage) && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {step.pumpDosage && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-extrabold px-3 py-1 rounded-xl flex items-center gap-1.5">
                            <span>💧 प्रति पंप:</span>
                            <span className="font-black">{step.pumpDosage}</span>
                          </div>
                        )}
                        {step.acreDosage && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-extrabold px-3 py-1 rounded-xl flex items-center gap-1.5">
                            <span>🌾 प्रति एकड़:</span>
                            <span className="font-black">{step.acreDosage}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-gray-700 leading-relaxed font-medium bg-emerald-50/30 p-3 rounded-xl border border-emerald-200/50">
                      <Markdown>{step.instructions}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION C: PREVENTION & PRECAUTIONS (बचाव एवं सावधानियां) */}
          {report.preventionTips.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <h3 className="text-sm font-extrabold text-amber-950">
                  (ग) दीर्घकालिक रोकथाम एवं सावधानियां (Prevention & Precautions)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {report.preventionTips.map((tip, idx) => (
                  <div 
                    key={idx}
                    className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div className="text-xs text-gray-800 leading-relaxed font-medium">
                      <Markdown>{tip}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 6. PRODUCT RECOMMENDATIONS FROM SHOP (दुकान समाधान) */}
        {/* ============================================================ */}
        {matchedProducts.length > 0 && (
          <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-b from-white to-emerald-50/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2D5A27]">
                <ShoppingCart className="w-4 h-4 text-[#2D5A27]" />
                <span>6. दुकान पर उपलब्ध दवाएं (Shop Remedies)</span>
              </div>
              <span className="text-[10px] font-bold text-[#2D5A27] bg-[#2D5A27]/10 px-2 py-0.5 rounded-full">
                {matchedProducts.length} दवाएं उपलब्ध
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchedProducts.map((product, idx) => (
                <div 
                  key={`${product.id}-${idx}`}
                  onClick={() => onSelectProduct(product)}
                  className="bg-white rounded-2xl p-3.5 border-2 border-gray-100 hover:border-[#2D5A27]/40 transition-all shadow-sm flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                      <SmartImage 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full" 
                        objectFit="cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-gray-900 text-sm leading-tight truncate mb-1">
                        {product.hindiName || product.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] bg-[#2D5A27] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tight">
                          {product.brand || (getCategoryName ? getCategoryName(product.category) : 'दवा')}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold">
                          ₹{product.price} ({product.unit || 'Pack'})
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product, product.variants?.[0]);
                          }}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all ${
                            addedProductId === product.id 
                              ? "bg-green-600 text-white" 
                              : "bg-[#2D5A27] text-white hover:bg-green-800"
                          }`}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>{addedProductId === product.id ? 'जोड़ा गया ✓' : 'Add to Cart'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:translate-x-1 group-hover:text-[#2D5A27] transition-all" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* UNPARSED FALLBACK (Guarantees zero dropped content) */}
        {/* ============================================================ */}
        {report.unparsedMarkdown && (
          <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50">
            <h4 className="text-xs font-bold text-gray-600 mb-2">अतिरिक्त विवरण:</h4>
            <div className="markdown-body text-xs sm:text-sm leading-relaxed text-gray-700">
              <Markdown>{report.unparsedMarkdown}</Markdown>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. SHOP TIMINGS & OFFICIAL ADVISORY CARD */}
        {/* ============================================================ */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-[#F5F2ED] to-[#ede7dc] border-b border-gray-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#4A3728]">
            <Store className="w-4 h-4 text-[#2D5A27]" />
            <span>7. दुकान संपर्क एवं व्यक्तिगत परामर्श</span>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-[#4A3728]/10 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-[#2D5A27] flex items-center gap-1.5">
                  <span>फल्सावदिया कृषि बाजार</span>
                  <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">शामगढ़</span>
                </h4>
                <p className="text-xs text-gray-600 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>डिम्पल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ (458883)</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-center">
                <Clock className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span className="text-[11px] font-bold text-emerald-900">सुबह 8:00 से रात 8:00 बजे तक</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-600 leading-relaxed pt-1">
              पौधे का नमूना या यह रिपोर्ट लेकर सीधे दुकान पर आएं और हमारे अनुभवी कृषि वैज्ञानिकों से अपनी फसल के लिए सबसे सटीक व किफायती दवा प्राप्त करें।
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 8. IMPORTANT WARNING & DISCLAIMER */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 bg-amber-50/80 border-b border-amber-200/60">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-relaxed space-y-1">
              <p className="font-extrabold text-amber-950">
                महत्वपूर्ण कृषि सुरक्षा निर्देश:
              </p>
              <p>
                • दवाओं का छिड़काव हमेशा शांत हवा में सुबह या शाम के समय करें। कीटनाशकों का इस्तेमाल करते समय मास्क और दस्ताने पहनें।
              </p>
              <p className="text-amber-800/90 text-[10px]">
                • यह विश्लेषण AI कंप्यूटर विज़न मॉडल द्वारा तस्वीरों के आधार पर तैयार किया गया है। बड़े पैमाने पर स्प्रे से पहले स्थानीय कृषि विशेषज्ञ से सलाह अवश्य लें।
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTION BUTTONS (WhatsApp, New Scan) */}
        {/* ============================================================ */}
        <div className="p-5 sm:p-6 bg-white flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onReset}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>नई फोटो जाँचें (New Scan)</span>
          </button>
          
          <a 
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              `नमस्ते फल्सावदिया कृषि बाजार विशेषज्ञ,\n\n` +
              `मैंने अभी ऐप के माध्यम से फसल रोग जाँच की है:\n` +
              `• फसल: ${report.cropName}\n` +
              `• बीमारी: ${report.specificName}\n` +
              `• गंभीरता: ${report.severity}\n\n` +
              `*AI जाँच रिपोर्ट सारांश:*\n${report.summary}\n\n` +
              `कृपया मुझे सही दवा, सटीक डोज़ और स्प्रे करने का सही समय बताएं।\n\n` +
              `धन्यवाद!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[2] bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>विशेषज्ञ से पूछें (WhatsApp)</span>
          </a>
        </div>

      </div>
    </motion.div>
  );
};

export default DiseaseDiagnosisReport;
