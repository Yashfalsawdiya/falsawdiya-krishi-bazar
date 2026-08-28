import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  DynamicDeliveryConfig, 
  VehicleConfig, 
  WeightSlab, 
  DistanceSlab, 
  VehicleTypeId 
} from '../types';
import { 
  calculateDynamicDeliveryCharge, 
  findWeightSlabAndVehicle, 
  findDistanceSlab 
} from '../utils/deliveryCalculator';
import { 
  Truck, Save, RefreshCw, Plus, Trash2, Edit3, 
  Check, AlertCircle, MapPin, Scale, Navigation, 
  Sliders, Info, Sparkles, CheckCircle2, ShieldCheck,
  ChevronRight, ArrowRight, Gauge, IndianRupee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AdminDeliveryManager: React.FC = () => {
  const { deliveryConfig, updateDeliveryConfig, resetDeliveryConfig } = useAppContext();

  // Local draft state for editing
  const [config, setConfig] = useState<DynamicDeliveryConfig>(() => ({
    ...deliveryConfig,
    storeOrigin: { ...deliveryConfig.storeOrigin },
    vehicles: [...(deliveryConfig.vehicles || [])],
    weightSlabs: [...(deliveryConfig.weightSlabs || [])],
    distanceSlabs: [...(deliveryConfig.distanceSlabs || [])],
    rateMatrix: { ...(deliveryConfig.rateMatrix || {}) },
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'matrix' | 'slabs' | 'vehicles' | 'store' | 'simulator'>('matrix');

  // Simulator state
  const [simWeight, setSimWeight] = useState<number>(25);
  const [simDistance, setSimDistance] = useState<number>(12);
  const [simCartTotal, setSimCartTotal] = useState<number>(1500);

  // Modal states for editing slabs/vehicles
  const [editingWeightSlab, setEditingWeightSlab] = useState<WeightSlab | null>(null);
  const [editingDistanceSlab, setEditingDistanceSlab] = useState<DistanceSlab | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<VehicleConfig | null>(null);

  // Sync state if context changes externally
  React.useEffect(() => {
    setConfig({
      ...deliveryConfig,
      storeOrigin: { ...deliveryConfig.storeOrigin },
      vehicles: [...(deliveryConfig.vehicles || [])],
      weightSlabs: [...(deliveryConfig.weightSlabs || [])],
      distanceSlabs: [...(deliveryConfig.distanceSlabs || [])],
      rateMatrix: { ...(deliveryConfig.rateMatrix || {}) },
    });
  }, [deliveryConfig]);

  // Live simulation quote
  const simQuote = useMemo(() => {
    return calculateDynamicDeliveryCharge(simWeight, simDistance, simCartTotal, config);
  }, [simWeight, simDistance, simCartTotal, config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateDeliveryConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Save delivery config failed:", err);
      alert("सेटिंग्स सेव करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm("क्या आप डिलीवरी सेटिंग्स को डिफ़ॉल्ट (Default System) पर रीसेट करना चाहते हैं?")) {
      setIsSaving(true);
      try {
        await resetDeliveryConfig();
        alert("डिलीवरी सेटिंग्स सफलतापूर्वक डिफ़ॉल्ट पर रीसेट कर दी गई हैं।");
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Matrix rate change handler
  const handleMatrixRateChange = (vehicleId: string, distanceSlabId: string, value: number) => {
    const key = `${vehicleId}_${distanceSlabId}`;
    setConfig(prev => ({
      ...prev,
      rateMatrix: {
        ...prev.rateMatrix,
        [key]: Math.max(0, value || 0),
      }
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#2D5A27] shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#4A3728]">
              डायनामिक डिलीवरी चार्ज सिस्टम
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              वजन (Weight) + दूरी (Distance) + वाहन (Vehicle) आधारित स्मार्ट डिलीवरी शुल्क
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> डिफ़ॉल्ट रीसेट
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#2D5A27] text-white hover:bg-[#23461e] shadow-md shadow-emerald-900/10 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> सेव हो रहा है...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> सेव हो गया!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> सेटिंग्स सुरक्षित करें (Save)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Global Master Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Toggle 1: Dynamic Calculation Active */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-black text-gray-800 block">
              डायनामिक कैलकुलेटर सक्षम
            </span>
            <span className="text-[11px] text-gray-500 block">
              वजन व दूरी के अनुसार ऑटोमैटिक चार्ज
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.isEnabled ? "bg-[#2D5A27]" : "bg-gray-300"
            }`}
          >
            <span 
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                config.isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Store Delivery Service Active */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-black text-gray-800 block">
              होम डिलीवरी सेवा चालू
            </span>
            <span className="text-[11px] text-gray-500 block">
              ग्राहकों के लिए डिलीवरी विकल्प उपलब्ध
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, isDeliveryActive: !prev.isDeliveryActive }))}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.isDeliveryActive ? "bg-[#2D5A27]" : "bg-gray-300"
            }`}
          >
            <span 
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                config.isDeliveryActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle 3: Free Delivery Threshold */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-black text-gray-800 block">
              मुफ्त डिलीवरी नियम (Free Delivery)
            </span>
            <span className="text-[11px] text-gray-500 block">
              न्यूनतम ऑर्डर राशि पर मुफ्त सुविधा
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, enableFreeDelivery: !prev.enableFreeDelivery }))}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.enableFreeDelivery ? "bg-[#2D5A27]" : "bg-gray-300"
            }`}
          >
            <span 
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                config.enableFreeDelivery ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Free Delivery Threshold input & Fallback Fixed charge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.enableFreeDelivery && (
          <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-950 block">मुफ्त डिलीवरी के लिए न्यूनतम ऑर्डर मूल्य (₹)</span>
              <span className="text-[11px] text-emerald-800 font-medium block">इस राशि या उससे अधिक के कार्ट पर डिलीवरी ₹0 रहेगी</span>
            </div>
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                value={config.freeDeliveryThreshold || ''}
                onChange={e => setConfig(prev => ({ ...prev, freeDeliveryThreshold: Math.max(0, parseInt(e.target.value) || 0) }))}
                placeholder="जैसे: 5000"
                className="w-full bg-white border border-emerald-200 rounded-xl py-2 pl-7 pr-3 font-black text-sm text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-gray-800 block">फ़ॉलबैक फिक्स डिलीवरी चार्ज (₹)</span>
            <span className="text-[11px] text-gray-500 font-medium block">यदि डायनामिक सिस्टम बंद हो तो यह दर लागू होगी</span>
          </div>
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
            <input
              type="number"
              min="0"
              value={config.defaultFixedCharge ?? 40}
              onChange={e => setConfig(prev => ({ ...prev, defaultFixedCharge: Math.max(0, parseInt(e.target.value) || 0) }))}
              placeholder="40"
              className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-7 pr-3 font-black text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('matrix')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'matrix' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" /> रेट मैट्रिक्स (Rate Matrix)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('slabs')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'slabs' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Scale className="w-3.5 h-3.5" /> वजन व दूरी स्लैब्स (Slabs)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('vehicles')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'vehicles' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> वाहन सूची (Vehicles)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('simulator')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'simulator' ? 'bg-amber-500 text-white shadow-sm shadow-amber-100' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" /> लाइव सिम्युलेटर (Live Test)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`flex-1 min-w-[130px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'store' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> स्टोर लोकेशन (Origin)
        </button>
      </div>

      {/* SECTION 1: RATE MATRIX TABLE */}
      {activeSection === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed font-medium">
              <span className="font-bold">रेट मैट्रिक्स कैसे काम करता है:</span> नीचे दी गई तालिका में प्रत्येक वाहन (Vehicle) और दूरी स्लैब (Distance Slab) के अनुसार डिलीवरी शुल्क (₹) दर्ज करें। ग्राहक के कार्ट वजन से वाहन तय होगा और पते से दूरी स्लैब तय होगा।
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase text-gray-500 tracking-wider">
                    <th className="py-3.5 px-4">वाहन (Vehicle)</th>
                    <th className="py-3.5 px-3">उपयुक्त वजन (Weight)</th>
                    {config.distanceSlabs.map(ds => (
                      <th key={ds.id} className="py-3.5 px-3 text-center">
                        <div className="font-black text-gray-800">{ds.label}</div>
                        <div className="text-[9px] text-gray-400 font-normal">
                          {ds.minDistanceKm}-{ds.maxDistanceKm >= 9999 ? '∞' : ds.maxDistanceKm} किमी
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {config.vehicles.map((v) => {
                    const mappedSlab = config.weightSlabs.find(ws => ws.vehicleId === v.id);
                    return (
                      <tr key={v.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{v.icon}</span>
                            <div>
                              <span className="font-black text-gray-800 block">{v.name}</span>
                              <span className="text-[10px] text-gray-400">{v.description}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-[10px]">
                            {mappedSlab 
                              ? `${mappedSlab.minWeightKg}–${mappedSlab.maxWeightKg >= 9999 ? '300+' : mappedSlab.maxWeightKg} kg`
                              : `Max ${v.maxCapacityKg} kg`
                            }
                          </span>
                        </td>

                        {config.distanceSlabs.map(ds => {
                          const matrixKey = `${v.id}_${ds.id}`;
                          const currentRate = config.rateMatrix?.[matrixKey] ?? 0;
                          return (
                            <td key={ds.id} className="py-3 px-2 text-center">
                              <div className="relative inline-block w-24">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentRate}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    handleMatrixRateChange(v.id, ds.id, val);
                                  }}
                                  className="w-full bg-gray-50/80 focus:bg-white border border-gray-200 focus:border-[#2D5A27] rounded-xl py-1.5 pl-6 pr-2 text-center font-black text-xs text-gray-800 outline-none transition-all"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: WEIGHT & DISTANCE SLABS */}
      {activeSection === 'slabs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight Slabs List */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#2D5A27]" /> वजन स्लैब्स (Weight Slabs)
                </h3>
                <p className="text-[11px] text-gray-400">कार्ट के कुल वजन के आधार पर वाहन का निर्धारण</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {config.weightSlabs.map((slab, index) => {
                const assignedVehicle = config.vehicles.find(v => v.id === slab.vehicleId);
                return (
                  <div key={slab.id} className="p-3 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-[10px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-black text-gray-800 text-xs flex items-center gap-2">
                          <span>{slab.minWeightKg} किग्रा से {slab.maxWeightKg >= 9999 ? 'ऊपर (300+)' : `${slab.maxWeightKg} किग्रा`}</span>
                          <span className="text-[10px] text-gray-400 font-normal">→</span>
                          <span className="text-emerald-800 font-bold">{assignedVehicle?.icon} {assignedVehicle?.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block">{slab.label}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={slab.vehicleId}
                        onChange={(e) => {
                          const newVehId = e.target.value;
                          setConfig(prev => ({
                            ...prev,
                            weightSlabs: prev.weightSlabs.map(s => s.id === slab.id ? { ...s, vehicleId: newVehId } : s)
                          }));
                        }}
                        className="bg-white border border-gray-200 rounded-xl px-2 py-1 text-[11px] font-bold text-gray-700 outline-none"
                      >
                        {config.vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.icon} {v.shortName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distance Slabs List */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#2D5A27]" /> दूरी स्लैब्स (Distance Slabs)
                </h3>
                <p className="text-[11px] text-gray-400">स्टोर से ग्राहक के पते की दूरी के आधार पर स्लैब</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {config.distanceSlabs.map((ds, index) => (
                <div key={ds.id} className="p-3 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-[10px] font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-black text-gray-800 text-xs">
                        {ds.label} ({ds.minDistanceKm} से {ds.maxDistanceKm >= 9999 ? 'अधिक' : `${ds.maxDistanceKm} किमी`})
                      </div>
                      <span className="text-[10px] text-gray-400">स्लैब ID: {ds.id}</span>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={ds.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      setConfig(prev => ({
                        ...prev,
                        distanceSlabs: prev.distanceSlabs.map(d => d.id === ds.id ? { ...d, label: newLabel } : d)
                      }));
                    }}
                    className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-800 outline-none w-28 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: VEHICLES LIST */}
      {activeSection === 'vehicles' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <span className="font-bold">क्षेत्रीय वाहन नियम:</span> इस सिस्टम में 🛵 Bike, 🛺 E-Rickshaw, 🛻 Pickup, 🚚 Tempo, एवं 🚛 Truck शामिल हैं। Auto/Rickshaw का विकल्प नहीं रखा गया है क्योंकि स्थानीय क्षेत्र में केवल E-Rickshaw चलता है।
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-emerald-50 rounded-2xl">{vehicle.icon}</span>
                    <div>
                      <h4 className="font-black text-gray-800 text-sm">{vehicle.name}</h4>
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">{vehicle.shortName}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    vehicle.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {vehicle.isActive ? 'सक्रिय' : 'बंद'}
                  </span>
                </div>

                <p className="text-xs text-gray-500 font-medium">{vehicle.description}</p>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold">अधिकतम क्षमता:</span>
                  <span className="font-black text-gray-800">{vehicle.maxCapacityKg} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: INTERACTIVE SIMULATOR */}
      {activeSection === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
            <div>
              <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-500" /> डिलीवरी शुल्क टेस्ट सिम्युलेटर
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">वजन और दूरी बदलकर तुरंत देखें कि क्या वाहन और शुल्क तय होता है</p>
            </div>

            {/* Weight Input Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">ऑर्डर वजन (Total Weight in kg):</span>
                <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl text-sm">{simWeight} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="500"
                step="0.5"
                value={simWeight}
                onChange={e => setSimWeight(parseFloat(e.target.value))}
                className="w-full accent-[#2D5A27] cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[2, 8, 20, 50, 150, 350].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSimWeight(w)}
                    className="px-2 py-0.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                  >
                    {w} kg
                  </button>
                ))}
              </div>
            </div>

            {/* Distance Input Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">डिलीवरी दूरी (Delivery Distance in km):</span>
                <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl text-sm">{simDistance} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={simDistance}
                onChange={e => setSimDistance(parseInt(e.target.value))}
                className="w-full accent-[#2D5A27] cursor-pointer"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[3, 10, 25, 45, 75].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSimDistance(d)}
                    className="px-2 py-0.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50"
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Total for Free Delivery Check */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">कार्ट का कुल मूल्य (Cart Value in ₹):</span>
                <span className="font-black text-gray-800">₹{simCartTotal.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="number"
                min="0"
                value={simCartTotal}
                onChange={e => setSimCartTotal(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none"
              />
            </div>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-7 bg-gradient-to-br from-emerald-900 to-[#1b3d17] text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> लाइव कैलकुलेशन रिजल्ट
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-black text-emerald-200">
                  {simQuote.distanceSlab.label}
                </span>
              </div>

              {/* Vehicle Display Banner */}
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                <span className="text-4xl p-2 bg-white/20 rounded-2xl">{simQuote.vehicle.icon}</span>
                <div>
                  <span className="text-[11px] text-emerald-200 uppercase font-black tracking-wider block">आवश्यक वाहन (Assigned Vehicle)</span>
                  <h4 className="text-lg font-black text-white">{simQuote.vehicle.name}</h4>
                  <p className="text-xs text-emerald-100/80 mt-0.5">{simQuote.vehicle.description}</p>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase block">कुल वजन (Weight)</span>
                  <span className="text-base font-black text-white">{simQuote.totalWeightKg} kg</span>
                  <span className="text-[10px] text-emerald-200/70 block mt-0.5">({simQuote.weightSlab.label})</span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase block">दूरी (Distance)</span>
                  <span className="text-base font-black text-white">{simQuote.distanceKm} km</span>
                  <span className="text-[10px] text-emerald-200/70 block mt-0.5">({simQuote.distanceSlab.label})</span>
                </div>
              </div>
            </div>

            {/* Price Output Banner */}
            <div className="bg-black/20 p-5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-200 font-bold block">अंतिम डिलीवरी शुल्क (Final Charge)</span>
                <span className="text-[11px] text-emerald-300/80 font-medium block mt-0.5">{simQuote.breakdownText}</span>
              </div>
              <div className="text-right">
                {simQuote.isFreeDelivery ? (
                  <div>
                    <span className="text-2xl font-black text-emerald-300">मुफ्त (FREE)</span>
                    <span className="text-[10px] text-emerald-200 block line-through">₹{simQuote.baseCharge}</span>
                  </div>
                ) : (
                  <span className="text-3xl font-black text-white">₹{simQuote.finalDeliveryCharge}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: STORE ORIGIN LOCATION */}
      {activeSection === 'store' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <MapPin className="w-5 h-5 text-[#2D5A27]" />
            <div>
              <h3 className="font-black text-gray-800 text-sm">स्टोर मूल स्थान (Store Origin Location)</h3>
              <p className="text-[11px] text-gray-400">डिलीवरी दूरी की गणना इसी पते/पिनकोड के आधार पर की जाती है</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">स्टोर नाम (Store Name)</label>
              <input
                type="text"
                value={config.storeOrigin.name}
                onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, name: e.target.value } }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">पिनकोड (Pincode)</label>
              <input
                type="text"
                value={config.storeOrigin.pincode}
                onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, pincode: e.target.value } }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">शहर / तहसील (City / Tehsil)</label>
              <input
                type="text"
                value={config.storeOrigin.city}
                onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, city: e.target.value } }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">जिला (District)</label>
              <input
                type="text"
                value={config.storeOrigin.district}
                onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, district: e.target.value } }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">पूरा पता (Full Address)</label>
              <input
                type="text"
                value={config.storeOrigin.address}
                onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, address: e.target.value } }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryManager;
