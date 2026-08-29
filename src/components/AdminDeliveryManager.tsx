import React, { useState, useId } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  DynamicDeliveryConfig, 
  VehicleConfig, 
  WeightSlab, 
  DistanceSlab 
} from '../types';
import { 
  Truck, Save, MapPin, Scale, Navigation, 
  Info, CheckCircle2, IndianRupee, Plus, Trash2, Edit2, 
  AlertCircle, Check, X, Sliders
} from 'lucide-react';

const COMMON_EMOJIS = ['🛵', '🛺', '🛻', '🚚', '🚛', '🚜', '🚐', '📦', '🚲', '🚗'];

const AdminDeliveryManager: React.FC = () => {
  const { deliveryConfig, updateDeliveryConfig } = useAppContext();

  // Local draft state for editing
  const [config, setConfig] = useState<DynamicDeliveryConfig>(() => ({
    ...deliveryConfig,
    storeOrigin: { ...deliveryConfig.storeOrigin },
    vehicles: (deliveryConfig.vehicles || []).map(v => ({ ...v })),
    weightSlabs: (deliveryConfig.weightSlabs || []).map(ws => ({ ...ws })),
    distanceSlabs: (deliveryConfig.distanceSlabs || []).map(ds => ({ ...ds })),
    rateMatrix: { ...(deliveryConfig.rateMatrix || {}) },
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'matrix' | 'store'>('matrix');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Modal / Inline Edit States
  const [editingDistanceSlab, setEditingDistanceSlab] = useState<DistanceSlab | null>(null);
  const [isAddingDistanceSlab, setIsAddingDistanceSlab] = useState(false);
  const [newDistanceSlab, setNewDistanceSlab] = useState<{ minKm: string; maxKm: string; label: string }>({
    minKm: '',
    maxKm: '',
    label: '',
  });

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleConfig | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState<{
    name: string;
    shortName: string;
    icon: string;
    description: string;
    minWeightKg: string;
    maxWeightKg: string;
  }>({
    name: '',
    shortName: '',
    icon: '🚚',
    description: '',
    minWeightKg: '0',
    maxWeightKg: '50',
  });

  // Sync state if context changes externally
  React.useEffect(() => {
    setConfig({
      ...deliveryConfig,
      storeOrigin: { ...deliveryConfig.storeOrigin },
      vehicles: (deliveryConfig.vehicles || []).map(v => ({ ...v })),
      weightSlabs: (deliveryConfig.weightSlabs || []).map(ws => ({ ...ws })),
      distanceSlabs: (deliveryConfig.distanceSlabs || []).map(ds => ({ ...ds })),
      rateMatrix: { ...(deliveryConfig.rateMatrix || {}) },
    });
  }, [deliveryConfig]);

  // Validation function
  const validateConfig = (cfg: DynamicDeliveryConfig): string | null => {
    // 1. Vehicle validation
    if (!cfg.vehicles || cfg.vehicles.length === 0) {
      return 'कम से कम 1 वाहन (Vehicle) होना अनिवार्य है।';
    }

    const activeVehicles = cfg.vehicles.filter(v => v.isActive !== false);
    if (activeVehicles.length === 0) {
      return 'कम से कम 1 वाहन को सक्रिय (Active) रखें ताकि ग्राहक ऑर्डर कर सकें।';
    }

    for (const v of cfg.vehicles) {
      if (!v.name.trim()) {
        return 'सभी वाहनों का नाम (Name) होना अनिवार्य है।';
      }
      if (!v.shortName.trim()) {
        return `वाहन "${v.name}" का संक्षिप्त प्रकार (Short Name) दर्ज करें।`;
      }
    }

    // 2. Weight Slabs validation
    for (const ws of cfg.weightSlabs) {
      if (ws.minWeightKg < 0) {
        return `वजन स्लैब "${ws.label}" का न्यूनतम वजन 0 या उससे अधिक होना चाहिए।`;
      }
      if (ws.maxWeightKg <= ws.minWeightKg) {
        return `वजन स्लैब "${ws.label}" का अधिकतम वजन (${ws.maxWeightKg} kg) न्यूनतम वजन (${ws.minWeightKg} kg) से अधिक होना चाहिए।`;
      }
    }

    // 3. Distance Slabs validation
    if (!cfg.distanceSlabs || cfg.distanceSlabs.length === 0) {
      return 'कम से कम 1 दूरी स्लैब (Distance Slab) होना अनिवार्य है।';
    }

    for (const ds of cfg.distanceSlabs) {
      if (!ds.label.trim()) {
        return 'सभी दूरी स्लैब्स का नाम / लेबल होना अनिवार्य है।';
      }
      if (ds.minDistanceKm < 0) {
        return `दूरी स्लैब "${ds.label}" की न्यूनतम दूरी 0 या उससे अधिक होनी चाहिए।`;
      }
      if (ds.maxDistanceKm <= ds.minDistanceKm) {
        return `दूरी स्लैब "${ds.label}" की अधिकतम दूरी (${ds.maxDistanceKm} km) न्यूनतम दूरी (${ds.minDistanceKm} km) से अधिक होनी चाहिए।`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const error = validateConfig(config);
    if (error) {
      setValidationError(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationError(null);
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

  // ----------------------------------------------------
  // VEHICLE & WEIGHT SLAB ACTIONS
  // ----------------------------------------------------
  const handleToggleVehicleActive = (vehicleId: string) => {
    setConfig(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === vehicleId ? { ...v, isActive: !v.isActive } : v
      ),
    }));
  };

  const handleUpdateVehicleDetails = (
    vehicleId: string, 
    fields: Partial<VehicleConfig>, 
    weightRange?: { minKg: number; maxKg: number }
  ) => {
    setConfig(prev => {
      const updatedVehicles = prev.vehicles.map(v => {
        if (v.id === vehicleId) {
          const maxCap = weightRange ? weightRange.maxKg : (fields.maxCapacityKg ?? v.maxCapacityKg);
          return { ...v, ...fields, maxCapacityKg: maxCap };
        }
        return v;
      });

      let updatedWeightSlabs = prev.weightSlabs.map(ws => {
        if (ws.vehicleId === vehicleId && weightRange) {
          const isMaxInfinite = weightRange.maxKg >= 9999;
          const label = `${weightRange.minKg}–${isMaxInfinite ? '300+' : weightRange.maxKg} किग्रा (${fields.shortName || ws.label})`;
          return {
            ...ws,
            minWeightKg: weightRange.minKg,
            maxWeightKg: weightRange.maxKg,
            label,
          };
        }
        return ws;
      });

      return {
        ...prev,
        vehicles: updatedVehicles,
        weightSlabs: updatedWeightSlabs,
      };
    });
  };

  const handleAddNewVehicle = () => {
    const name = newVehicle.name.trim();
    const shortName = newVehicle.shortName.trim() || name.split(' ')[0] || 'Vehicle';
    const minKg = parseFloat(newVehicle.minWeightKg) || 0;
    const maxKg = parseFloat(newVehicle.maxWeightKg) || 50;

    if (!name) {
      alert('कृपया वाहन का नाम दर्ज करें।');
      return;
    }
    if (maxKg <= minKg) {
      alert('अधिकतम वजन (Max Weight) न्यूनतम वजन से अधिक होना चाहिए।');
      return;
    }

    const newVehId = `veh_${Date.now()}`;
    const newWsId = `ws_${Date.now()}`;

    const newVehObj: VehicleConfig = {
      id: newVehId,
      name,
      shortName,
      icon: newVehicle.icon || '🚚',
      description: newVehicle.description.trim() || `${minKg} से ${maxKg} किग्रा ऑर्डर डिलीवरी`,
      maxCapacityKg: maxKg,
      isActive: true,
      order: config.vehicles.length + 1,
    };

    const newWsObj: WeightSlab = {
      id: newWsId,
      minWeightKg: minKg,
      maxWeightKg: maxKg,
      vehicleId: newVehId,
      label: `${minKg}–${maxKg >= 9999 ? '300+' : maxKg} किग्रा (${shortName})`,
    };

    // Initialize rates for this vehicle across all distance slabs
    const newRates: Record<string, number> = {};
    config.distanceSlabs.forEach((ds, idx) => {
      newRates[`${newVehId}_${ds.id}`] = (idx + 1) * 50;
    });

    setConfig(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, newVehObj],
      weightSlabs: [...prev.weightSlabs, newWsObj],
      rateMatrix: { ...prev.rateMatrix, ...newRates },
    }));

    setIsAddingVehicle(false);
    setNewVehicle({
      name: '',
      shortName: '',
      icon: '🚚',
      description: '',
      minWeightKg: '0',
      maxWeightKg: '50',
    });
  };

  const promptDeleteVehicle = (vehicle: VehicleConfig) => {
    const activeCount = config.vehicles.filter(v => v.isActive !== false).length;
    if (config.vehicles.length <= 1) {
      alert('कम से कम 1 वाहन होना आवश्यक है। इसे हटाया नहीं जा सकता।');
      return;
    }
    if (vehicle.isActive !== false && activeCount <= 1) {
      alert('कम से कम 1 सक्रिय (Active) वाहन होना आवश्यक है ताकि ग्राहक ऑर्डर कर सकें।');
      return;
    }
    setVehicleToDelete(vehicle);
  };

  const confirmDeleteVehicle = () => {
    if (!vehicleToDelete) return;
    const vehicleId = vehicleToDelete.id;

    setConfig(prev => {
      const updatedVehicles = prev.vehicles.filter(v => v.id !== vehicleId);
      const updatedWeightSlabs = prev.weightSlabs.filter(ws => ws.vehicleId !== vehicleId);
      const updatedRateMatrix = { ...prev.rateMatrix };

      // Delete rate matrix entries for this vehicle
      Object.keys(updatedRateMatrix).forEach(key => {
        if (key.startsWith(`${vehicleId}_`)) {
          delete updatedRateMatrix[key];
        }
      });

      return {
        ...prev,
        vehicles: updatedVehicles,
        weightSlabs: updatedWeightSlabs,
        rateMatrix: updatedRateMatrix,
      };
    });

    setVehicleToDelete(null);
  };

  // ----------------------------------------------------
  // DISTANCE SLAB ACTIONS
  // ----------------------------------------------------
  const handleAddNewDistanceSlab = () => {
    const minKm = parseFloat(newDistanceSlab.minKm);
    const maxKm = parseFloat(newDistanceSlab.maxKm);
    const label = newDistanceSlab.label.trim();

    if (isNaN(minKm) || minKm < 0) {
      alert('कृपया वैध न्यूनतम दूरी (Min Distance km) दर्ज करें।');
      return;
    }
    if (isNaN(maxKm) || maxKm <= minKm) {
      alert('अधिकतम दूरी (Max Distance km) न्यूनतम दूरी से अधिक होनी चाहिए।');
      return;
    }
    if (!label) {
      alert('कृपया दूरी स्लैब का लेबल (जैसे: 25–40 किमी) दर्ज करें।');
      return;
    }

    const newDsId = `ds_${Date.now()}`;
    const newDsObj: DistanceSlab = {
      id: newDsId,
      minDistanceKm: minKm,
      maxDistanceKm: maxKm,
      label,
    };

    // Initialize rates for all vehicles for this new distance slab
    const newRates: Record<string, number> = {};
    config.vehicles.forEach(v => {
      // Find average or previous rate of this vehicle as reasonable starting default
      const prevRates = config.distanceSlabs.map(ds => config.rateMatrix?.[`${v.id}_${ds.id}`] || 0);
      const lastRate = prevRates.length > 0 ? prevRates[prevRates.length - 1] : 50;
      newRates[`${v.id}_${newDsId}`] = Math.round(lastRate * 1.3);
    });

    setConfig(prev => {
      const updatedDistanceSlabs = [...prev.distanceSlabs, newDsObj].sort((a, b) => a.minDistanceKm - b.minDistanceKm);
      return {
        ...prev,
        distanceSlabs: updatedDistanceSlabs,
        rateMatrix: { ...prev.rateMatrix, ...newRates },
      };
    });

    setIsAddingDistanceSlab(false);
    setNewDistanceSlab({ minKm: '', maxKm: '', label: '' });
  };

  const handleUpdateDistanceSlab = (dsId: string, minKm: number, maxKm: number, label: string) => {
    if (maxKm <= minKm) {
      alert('अधिकतम दूरी न्यूनतम दूरी से अधिक होनी चाहिए।');
      return;
    }
    if (!label.trim()) {
      alert('दूरी स्लैब का लेबल खाली नहीं हो सकता।');
      return;
    }

    setConfig(prev => ({
      ...prev,
      distanceSlabs: prev.distanceSlabs.map(ds => 
        ds.id === dsId 
          ? { ...ds, minDistanceKm: minKm, maxDistanceKm: maxKm, label: label.trim() } 
          : ds
      ).sort((a, b) => a.minDistanceKm - b.minDistanceKm),
    }));

    setEditingDistanceSlab(null);
  };

  const handleDeleteDistanceSlab = (dsId: string) => {
    if (config.distanceSlabs.length <= 1) {
      alert('कम से कम 1 दूरी स्लैब होना आवश्यक है। इसे हटाया नहीं जा सकता।');
      return;
    }

    if (!confirm('क्या आप इस दूरी स्लैब (Distance Column) को हटाना चाहते हैं?')) {
      return;
    }

    setConfig(prev => {
      const updatedDistanceSlabs = prev.distanceSlabs.filter(ds => ds.id !== dsId);
      const updatedRateMatrix = { ...prev.rateMatrix };

      // Clean up rate matrix keys
      Object.keys(updatedRateMatrix).forEach(key => {
        if (key.endsWith(`_${dsId}`)) {
          delete updatedRateMatrix[key];
        }
      });

      return {
        ...prev,
        distanceSlabs: updatedDistanceSlabs,
        rateMatrix: updatedRateMatrix,
      };
    });
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
              वाहन (Vehicle) + वजन (Weight) + दूरी (Distance) + ₹ डिलीवरी चार्ज पूर्णतः संपादन योग्य
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#2D5A27] text-white hover:bg-[#23461e] shadow-md shadow-emerald-900/10 text-xs font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> सेव हो रहा है...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> सेटिंग्स सुरक्षित हो गईं!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> सेटिंग्स सुरक्षित करें (Save)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-black text-red-900">कृपया निम्नलिखित त्रुटि ठीक करें:</p>
            <p className="text-xs text-red-700 font-medium">{validationError}</p>
          </div>
        </div>
      )}

      {/* Global Master Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle 1: Dynamic Calculation Active */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-black text-gray-800 block">
              डायनामिक कैलकुलेटर सक्षम
            </span>
            <span className="text-[11px] text-gray-500 block">
              वजन व दूरी के अनुसार ऑटोमैटिक वाहन व चार्ज चयन
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

        {/* Toggle 2: Store Delivery Service Active (Master Control) */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-800 block">
                होम डिलीवरी सेवा चालू
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                config.isDeliveryActive 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {config.isDeliveryActive ? "● सेवा सक्रिय (Active)" : "○ सेवा बंद (Disabled)"}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 block">
              चेकआउट और डिलीवरी ऑर्डर के लिए मास्टर कंट्रोल (Master Switch)
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const nextVal = !config.isDeliveryActive;
              const updated = { ...config, isDeliveryActive: nextVal };
              setConfig(updated);
              try {
                await updateDeliveryConfig(updated);
              } catch (e) {
                console.error("Failed to auto-save master delivery switch:", e);
              }
            }}
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
      </div>

      {/* Free Delivery & Fallback Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free Delivery Threshold */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black text-gray-800 block">मुफ़्त डिलीवरी (Free Delivery)</span>
            <span className="text-[11px] text-gray-500 font-medium block">
              {config.enableFreeDelivery ? `₹${config.freeDeliveryThreshold} से ऊपर के ऑर्डर पर फ्री डिलीवरी` : 'वर्तमान में बंद है'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, enableFreeDelivery: !prev.enableFreeDelivery }))}
              className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all ${
                config.enableFreeDelivery ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {config.enableFreeDelivery ? 'सक्षम (ON)' : 'अक्षम (OFF)'}
            </button>
            {config.enableFreeDelivery && (
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.freeDeliveryThreshold ?? 0}
                  onChange={e => setConfig(prev => ({ ...prev, freeDeliveryThreshold: Math.max(0, parseInt(e.target.value) || 0) }))}
                  placeholder="Min Amount"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-1.5 pl-6 pr-2 font-black text-xs text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Fallback Fixed Charge */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black text-gray-800 block">फ़ॉलबैक फिक्स डिलीवरी चार्ज</span>
            <span className="text-[11px] text-gray-500 font-medium block">यदि डायनामिक सिस्टम बंद हो तो यह दर लागू होगी</span>
          </div>
          <div className="relative w-28">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
            <input
              type="number"
              min="0"
              value={config.defaultFixedCharge ?? 40}
              onChange={e => setConfig(prev => ({ ...prev, defaultFixedCharge: Math.max(0, parseInt(e.target.value) || 0) }))}
              placeholder="40"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-1.5 pl-7 pr-3 font-black text-xs text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
            />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('matrix')}
          className={`flex-1 min-w-[160px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'matrix' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" /> रेट मैट्रिक्स (Rate Matrix)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`flex-1 min-w-[160px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeSection === 'store' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> स्टोर लोकेशन (Origin)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: DYNAMIC EDITABLE RATE MATRIX TABLE */}
      {/* ========================================================================= */}
      {activeSection === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 leading-relaxed font-medium">
                <span className="font-bold">रेट मैट्रिक्स (Rate Matrix):</span> प्रत्येक वाहन, वजन सीमा और दूरी स्लैब के सामने ₹ डिलीवरी शुल्क दर्ज करें। आप कॉलम हेडर से दूरी और रो (Row) से वाहन व वजन सीधे एडिट कर सकते हैं।
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingDistanceSlab(true)}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 text-[#2D5A27] border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> + नई दूरी रेंज (Distance)
              </button>
              <button
                type="button"
                onClick={() => setIsAddingVehicle(true)}
                className="px-3 py-1.5 bg-[#2D5A27] text-white hover:bg-[#23461e] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> + नया वाहन (Vehicle)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200/80 text-[11px] font-black uppercase text-gray-600 tracking-wider">
                    <th className="py-4 px-4 w-[280px]">वाहन (Vehicle) & स्थिति</th>
                    <th className="py-4 px-3 w-[150px]">वजन सीमा (Weight Range)</th>
                    {config.distanceSlabs.map((ds, index) => (
                      <th key={ds.id} className="py-3.5 px-3 text-center min-w-[120px] bg-gray-50/50 border-l border-gray-100 group relative">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-gray-800 text-xs">{ds.label}</span>
                          <button
                            type="button"
                            title="दूरी स्लैब एडिट करें"
                            onClick={() => setEditingDistanceSlab(ds)}
                            className="p-1 text-gray-400 hover:text-[#2D5A27] hover:bg-white rounded-md transition-all opacity-70 hover:opacity-100"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {config.distanceSlabs.length > 1 && (
                            <button
                              type="button"
                              title="दूरी स्लैब हटाएं"
                              onClick={() => handleDeleteDistanceSlab(ds.id)}
                              className="p-1 text-gray-300 hover:text-red-600 hover:bg-white rounded-md transition-all opacity-70 hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {ds.minDistanceKm}–{ds.maxDistanceKm >= 9999 ? '∞' : ds.maxDistanceKm} km
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {config.vehicles.map((v) => {
                    const mappedSlab = config.weightSlabs.find(ws => ws.vehicleId === v.id);
                    const isInactive = v.isActive === false;

                    return (
                      <tr 
                        key={v.id} 
                        className={`transition-colors ${isInactive ? 'bg-gray-50/80 opacity-60' : 'hover:bg-emerald-50/20'}`}
                      >
                        {/* Column 1: Vehicle Name, Icon & Active Toggle */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl select-none">{v.icon || '🚚'}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-800 text-xs block">{v.name}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                    {v.shortName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 block max-w-[180px] truncate">{v.description}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="वाहन विवरण एडिट करें"
                                onClick={() => setEditingVehicleId(v.id)}
                                className="p-1.5 text-gray-400 hover:text-[#2D5A27] hover:bg-white rounded-lg transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="वाहन हटाएं"
                                onClick={() => promptDeleteVehicle(v)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title={v.isActive ? 'सक्रिय (क्लिक करके निष्क्रिय करें)' : 'निष्क्रिय (क्लिक करके सक्रिय करें)'}
                                onClick={() => handleToggleVehicleActive(v.id)}
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-all ${
                                  v.isActive 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-red-50 text-red-600 border border-red-200'
                                }`}
                              >
                                {v.isActive ? 'Active' : 'OFF'}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Editable Weight Range for this vehicle */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-xl">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={mappedSlab ? mappedSlab.minWeightKg : 0}
                                onChange={(e) => {
                                  const minVal = parseFloat(e.target.value) || 0;
                                  const maxVal = mappedSlab ? mappedSlab.maxWeightKg : 10;
                                  handleUpdateVehicleDetails(v.id, {}, { minKg: minVal, maxKg: maxVal });
                                }}
                                className="w-11 bg-transparent text-center font-black text-xs text-gray-800 outline-none"
                              />
                              <span className="text-gray-400 font-bold text-[10px]">–</span>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={mappedSlab ? (mappedSlab.maxWeightKg >= 9999 ? 9999 : mappedSlab.maxWeightKg) : 10}
                                onChange={(e) => {
                                  const maxVal = parseFloat(e.target.value) || 10;
                                  const minVal = mappedSlab ? mappedSlab.minWeightKg : 0;
                                  handleUpdateVehicleDetails(v.id, {}, { minKg: minVal, maxKg: maxVal });
                                }}
                                className="w-12 bg-transparent text-center font-black text-xs text-gray-800 outline-none"
                              />
                              <span className="text-gray-400 font-semibold text-[10px]">kg</span>
                            </div>
                          </div>
                        </td>

                        {/* Column 3...N: Editable Delivery Rate for Each Distance Slab */}
                        {config.distanceSlabs.map(ds => {
                          const matrixKey = `${v.id}_${ds.id}`;
                          const currentRate = config.rateMatrix?.[matrixKey] ?? 0;
                          return (
                            <td key={ds.id} className="py-3 px-2 text-center align-middle border-l border-gray-100">
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
                                  disabled={isInactive}
                                  className="w-full bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#2D5A27] rounded-xl py-1.5 pl-6 pr-2 text-center font-black text-xs text-gray-800 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
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

      {/* ========================================================================= */}
      {/* SECTION 2: STORE ORIGIN LOCATION */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW DISTANCE SLAB */}
      {/* ========================================================================= */}
      {isAddingDistanceSlab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#2D5A27]" /> + नई दूरी रेंज जोड़ें (Add Distance Slab)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingDistanceSlab(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">लेबल का नाम (जैसे: 25–40 किमी)</label>
                <input
                  type="text"
                  placeholder="e.g. 25–40 किमी"
                  value={newDistanceSlab.label}
                  onChange={e => setNewDistanceSlab(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">न्यूनतम दूरी (Min km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="25.001"
                    value={newDistanceSlab.minKm}
                    onChange={e => setNewDistanceSlab(prev => ({ ...prev, minKm: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">अधिकतम दूरी (Max km)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.001"
                    placeholder="40"
                    value={newDistanceSlab.maxKm}
                    onChange={e => setNewDistanceSlab(prev => ({ ...prev, maxKm: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingDistanceSlab(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleAddNewDistanceSlab}
                className="flex-1 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all"
              >
                स्लैब जोड़ें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT DISTANCE SLAB MODAL */}
      {/* ========================================================================= */}
      {editingDistanceSlab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#2D5A27]" /> दूरी स्लैब संपादित करें (Edit Distance Slab)
              </h3>
              <button
                type="button"
                onClick={() => setEditingDistanceSlab(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">लेबल (Label)</label>
                <input
                  type="text"
                  value={editingDistanceSlab.label}
                  onChange={e => setEditingDistanceSlab({ ...editingDistanceSlab, label: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">न्यूनतम दूरी (Min km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={editingDistanceSlab.minDistanceKm}
                    onChange={e => setEditingDistanceSlab({ ...editingDistanceSlab, minDistanceKm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">अधिकतम दूरी (Max km)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.001"
                    value={editingDistanceSlab.maxDistanceKm >= 9999 ? 9999 : editingDistanceSlab.maxDistanceKm}
                    onChange={e => setEditingDistanceSlab({ ...editingDistanceSlab, maxDistanceKm: parseFloat(e.target.value) || 9999 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDistanceSlab(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={() => handleUpdateDistanceSlab(
                  editingDistanceSlab.id,
                  editingDistanceSlab.minDistanceKm,
                  editingDistanceSlab.maxDistanceKm,
                  editingDistanceSlab.label
                )}
                className="flex-1 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all"
              >
                सुरक्षित करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW VEHICLE */}
      {/* ========================================================================= */}
      {isAddingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#2D5A27]" /> + नया वाहन जोड़ें (Add New Vehicle)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingVehicle(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">वाहन का नाम (e.g. ट्रैक्टर / ट्रॉली)</label>
                  <input
                    type="text"
                    placeholder="e.g. ट्रैक्टर / ट्रॉली"
                    value={newVehicle.name}
                    onChange={e => setNewVehicle(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">संक्षिप्त प्रकार (Short Name)</label>
                  <input
                    type="text"
                    placeholder="e.g. Tractor"
                    value={newVehicle.shortName}
                    onChange={e => setNewVehicle(prev => ({ ...prev, shortName: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">न्यूनतम वजन (Min Weight kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={newVehicle.minWeightKg}
                    onChange={e => setNewVehicle(prev => ({ ...prev, minWeightKg: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">अधिकतम वजन (Max Weight kg)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="100"
                    value={newVehicle.maxWeightKg}
                    onChange={e => setNewVehicle(prev => ({ ...prev, maxWeightKg: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">विवरण (Description)</label>
                <input
                  type="text"
                  placeholder="e.g. मध्यम व भारी कृषि उपकरण व बीज"
                  value={newVehicle.description}
                  onChange={e => setNewVehicle(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              {/* Emoji selector */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-gray-700">वाहन आइकन चुनें</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewVehicle(prev => ({ ...prev, icon: emoji }))}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl border transition-all ${
                        newVehicle.icon === emoji 
                          ? 'bg-emerald-50 border-[#2D5A27] shadow-xs scale-105' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsAddingVehicle(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleAddNewVehicle}
                className="flex-1 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all"
              >
                वाहन जोड़ें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT VEHICLE QUICK DETAILS MODAL */}
      {/* ========================================================================= */}
      {editingVehicleId && (() => {
        const v = config.vehicles.find(item => item.id === editingVehicleId);
        if (!v) return null;
        const mappedSlab = config.weightSlabs.find(ws => ws.vehicleId === v.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                  <span className="text-xl">{v.icon}</span> वाहन विवरण संपादित करें (Edit Vehicle)
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingVehicleId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">वाहन का नाम (Name)</label>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => handleUpdateVehicleDetails(v.id, { name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">संक्षिप्त प्रकार (Short Name)</label>
                    <input
                      type="text"
                      value={v.shortName}
                      onChange={(e) => handleUpdateVehicleDetails(v.id, { shortName: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">न्यूनतम वजन (Min Weight kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={mappedSlab?.minWeightKg ?? 0}
                      onChange={(e) => {
                        const minVal = parseFloat(e.target.value) || 0;
                        const maxVal = mappedSlab?.maxWeightKg ?? 10;
                        handleUpdateVehicleDetails(v.id, {}, { minKg: minVal, maxKg: maxVal });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">अधिकतम वजन (Max Weight kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={mappedSlab ? (mappedSlab.maxWeightKg >= 9999 ? 9999 : mappedSlab.maxWeightKg) : 10}
                      onChange={(e) => {
                        const maxVal = parseFloat(e.target.value) || 10;
                        const minVal = mappedSlab?.minWeightKg ?? 0;
                        handleUpdateVehicleDetails(v.id, {}, { minKg: minVal, maxKg: maxVal });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">विवरण (Description)</label>
                  <input
                    type="text"
                    value={v.description}
                    onChange={(e) => handleUpdateVehicleDetails(v.id, { description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <span className="font-bold text-gray-700">वाहन स्थिति (Active Status)</span>
                  <button
                    type="button"
                    onClick={() => handleToggleVehicleActive(v.id)}
                    className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all ${
                      v.isActive 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}
                  >
                    {v.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                  </button>
                </div>

                {/* Emoji selector */}
                <div className="space-y-1 pt-1">
                  <label className="font-bold text-gray-700">आइकन बदलें</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleUpdateVehicleDetails(v.id, { icon: emoji })}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl border transition-all ${
                          v.icon === emoji 
                            ? 'bg-emerald-50 border-[#2D5A27] shadow-xs scale-105' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVehicleId(null)}
                  className="w-full py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all"
                >
                  पूर्ण (Done)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* VEHICLE DELETE CONFIRMATION POPUP MODAL */}
      {/* ========================================================================= */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto text-2xl">
              🗑️
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-gray-800">
                क्या आप इस वाहन को हटाना चाहते हैं?
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-700">
                <span className="text-base">{vehicleToDelete.icon || '🚚'}</span>
                <span>{vehicleToDelete.name}</span>
                <span className="text-[10px] text-gray-500 font-bold">({vehicleToDelete.shortName})</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed pt-1">
                यह वाहन Delivery Rate Matrix से हट जाएगा और भविष्य की delivery calculation में इसका उपयोग नहीं होगा। इसके सभी संबंधित Weight Range व Delivery Rates भी हट जाएँगे।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={confirmDeleteVehicle}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> हटाएँ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryManager;
