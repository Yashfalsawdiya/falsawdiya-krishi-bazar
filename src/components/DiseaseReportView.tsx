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
  BadgeCheck,
  EyeOff
} from 'lucide-react';
import { DiseaseAnalysis } from '../services/gemini';
import { parseDiseaseReport } from '../utils/diseaseReportParser';
import { useAppContext } from '../context/AppContext';

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
  const { isAdmin, appContent } = useAppContext();
  const [copied, setCopied] = useState(false);

  // Admin always has treatment plan visibility; normal users follow global setting (default true)
  const isTreatmentPlanVisible = isAdmin || (appContent?.showTreatmentPlanInDiseaseReport !== false);

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
    let treatmentText = '';
    if (isTreatmentPlanVisible) {
      treatmentText = `💊 अनुशंसित रासायनिक उपचार:\n${report.chemicalControl.map((c, i) => `${i + 1}. ${c.medicineName}: ${c.dosagePump} ${c.dosageBigha ? `[शामगढ़ बीघा: ${c.dosageBigha}]` : ''} ${c.dosageAcre ? `[एकड़: ${c.dosageAcre}]` : ''}`).join('\n')}\n\n` +
        (report.organicControl.length > 0 ? `🌿 जैविक उपचार:\n${report.organicControl.map((o, i) => `${i + 1}. ${o.methodName}: ${o.dosage}`).join('\n')}\n\n` : '');
    } else {
      treatmentText = `🏪 अनुशंसित कृषि समाधान:\nआपकी फसल में पहचानी गई समस्या (${report.diseaseName}) के प्रभावी प्रबंधन हेतु सही उत्पाद व उचित मार्गदर्शन के लिए फल्सावदिया कृषि बाजार शामगढ़ पर पधारें।\n\n`;
    }

    const textToCopy = `📋 फसल रोग जाँच रिपोर्ट (${reportId || 'Falsawdiya Krishi'})\n` +
      `🌾 फसल: ${report.cropName}\n` +
      `⚠️ समस्या: ${report.problemType} - ${report.diseaseName}\n\n` +
      `🔍 प्रमुख लक्षण:\n${report.symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
      treatmentText +
      `🛡️ बचाव एवं सावधानियां:\n${report.preventionTips.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n` +
      (isTreatmentPlanVisible ? `📍 नोट: मात्रा की गणना शामगढ़ क्षेत्र के पक्का बीघा माप (1 बीघा = 27,225 वर्ग फीट, 1 एकड़ = 1.60 बीघा) के अनुसार की गई है।\n` : '') +
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
    (isTreatmentPlanVisible 
      ? `*अनुशंसित दवाएं:*\n${report.chemicalControl.map((c, i) => `${i + 1}. ${c.medicineName} (${c.dosagePump})`).join('\n')}\n\n`
      : `*कृषि मार्गदर्शन परामर्श:*\nमेरी फसल में ${report.diseaseName} की समस्या के लिए सही उत्पाद, असली ब्रांड व सटीक मार्गदर्शन प्रदान करें।\n\n`
    ) +
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
              <div className="w-7 h-7 rounded-xl bg-[#ECFDF5] text-[#183D16] border border-[#2D5A27]/20 flex items-center justify-center font-bold text-xs">
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

      {/* 4. SECTION 3: RECOMMENDED TREATMENT PLAN (उपचार योजना) OR PROMOTIONAL GUIDANCE CARD */}
      {isTreatmentPlanVisible ? (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-extrabold text-[#4A3728] text-sm tracking-wide">
                अनुशंसित उपचार योजना (Treatment Plan)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {appContent?.showTreatmentPlanInDiseaseReport === false && isAdmin && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <EyeOff className="w-3 h-3 text-amber-700" />
                  एडमिन दृश्य (ग्राहकों के लिए बंद)
                </span>
              )}
              <span className="text-[10px] font-bold text-[#2D5A27] bg-[#2D5A27]/10 px-2.5 py-0.5 rounded-full">
                सटीक डोज़ सहित
              </span>
            </div>
          </div>

        {/* Local Shamgarh Land Measurement Notice */}
        <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-black text-amber-950">स्थानीय भूमि माप मानक: </span>
            मात्रा की गणना शामगढ़ क्षेत्र के पक्का बीघा माप (1 बीघा = 27,225 वर्ग फीट, 1 एकड़ = 1.60 बीघा) के अनुसार की गई है।
          </p>
        </div>

        {/* Treatment Shop Notice */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 rounded-2xl border border-emerald-200/80 p-3.5 sm:p-4 shadow-xs space-y-2.5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <h5 className="font-extrabold text-[#2D5A27] text-xs sm:text-sm tracking-tight leading-snug">
                सभी कृषि उत्पाद फल्सावदिया कृषि बाजार पर उपलब्ध हैं
              </h5>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <BadgeCheck className="w-3 h-3 text-[#2D5A27]" /> 100% असली ब्रांड्स
            </span>
          </div>

          {/* Description */}
          <p className="text-[11px] sm:text-xs text-gray-700 font-medium leading-relaxed">
            अपनी फसल की समस्या के अनुसार अनुशंसित उत्पाद हमारे स्टोर से प्राप्त करें और बेहतर फसल सुरक्षा एवं पैदावार के लिए फल्सावदिया कृषि बाजार के साथ जुड़ें।
          </p>
        </div>

        {/* Sub-section A: Chemical Control */}
        {report.chemicalControl.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 px-1">
              <Droplets className="w-4 h-4 text-[#2D5A27]" />
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                रासायनिक नियंत्रण (Chemical Control)
              </h5>
            </div>

            <div className="space-y-2.5">
              {report.chemicalControl.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-2xl border-2 border-[#2D5A27]/20 hover:border-[#2D5A27]/40 transition-all shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-lg bg-[#ECFDF5] text-[#183D16] font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-[#2D5A27]/25">
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
                      <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#183D16] text-[11px] font-extrabold px-2.5 py-1 rounded-xl border border-[#2D5A27]/20">
                        <Droplets className="w-3 h-3 text-[#2D5A27]" />
                        <span>पंप डोज़: {item.dosagePump}</span>
                      </span>
                    )}
                    {item.dosageBigha && (
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 text-[11px] font-black px-2.5 py-1 rounded-xl border border-amber-200">
                        <Sprout className="w-3 h-3 text-amber-700" />
                        <span>प्रति शामगढ़ बीघा: {item.dosageBigha}</span>
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
                    <p className="text-[11px] text-gray-500 font-medium pl-7 leading-relaxed flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{item.instructions}</span>
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
                          <Leaf className="w-3 h-3 text-emerald-600" />
                          <span>मात्रा: {item.dosage}</span>
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
    ) : (
        /* PROMOTIONAL GUIDANCE CARD WHEN TREATMENT PLAN IS DISABLED FOR USERS */
        <div className="bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/40 rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-200/80 space-y-4 relative overflow-hidden">
          {/* Subtle decorative background circle */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#2D5A27]/5 rounded-bl-full pointer-events-none" />

          {/* Card Header Row */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#2D5A27] text-white flex items-center justify-center font-black text-xs">
                  3
                </div>
                <h4 className="font-extrabold text-[#4A3728] text-sm sm:text-base tracking-wide">
                  अनुशंसित समाधान (Recommended Guidance)
                </h4>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <BadgeCheck className="w-3 h-3 text-[#2D5A27]" /> 100% असली उत्पाद
            </span>
          </div>

          {/* Dynamic Disease Highlight Chip */}
          <div className="bg-amber-100/90 border border-amber-300/80 p-3 rounded-2xl flex items-center gap-2.5 shadow-2xs">
            <Bug className="w-4 h-4 text-amber-800 shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-amber-950">
              आपकी फसल में पहचानी गई समस्या: <span className="font-black text-[#854D0E] underline decoration-amber-500/50">{report.diseaseName || 'पहचानी गई बीमारी'}</span>
            </p>
          </div>

          {/* Main Promotional Heading & Description */}
          <div className="space-y-2">
            <h5 className="font-extrabold text-[#2D5A27] text-sm sm:text-base leading-snug">
              आपकी फसल के बेहतर स्वास्थ्य के लिए हम हैं आपके साथ!
            </h5>
            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
              आपकी फसल में पहचानी गई बीमारी के प्रभावी प्रबंधन के लिए आवश्यक गुणवत्तापूर्ण कृषि उत्पाद हमारे Falsawdiya Krishi Bazaar पर उपलब्ध हैं। अपनी फसल की आवश्यकता के अनुसार सही उत्पाद और कृषि मार्गदर्शन प्राप्त करने के लिए हमारी दुकान पर पधारें।
            </p>
          </div>

          {/* Closing Guidance Message */}
          <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-200/70 shadow-2xs">
            <p className="text-xs text-gray-800 font-semibold leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
              <span>
                सही उत्पाद, उचित कृषि मार्गदर्शन और समय पर फसल सुरक्षा के साथ अपनी फसल को स्वस्थ रखें और बेहतर पैदावार की दिशा में आगे बढ़ें।
              </span>
            </p>
          </div>

          {/* Brand & Store Footer */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#2D5A27]/10 text-[#2D5A27] flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-black text-[#4A3728] leading-tight">
                  फल्सावदिया कृषि बाजार
                </p>
                <p className="text-[11px] text-gray-500 font-medium">
                  किसान का भरोसा, हमारी पहचान।
                </p>
              </div>
            </div>

            <a
              href="#store-advisory-section"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2D5A27] hover:bg-[#23471e] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>दुकान का पता व समय देखें</span>
            </a>
          </div>
        </div>
      )}

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
      <div id="store-advisory-section" className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A27]/10 text-[#2D5A27] flex items-center justify-center border border-[#2D5A27]/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#2D5A27] text-base leading-tight">
                फल्सावदिया कृषि बाजार
              </h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                शामगढ़ (मंदसौर) • अधिकृत कृषि सेवा केंद्र
              </p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-900 border border-amber-200/80 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            विश्वसनीय
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-gray-100 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                दुकान का समय
              </span>
              <p className="font-bold text-gray-800 leading-snug mt-0.5">
                सुबह 8:00 से रात 8:00 बजे तक
              </p>
            </div>
          </div>
          <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-gray-100 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                दुकान का पता
              </span>
              <p className="font-bold text-gray-800 leading-snug mt-0.5">
                डिम्पल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़ (458883)
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={onReset}
            className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-gray-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>नई फोटो जाँचें</span>
          </button>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[2] bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>विशेषज्ञ से WhatsApp पर बात करें</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
