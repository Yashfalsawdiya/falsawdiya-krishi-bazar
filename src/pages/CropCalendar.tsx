import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ArrowLeft, ChevronRight, Sprout, Droplets, Scissors, TrendingUp, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CropCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const months = [
    "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"
  ];

  const calendarData = [
    {
      month: "जनवरी",
      crops: ["गेहूं", "चना", "लहसुन"],
      activities: [
        { icon: Droplets, task: "गेहूं की सिंचाई", desc: "शीर्ष जड़ निकलने के समय सिंचाई का ध्यान रखें।" },
        { icon: Scissors, task: "खरपतवार नियंत्रण", desc: "फसल में खरपतवार नाशक का प्रयोग करें।" },
        { icon: Info, task: "पाले से बचाव", desc: "रात में खेत के उत्तर-पश्चिम कोने में धुआं करें।" }
      ]
    },
    {
      month: "फरवरी",
      crops: ["गेहूं", "लहसुन", "मटर"],
      activities: [
        { icon: TrendingUp, task: "उर्वरक प्रयोग", desc: "यूरिया की दूसरी डोज़ समय पर दें।" },
        { icon: Droplets, task: "लहसुन की सिंचाई", desc: "कंद बनने की अवस्था में पर्याप्त नमी बनाए रखें।" },
        { icon: Scissors, task: "कीट निगरानी", desc: "इल्लियों या चूहों के प्रकोप पर नज़र रखें।" }
      ]
    },
    {
      month: "मार्च",
      crops: ["चना", "सरसों", "ग्रीष्मकालीन मूंग"],
      activities: [
        { icon: Scissors, task: "कटाई शुरू", desc: "सरसों और चने की कटाई का सही समय।" },
        { icon: Sprout, task: "मूंग की बुवाई", desc: "ग्रीष्मकालीन मूंग की बुवाई की तैयारी करें।" },
        { icon: Info, task: "भंडारण", desc: "अनाज को अच्छी तरह सुखाकर भंडारित करें।" }
      ]
    },
    {
      month: "अप्रैल",
      crops: ["गेहूं", "मूंग", "उड़द"],
      activities: [
        { icon: Scissors, task: "गेहूं कटाई", desc: "गेहूं की गहाई और अनाज साफ़ करना।" },
        { icon: Droplets, task: "मूंग सिंचाई", desc: "भीषण गर्मी में मूंग को 10-12 दिन में पानी दें।" },
        { icon: Info, task: "मिट्टी परीक्षण", desc: "खाली खेतों की मिट्टी की जांच के लिए नमूने लें।" }
      ]
    },
    {
      month: "मई",
      crops: ["मूंग", "सब्जियां"],
      activities: [
        { icon: Scissors, task: "गहरी जुताई", desc: "मिट्टी के स्वास्थ्य और कीटों को मारने के लिए गहरी जुताई करें।" },
        { icon: Info, task: "बीज चयन", desc: "खरीफ फसलों (सोयाबीन, मक्का) के लिए प्रमाणित बीज जुटाएं।" },
        { icon: Sprout, task: "हरी खाद", desc: "खेतों में ढेंचा या सनई की बुवाई करें।" }
      ]
    },
    {
      month: "जून",
      crops: ["सोयाबीन", "मक्का", "उड़द"],
      activities: [
        { icon: Sprout, task: "खरीफ की बुवाई", desc: "पर्याप्त बारिश (4 इंच) के बाद ही बुवाई करें।" },
        { icon: Info, task: "बीज उपचार", desc: "बुवाई से पहले बीज को कवकनाशक से उपचारित करें।" },
        { icon: TrendingUp, task: "बेस डोज़", desc: "बुवाई के समय DAP और सल्फर का उचित उपयोग करें।" }
      ]
    },
    {
      month: "जुलाई",
      crops: ["सोयाबीन", "मक्का", "कपास"],
      activities: [
        { icon: Scissors, task: "निराई-गुड़ाई", desc: "20-25 दिन की फसल होने पर खरपतवार साफ़ करें।" },
        { icon: Info, task: "जल निकासी", desc: "खेत में पानी भरने न दें, निकासी की व्यवस्था करें।" },
        { icon: TrendingUp, task: "पौधा विरलीकरण", desc: "मक्का में पौधों की संख्या सही बनाए रखें।" }
      ]
    },
    {
      month: "अगस्त",
      crops: ["सोयाबीन", "धान", "सब्जियां"],
      activities: [
        { icon: Scissors, task: "कीट प्रबंधन", desc: "सोयाबीन में गर्डल बीटल और सेमीलूपर की जांच करें।" },
        { icon: TrendingUp, task: "यूरिया टॉप ड्रेसिंग", desc: "मक्का और धान में यूरिया की दूसरी मात्रा दें।" },
        { icon: Droplets, task: "रोग नियंत्रण", desc: "बारिश कम होने पर सिंचाई और कवकनाशी का छिड़काव।" }
      ]
    },
    {
      month: "सितम्बर",
      crops: ["सोयाबीन", "मक्का", "सब्जियां"],
      activities: [
        { icon: Info, task: "पकने की अवस्था", desc: "फसल पकते समय नमी बनाए रखें।" },
        { icon: Scissors, task: "रोगों से बचाव", desc: "पीला मोजेक वायरस (YVM) की निगरानी करें।" },
        { icon: Sprout, task: "रबी की तैयारी", desc: "आगामी रबी फसलों (लहसुन, चना) के लिए खेत तैयार करें।" }
      ]
    },
    {
      month: "अक्टूबर",
      crops: ["सोयाबीन", "चना", "लहसुन"],
      activities: [
        { icon: Scissors, task: "खरीफ कटाई", desc: "सोयाबीन और मक्का की कटाई शुरू करें।" },
        { icon: Sprout, task: "रबी बुवाई", desc: "चना और सरसों की बुवाई के लिए उचित समय।" },
        { icon: Info, task: "नमी संरक्षण", desc: "खेत की जुताई कर पाटा लगाएं ताकि नमी बनी रहे।" }
      ]
    },
    {
      month: "नवम्बर",
      crops: ["गेहूं", "चना", "मटर"],
      activities: [
        { icon: Sprout, task: "गेहूं की बुवाई", desc: "15-25 नवम्बर गेहूं बुवाई का सबसे अच्छा समय है।" },
        { icon: Droplets, task: "चना सिंचाई", desc: "चिले में फूल आने से पहले पहली सिंचाई करें।" },
        { icon: TrendingUp, task: "खाद प्रबंधन", desc: "बुवाई के समय उचित उर्वरकों का संतुलित प्रयोग।" }
      ]
    },
    {
      month: "दिसम्बर",
      crops: ["गेहूं", "चना", "लहसुन"],
      activities: [
        { icon: Droplets, task: "गेहूं सिंचाई", desc: "मुकुट जड़ निकलने की अवस्था पर सिंचाई करें।" },
        { icon: Scissors, task: "खरपतवार प्रबंधन", desc: "रबी की फसलों में हाथ से निराई या दवा का प्रयोग।" },
        { icon: Info, task: "कीट निगरानी", desc: "चिले में फली छेदक कीट पर नज़र रखें।" }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">फसल कैलेंडर</h2>
      </div>

      {/* Month Selector */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-none">
        <div className="flex gap-2">
          {months.map((month, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMonth(idx)}
              className={`whitespace-nowrap px-6 py-2 rounded-full text-xs font-bold transition-all ${
                selectedMonth === idx 
                ? 'bg-[#2D5A27] text-white shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMonth}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#2D5A27] flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              {months[selectedMonth]} महीने की मुख्य फसलें
            </h3>
            <div className="flex flex-wrap gap-2">
              {calendarData[selectedMonth].crops.map((crop, i) => (
                <span key={i} className="bg-green-50 text-[#2D5A27] px-4 py-1.5 rounded-xl text-xs font-bold border border-green-100">
                  {crop}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#F5F2ED] rounded-3xl p-1 border border-gray-200">
            {calendarData[selectedMonth].activities.map((activity, i) => (
              <div key={i} className="bg-white m-2 rounded-2xl p-4 shadow-sm border border-gray-50 flex items-start gap-4">
                <div className="bg-green-50 p-3 rounded-2xl text-[#2D5A27] shrink-0">
                  <activity.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{activity.task}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{activity.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 flex gap-4">
        <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
        <div>
          <p className="text-sm font-bold text-blue-900">विशेष सुझाव</p>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            मौसम की परिस्थितियों के अनुसार कृषि कार्यों में थोड़ा बदलाव हो सकता है। अधिक जानकारी के लिए मंडी भाव या मौसम विभाग की सलाह भी देखें।
          </p>
        </div>
      </div>
    </div>
  );
};

export default CropCalendar;
