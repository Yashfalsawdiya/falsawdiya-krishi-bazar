import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Layers,
  Sprout,
  Bug,
  ShieldCheck,
  Droplets,
  Leaf,
  Clock,
  MapPin,
  MessageCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  FileText,
  Store,
  BadgeCheck
} from 'lucide-react';
import { DiseaseAnalysis } from '../services/gemini';
import { parseDiseaseReport } from '../utils/diseaseReportParser';

interface DiseaseReportViewProps {
  analysisResult: DiseaseAnalysis;
  reportId?: string | null;
  imagesCount?: number;
  onReset: () => void;
  whatsappNumber?: string;
}

export const DiseaseReportView: React.FC<DiseaseReportViewProps> = ({
  analysisResult,
  reportId,
  imagesCount = 1,
  onReset,
  whatsappNumber = '919876543210'
}) => {
  const [copied, setCopied] = useState(false);

  // Parse report into structured pointwise sections
  const report = parseDiseaseReport(analysisResult.analysis, {
    cropName: analysisResult.cropName,
    problemType: analysisResult.problemType,
    diseaseName: analysisResult.diseaseName,
    severity: analysisResult.severity,
    symptoms: analysisResult.symptoms,
    chemicalControl: analysisResult.chemicalControl,
    organicControl: analysisResult.organicControl,
    preventionTips: analysisResult.preventionTips,
    shopNotice: analysisResult.shopNotice
  });

  const handleCopyReport = () => {
    const textToCopy = `📋 फसल रोग जाँच रिपोर्ट (${reportId || 'Falsawdiya Krishi'})\n` +
      `🌾 फसल: ${report.cropName}\n` +
      `⚠️ समस्या: ${report.problemType} - ${report.diseaseName}\n\n` +
      `🔍 प्रमुख लक्षण:\n${report.symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
      `💊 अनुशंसित रासायनिक उपचार:\n${report.chemicalControl.map((c, i) => `${i + 1}. ${c.medicineName}: ${c.dosagePump} ${c.dosageAcre ? `(${c.dosageAcre})` : ''}`).join('\n')}\n\n` +
      (report.organicControl.length > 0 ? `🌿 जैविक उपचार:\n${report.organicControl.map((o, i) => `${i + 1}. ${o.methodName}: ${o.dosage}`).join('\n')}\n\n` : '') +
      `🛡️ बचाव एवं सावधानियां:\n${report.preventionTips.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n` +
      `🏪 फल्सावदिया कृषि बाजार - डिम्पल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ (458883)`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // WhatsApp Message
  const whatsappMessage = encodeURIComponent(
    `नमस्ते फल्सावदिया कृषि बाजार विशेषज्ञ,\n\n` +
    `मैंने ऐप पर अपनी फसल की जाँच की है (${imagesCount} फोटो स्कैन):\n` +
    `• फसल: ${report.cropName}\n` +
    `• समस्या: ${report.problemType} (${report.diseaseName})\n\n` +
    `*जाँच में आए लक्षण:*\n${report.symptoms.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
    `*अनुशंसित दवाएं:*\n${report.chemicalControl.map((c, i) => `${i + 1}. ${c.medicineName} (${c.dosagePump})`).join('\n')}\n\n` +
    `कृपया मुझे सही दवा, असली ब्रांड व सटीक मात्रा के बारे में मार्गदर्शन करें।\nधन्यवाद!`
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* 1. REPORT HEADER & VERIFIED BADGE */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-bl-full pointer-events-none" />

        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center shadow-md shadow-[#2D5A27]/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-[#4A3728] text-base leading-tight">
                  फसल स्वास्थ्य रिपोर्ट
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI प्रमाणित
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                फल्सावदिया कृषि बाजार • डिजिटल लैब विश्लेषण
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all shrink-0"
            title="पूरी रिपोर्ट कॉपी करें"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">कॉपी हुआ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>कॉपी</span>
              </>
            )}
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="flex items-center justify-between gap-2 pt-3 text-[11px] font-medium text-gray-500 flex-wrap">
          {reportId && (
            <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-mono text-[10px] text-gray-600">
              ID: {reportId.slice(-8).toUpperCase()}
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-600 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-semibold">
            <Layers className="w-3 h-3 text-[#2D5A27]" />
            {imagesCount} {imagesCount > 1 ? 'फोटो से संयुक्त विश्लेषण' : 'फोटो से विश्लेषण'}
          </span>
        </div>
      </div>

      {/* 2. SECTION 1: PRIMARY DIAGNOSIS (मुख्य पहचान कार्ड) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h4 className="font-extrabold text-[#4A3728] text-sm tracking-wide">
              प्राथमिक पहचान (Primary Diagnosis)
            </h4>
          </div>
          {/* Severity Badge */}
          <span
            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              report.severity === 'SEVERE'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : report.severity === 'MILD'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {report.severity === 'SEVERE' ? (
              <AlertTriangle className="w-3 h-3 text-rose-600" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-600" />
            )}
            {report.severityLabel}
          </span>
        </div>

        {/* Diagnosis Highlight Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Crop Name */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-gray-100/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-[#2D5A27] flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                फसल का नाम (Crop)
              </span>
              <p className="font-extrabold text-[#2D5A27] text-sm sm:text-base leading-snug break-words">
                {report.cropName}
              </p>
            </div>
          </div>

          {/* Problem Type */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-gray-100/80 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                समस्या का प्रकार (Category)
              </span>
              <p className="font-extrabold text-[#854D0E] text-sm sm:text-base leading-snug break-words">
                {report.problemType}
              </p>
            </div>
          </div>
        </div>

        {/* Specific Disease / Pest Name Card */}
        <div className="bg-gradient-to-r from-emerald-50/70 to-amber-50/70 p-4 rounded-2xl border border-[#2D5A27]/20 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
              पहचाना गया कीट / रोग (Identified Pest / Disease)
            </span>
            <h5 className="font-black text-gray-900 text-base sm:text-lg leading-tight mt-0.5">
              {report.diseaseName}
            </h5>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#2D5A27] shrink-0">
            <CheckCircle2 className="w-6 h-6 text-[#2D5A27]" />
          </div>
        </div>
      </div>

      {/* 3. SECTION 2: OBSERVED SYMPTOMS (लक्षण - POINTWISE) */}
      {report.symptoms.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-extrabold text-[#4A3728] text-sm tracking-wide">
                दृश्यमान लक्षण (Observed Symptoms)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {report.symptoms.length} मुख्य बिंदु
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {report.symptoms.map((symptom, idx) => (
              <div
                key={idx}
                className="bg-[#FAF8F5] hover:bg-emerald-50/40 p-3.5 rounded-2xl border border-gray-100 transition-colors flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed flex-1">
                  {symptom}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SECTION 3: RECOMMENDED TREATMENT PLAN (उपचार योजना - POINTWISE) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h4 className="font-extrabold text-[#4A3728] text-sm tracking-wide">
              अनुशंसित उपचार योजना (Treatment Plan)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-[#2D5A27] bg-[#2D5A27]/10 px-2.5 py-0.5 rounded-full">
            सटीक डोज़ सहित
          </span>
        </div>

        {/* Treatment Shop Notice - Redesigned with visual hierarchy & elegant badges */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 rounded-2xl border border-emerald-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-extrabold text-[#2D5A27] text-xs sm:text-sm tracking-tight">
                  फल्सावदिया कृषि बाजार पर उपलब्ध
                </h5>
                <p className="text-[11px] text-gray-600 font-medium">
                  सभी अनुशंसित दवाएं व खाद हमारे स्टोर पर उचित दरों पर उपलब्ध हैं।
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <BadgeCheck className="w-3 h-3 text-[#2D5A27]" /> 100% असली ब्रांड्स
            </span>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {/* Address */}
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  दुकान का पता
                </span>
                <span className="font-bold text-gray-800 leading-snug">
                  डिम्पल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ (458883)
                </span>
              </div>
            </div>

            {/* Timings */}
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2 shadow-2xs">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  दुकान का समय
                </span>
                <span className="font-bold text-gray-800 leading-snug">
                  प्रतिदिन सुबह 8:00 बजे से रात 8:00 बजे तक
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-section A: Chemical Control */}
        {report.chemicalControl.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 px-1">
              <Droplets className="w-4 h-4 text-blue-600" />
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                रासायनिक नियंत्रण (Chemical Control)
              </h5>
            </div>

            <div className="space-y-2.5">
              {report.chemicalControl.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-2xl border-2 border-blue-100/80 hover:border-blue-300 transition-all shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                        {idx + 1}
                      </span>
                      <h6 className="font-black text-gray-900 text-xs sm:text-sm leading-tight">
                        {item.medicineName}
                      </h6>
                    </div>
                  </div>

                  {/* Dosage Badges Row */}
                  <div className="flex flex-wrap items-center gap-2 pl-7">
                    {item.dosagePump && (
                      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-blue-200">
                        <Droplets className="w-3 h-3 text-blue-600" />
                        <span>पंप डोज़: {item.dosagePump}</span>
                      </span>
                    )}
                    {item.dosageAcre && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-emerald-200">
                        <Sprout className="w-3 h-3 text-emerald-600" />
                        <span>प्रति एकड़: {item.dosageAcre}</span>
                      </span>
                    )}
                  </div>

                  {/* Additional spray instructions */}
                  {item.instructions && (
                    <p className="text-[11px] text-gray-500 font-medium pl-7 leading-relaxed">
                      💡 {item.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-section B: Organic Control */}
        {report.organicControl.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                जैविक नियंत्रण (Organic & Bio Control)
              </h5>
            </div>

            <div className="space-y-2.5">
              {report.organicControl.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h6 className="font-black text-gray-900 text-xs sm:text-sm">
                        {item.methodName}
                      </h6>
                      {item.dosage && (
                        <span className="inline-flex items-center gap-1.5 bg-white text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-emerald-200 mt-1.5 shadow-2xs">
                          🌿 मात्रा: {item.dosage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. SECTION 4: PREVENTION & PRECAUTIONS (बचाव एवं सावधानियां - POINTWISE CHECKLIST) */}
      {report.preventionTips.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h4 className="font-extrabold text-[#4A3728] text-sm tracking-wide">
                बचाव एवं सावधानियां (Prevention & Precautions)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              चेकलिस्ट
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {report.preventionTips.map((tip, idx) => (
              <div
                key={idx}
                className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-gray-100 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 border border-purple-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed flex-1">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. STORE ADVISORY, TIMINGS & CONSULTATION BANNER */}
      <div className="bg-gradient-to-br from-[#2D5A27] to-[#1E3F1A] rounded-3xl p-5 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-yellow-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm">
                फल्सावदिया कृषि बाजार
              </h4>
              <p className="text-[10px] text-emerald-200">शामगढ़ (मंदसौर) • अधिकृत कृषि सेवा केंद्र</p>
            </div>
          </div>
          <span className="bg-yellow-400 text-black text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
            विश्वसनीय
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-100">
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>दुकान समय: <strong>सुबह 8:00 से रात 8:00 बजे</strong></span>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl flex items-start gap-2">
            <MapPin className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
            <span className="leading-snug">डिम्पल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ (458883)</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={onReset}
            className="flex-1 bg-white/15 hover:bg-white/20 active:scale-95 text-white py-3.5 rounded-2xl text-xs font-bold transition-transform flex items-center justify-center gap-2 border border-white/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>नई फोटो जाँचें</span>
          </button>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[2] bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-transform"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>विशेषज्ञ से WhatsApp पर बात करें</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
