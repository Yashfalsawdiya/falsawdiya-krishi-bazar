import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, Sprout, TrendingUp, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AgriCalculator: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'fertilizer' | 'seed'>('fertilizer');
  
  // Fertilizer State
  const [area, setArea] = useState<string>('');
  const [unit, setUnit] = useState<'acre' | 'hectare' | 'bigha'>('acre');
  const [cropType, setCropType] = useState<string>('soybean');

  // Seed State
  const [seedArea, setSeedArea] = useState<string>('');
  const [seedUnit, setSeedUnit] = useState<'acre' | 'hectare' | 'bigha'>('acre');
  const [seedCrop, setSeedCrop] = useState<string>('soybean');

  const cropsFertilizer = {
    soybean: { urea: 20, dap: 50, potash: 20, label: 'सोयाबीन' },
    wheat: { urea: 100, dap: 60, potash: 40, label: 'गेहूं' },
    maize: { urea: 90, dap: 50, potash: 30, label: 'मक्का' },
    garlic: { urea: 80, dap: 60, potash: 50, label: 'लहसुन' },
    mustard: { urea: 60, dap: 40, potash: 20, label: 'सरसों' },
  };

  const cropsSeeds = {
    soybean: { rate: 30, label: 'सोयाबीन' },
    wheat: { rate: 45, label: 'गेहूं' },
    maize: { rate: 8, label: 'मक्का' },
    gram: { rate: 35, label: 'चना' },
    mustard: { rate: 2, label: 'सरसों' },
  };

  const calculateFertilizer = () => {
    const val = parseFloat(area) || 0;
    let multiplier = 1;
    if (unit === 'hectare') multiplier = 2.47;
    if (unit === 'bigha') multiplier = 0.4; // Average MP Bigha

    const crop = cropsFertilizer[cropType as keyof typeof cropsFertilizer];
    return {
      urea: (crop.urea * val * multiplier).toFixed(1),
      dap: (crop.dap * val * multiplier).toFixed(1),
      potash: (crop.potash * val * multiplier).toFixed(1),
    };
  };

  const calculateSeed = () => {
    const val = parseFloat(seedArea) || 0;
    let multiplier = 1;
    if (seedUnit === 'hectare') multiplier = 2.47;
    if (seedUnit === 'bigha') multiplier = 0.4;

    const rate = cropsSeeds[seedCrop as keyof typeof cropsSeeds]?.rate || 0;
    return (rate * val * multiplier).toFixed(1);
  };

  const fertResults = calculateFertilizer();
  const seedResult = calculateSeed();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">खेती कैलकुलेटर</h2>
      </div>

      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={() => setActiveTab('fertilizer')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'fertilizer' ? 'bg-[#2D5A27] text-white' : 'text-gray-500'}`}
        >
          खाद कैलकुलेटर
        </button>
        <button 
          onClick={() => setActiveTab('seed')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'seed' ? 'bg-[#2D5A27] text-white' : 'text-gray-500'}`}
        >
          बीज दर
        </button>
      </div>

      {activeTab === 'fertilizer' ? (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">फसल चुनें</label>
              <select 
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-[#2D5A27]"
              >
                {Object.entries(cropsFertilizer).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-600 mb-2">कुल क्षेत्रफल</label>
                <input 
                  type="number" 
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="उदा. 5"
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-[#2D5A27]"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-bold text-gray-600 mb-2">इकाई</label>
                <select 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-[#2D5A27]"
                >
                  <option value="acre">एकड़</option>
                  <option value="bigha">बीघा</option>
                  <option value="hectare">हेक्टेयर</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#2D5A27] rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#EAB308]" />
              जरूरी खाद की मात्रा (लगभग)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-white/70 font-bold uppercase">यूरिया</p>
                <p className="text-xl font-black mt-1">{fertResults.urea}</p>
                <p className="text-[10px]">किलो</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-white/70 font-bold uppercase">DAP</p>
                <p className="text-xl font-black mt-1">{fertResults.dap}</p>
                <p className="text-[10px]">किलो</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-white/70 font-bold uppercase">पोटाश</p>
                <p className="text-xl font-black mt-1">{fertResults.potash}</p>
                <p className="text-[10px]">किलो</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 bg-black/20 p-3 rounded-xl border border-white/10">
              <Info className="w-4 h-4 text-[#EAB308] shrink-0 mt-0.5" />
              <p className="text-[10px] italic">नोट: यह एक औसत गणना है। मिट्टी परीक्षण के आधार पर सटीक मात्रा बदल सकती है।</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2">फसल चुनें</label>
              <select 
                value={seedCrop}
                onChange={(e) => setSeedCrop(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-[#2D5A27]"
              >
                {Object.entries(cropsSeeds).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-600 mb-2">कुल क्षेत्रफल</label>
                <input 
                  type="number" 
                  value={seedArea}
                  onChange={(e) => setSeedArea(e.target.value)}
                  placeholder="उदा. 2"
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-[#2D5A27]"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-bold text-gray-600 mb-2">इकाई</label>
                <select 
                  value={seedUnit}
                  onChange={(e) => setSeedUnit(e.target.value as any)}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-[#2D5A27]"
                >
                  <option value="acre">एकड़</option>
                  <option value="bigha">बीघा</option>
                  <option value="hectare">हेक्टेयर</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#2D5A27] rounded-3xl p-8 text-white shadow-xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider mb-2">कुल बीज की मात्रा</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl font-black">{seedResult}</span>
              <span className="text-xl font-bold uppercase mt-4">किलो</span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold bg-white/30 py-2 px-4 rounded-full inline-flex">
              <Sprout className="w-4 h-4" />
              अच्छी पैदावार के लिए प्रमाणित बीज ही बोएं
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AgriCalculator;
