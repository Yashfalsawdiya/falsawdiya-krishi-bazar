import React from 'react';
import { motion } from 'motion/react';
import { TestTube2, CheckCircle2, MapPin, Phone, Info, AlertCircle } from 'lucide-react';

const SoilTesting: React.FC = () => {
  const steps = [
    { title: "मिट्टी का नमूना लें", desc: "खेत के अलग-अलग हिस्सों से 6-9 इंच गहरी मिट्टी इकट्ठा करें।" },
    { title: "नमूना सुखाएं", desc: "मिट्टी को छाया में सुखाएं और कंकड़-पत्थर हटा दें।" },
    { title: "लैब में जमा करें", desc: "निकटतम सरकारी कृषि केंद्र या मिट्टी परीक्षण लैब में भेजें।" },
    { title: "रिपोर्ट प्राप्त करें", desc: "रिपोर्ट के आधार पर खाद और उर्वरकों का सही उपयोग करें।" }
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728] flex items-center justify-center gap-2">
          <TestTube2 className="w-6 h-6 text-[#2D5A27]" />
          मिट्टी परीक्षण (Soil Testing)
        </h2>
        <p className="text-sm text-gray-500">खेत की सेहत, फसल की बरकत</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        <section className="space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#2D5A27]" />
            परीक्षण क्यों ज़रूरी है?
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              "मिट्टी की उर्वरता शक्ति का पता चलता है।",
              "खाद के अनावश्यक खर्च में कमी आती है।",
              "फसल की पैदावार 20-30% तक बढ़ सकती है।",
              "मिट्टी में पोषक तत्वों की कमी का पता चलता है।"
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#2D5A27]/5 p-3 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A27] mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#EAB308]" />
            परीक्षण की प्रक्रिया
          </h3>
          <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {steps.map((step, i) => (
              <div key={i} className="relative pl-10">
                <div className="absolute left-0 top-0 w-8 h-8 bg-white border-2 border-[#2D5A27] rounded-full flex items-center justify-center font-bold text-[#2D5A27] text-sm z-10">
                  {i + 1}
                </div>
                <h4 className="font-bold text-gray-800 text-sm">{step.title}</h4>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-4">
          <button className="w-full py-4 bg-[#2D5A27] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#2D5A27]/20 active:scale-95 transition-transform">
            <MapPin className="w-5 h-5" /> निकटतम लैब खोजें
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoilTesting;
