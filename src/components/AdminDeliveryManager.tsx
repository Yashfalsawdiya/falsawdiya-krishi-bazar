import React, { useState, useId } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  DynamicDeliveryConfig, 
  VehicleConfig, 
  WeightSlab, 
  DistanceSlab,
  VillageDeliveryEntry
} from '../types';
import { 
  Truck, Save, MapPin, Scale, Navigation, 
  Info, CheckCircle2, IndianRupee, Plus, Trash2, Edit2, 
  AlertCircle, Check, X, Sliders, Users, Mail, ShieldCheck,
  Building2, Search, RotateCcw, XCircle, ToggleLeft, ToggleRight,
  Package, Globe, Hash, AlertTriangle
} from 'lucide-react';
import { AdminDeliveryPartnersManager } from './AdminDeliveryPartnersManager';
import { AdminEmailOtpManager } from './AdminEmailOtpManager';
import { SafeErrorBoundary } from './SafeErrorBoundary';
import { VehicleIcon } from './common/VehicleIcon';
import { 
  DEFAULT_VILLAGE_DIRECTORY, 
  PRIMARY_TEHSILS, 
  getCombinedVillageDirectory, 
  normalizeLocationText,
  getAllTehsilsFromDirectory
} from '../data/villageDirectory';

const COMMON_EMOJIS = ['🛵', '🛺', '🛻', '🚚', '🚛', '🚜', '🚐', '📦', '🚲', '🚗'];

const AdminDeliveryManager: React.FC = () => {
  const { deliveryConfig, updateDeliveryConfig } = useAppContext();

  // Local draft state for editing
  const [config, setConfig] = useState<DynamicDeliveryConfig>(() => {
    const initVillages = getCombinedVillageDirectory(deliveryConfig.villageDirectory);
    const initTehsils = (Array.isArray(deliveryConfig.activeTehsils) && deliveryConfig.activeTehsils.length > 0)
      ? deliveryConfig.activeTehsils
      : Array.from(new Set(initVillages.map(v => v.tehsil).filter(Boolean)));

    return {
      ...deliveryConfig,
      deliveryMode: deliveryConfig.deliveryMode || 'hybrid',
      activeTehsils: initTehsils.length > 0 ? initTehsils : ['शामगढ़', 'गरोठ', 'सुवासरा', 'सीतामऊ', 'भानपुरा', 'मंदसौर'],
      courierRates: deliveryConfig.courierRates || {
        isEnabled: true,
        baseWeightKg: 1,
        baseCharge: 60,
        perKgAdditionalCharge: 30,
        freeDeliveryThreshold: 2000,
        defaultPartnerName: 'Speed Post (इंडिया पोस्ट)',
      },
      storeOrigin: { ...deliveryConfig.storeOrigin },
      vehicles: (deliveryConfig.vehicles || []).map(v => ({ ...v })),
      weightSlabs: (deliveryConfig.weightSlabs || []).map(ws => ({ ...ws })),
      distanceSlabs: (deliveryConfig.distanceSlabs || []).map(ds => ({ ...ds })),
      rateMatrix: { ...(deliveryConfig.rateMatrix || {}) },
      villageDirectory: initVillages,
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'matrix' | 'partners' | 'email_otp' | 'store' | 'villages' | 'courier'>('matrix');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Village Directory Management States
  const [selectedTehsilFilter, setSelectedTehsilFilter] = useState<string>('all');
  const [villageSearchQuery, setVillageSearchQuery] = useState<string>('');
  const [isAddingTehsil, setIsAddingTehsil] = useState(false);
  const [newTehsilName, setNewTehsilName] = useState('');
  const [newTehsilError, setNewTehsilError] = useState<string | null>(null);
  const [tehsilToRemove, setTehsilToRemove] = useState<{ name: string; count: number } | null>(null);
  const [isAddingVillage, setIsAddingVillage] = useState(false);
  const [editingVillage, setEditingVillage] = useState<VillageDeliveryEntry | null>(null);
  const [villageToDelete, setVillageToDelete] = useState<VillageDeliveryEntry | null>(null);
  const [newVillageForm, setNewVillageForm] = useState<{
    nameHi: string;
    nameEn: string;
    tehsil: string;
    district: string;
    pincode: string;
    distanceKm: string;
    isActive: boolean;
  }>({
    nameHi: '',
    nameEn: '',
    tehsil: 'शामगढ़',
    district: 'मंदसौर',
    pincode: '458883',
    distanceKm: '10',
    isActive: true,
  });

  // Modal / Inline Edit States
  const [editingDistanceSlab, setEditingDistanceSlab] = useState<DistanceSlab | null>(null);
  const [isAddingDistanceSlab, setIsAddingDistanceSlab] = useState(false);
  const [distanceSlabToDelete, setDistanceSlabToDelete] = useState<DistanceSlab | null>(null);
  const [modalFormError, setModalFormError] = useState<string | null>(null);
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
    const syncedVillages = getCombinedVillageDirectory(deliveryConfig.villageDirectory);
    const syncedTehsils = (Array.isArray(deliveryConfig.activeTehsils) && deliveryConfig.activeTehsils.length > 0)
      ? deliveryConfig.activeTehsils
      : Array.from(new Set(syncedVillages.map(v => v.tehsil).filter(Boolean)));

    setConfig({
      ...deliveryConfig,
      deliveryMode: deliveryConfig.deliveryMode || 'hybrid',
      activeTehsils: syncedTehsils.length > 0 ? syncedTehsils : ['शामगढ़', 'गरोठ', 'सुवासरा', 'सीतामऊ', 'भानपुरा', 'मंदसौर'],
      courierRates: deliveryConfig.courierRates || {
        isEnabled: true,
        baseWeightKg: 1,
        baseCharge: 60,
        perKgAdditionalCharge: 30,
        freeDeliveryThreshold: 2000,
        defaultPartnerName: 'Speed Post (इंडिया पोस्ट)',
      },
      storeOrigin: { ...deliveryConfig.storeOrigin },
      vehicles: (deliveryConfig.vehicles || []).map(v => ({ ...v })),
      weightSlabs: (deliveryConfig.weightSlabs || []).map(ws => ({ ...ws })),
      distanceSlabs: (deliveryConfig.distanceSlabs || []).map(ds => ({ ...ds })),
      rateMatrix: { ...(deliveryConfig.rateMatrix || {}) },
      villageDirectory: syncedVillages,
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
      setValidationError("सेटिंग्स सेव करने में समस्या आई। कृपया पुनः प्रयास करें।");
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
      setModalFormError('कृपया वाहन का नाम दर्ज करें।');
      return;
    }
    if (maxKg <= minKg) {
      setModalFormError('अधिकतम वजन (Max Weight) न्यूनतम वजन से अधिक होना चाहिए।');
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

    setModalFormError(null);
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
      setValidationError('कम से कम 1 वाहन होना आवश्यक है। इसे हटाया नहीं जा सकता।');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (vehicle.isActive !== false && activeCount <= 1) {
      setValidationError('कम से कम 1 सक्रिय (Active) वाहन होना आवश्यक है ताकि ग्राहक ऑर्डर कर सकें।');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setModalFormError('कृपया वैध न्यूनतम दूरी (Min Distance km) दर्ज करें।');
      return;
    }
    if (isNaN(maxKm) || maxKm <= minKm) {
      setModalFormError('अधिकतम दूरी (Max Distance km) न्यूनतम दूरी से अधिक होनी चाहिए।');
      return;
    }
    if (!label) {
      setModalFormError('कृपया दूरी स्लैब का लेबल (जैसे: 25–40 किमी) दर्ज करें।');
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

    setModalFormError(null);
    setIsAddingDistanceSlab(false);
    setNewDistanceSlab({ minKm: '', maxKm: '', label: '' });
  };

  const handleUpdateDistanceSlab = (dsId: string, minKm: number, maxKm: number, label: string) => {
    if (maxKm <= minKm) {
      setModalFormError('अधिकतम दूरी न्यूनतम दूरी से अधिक होनी चाहिए।');
      return;
    }
    if (!label.trim()) {
      setModalFormError('दूरी स्लैब का लेबल खाली नहीं हो सकता।');
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

    setModalFormError(null);
    setEditingDistanceSlab(null);
  };

  const promptDeleteDistanceSlab = (ds: DistanceSlab) => {
    if (config.distanceSlabs.length <= 1) {
      setValidationError('कम से कम 1 दूरी स्लैब होना आवश्यक है। इसे हटाया नहीं जा सकता।');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setDistanceSlabToDelete(ds);
  };

  const confirmDeleteDistanceSlab = () => {
    if (!distanceSlabToDelete) return;
    const dsId = distanceSlabToDelete.id;

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

    setDistanceSlabToDelete(null);
  };

  // ----------------------------------------------------
  // VILLAGE DIRECTORY ACTIONS
  // ----------------------------------------------------
  const handleToggleVillageActive = async (villageId: string) => {
    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const updated = currentList.map(v => 
      v.id === villageId ? { ...v, isActive: !v.isActive } : v
    );
    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      villageDirectory: updated,
    };
    setConfig(updatedConfig);
    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on toggle village failed:", err);
    }
  };

  const handleUpdateVillageDistance = (villageId: string, km: number) => {
    const validKm = Math.max(0.1, parseFloat((km || 0).toFixed(1)));
    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const updated = currentList.map(v => 
      v.id === villageId ? { ...v, distanceKm: validKm } : v
    );
    setConfig(prev => ({
      ...prev,
      villageDirectory: updated,
    }));
  };

  const handleAddCustomVillage = async () => {
    const nameHi = newVillageForm.nameHi.trim();
    const nameEn = newVillageForm.nameEn.trim() || nameHi;
    const distanceKm = parseFloat(newVillageForm.distanceKm) || 10;
    const tehsil = newVillageForm.tehsil.trim() || 'शामगढ़';
    const district = newVillageForm.district.trim() || 'मंदसौर';
    const pincode = newVillageForm.pincode.trim() || '458883';

    if (!nameHi) {
      setModalFormError('कृपया गांव का नाम (हिंदी) दर्ज करें।');
      return;
    }
    if (distanceKm <= 0) {
      setModalFormError('कृपया वैध सड़क दूरी (किमी) दर्ज करें।');
      return;
    }

    const newEntry: VillageDeliveryEntry = {
      id: `v_custom_${Date.now()}`,
      nameHi,
      nameEn,
      tehsil,
      district,
      pincode,
      distanceKm,
      isActive: newVillageForm.isActive,
      isCustom: true,
    };

    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    
    const currentActive = (Array.isArray(config.activeTehsils) && config.activeTehsils.length > 0)
      ? config.activeTehsils
      : Array.from(new Set(currentList.map(v => v.tehsil).filter(Boolean)));
    const updatedActive = currentActive.includes(tehsil) ? currentActive : [...currentActive, tehsil];

    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      villageDirectory: [newEntry, ...currentList],
      activeTehsils: updatedActive,
    };

    setConfig(updatedConfig);
    setModalFormError(null);
    setIsAddingVillage(false);
    setNewVillageForm({
      nameHi: '',
      nameEn: '',
      tehsil: 'शामगढ़',
      district: 'मंदसौर',
      pincode: '458883',
      distanceKm: '10',
      isActive: true,
    });

    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on add village failed:", err);
    }
  };

  const handleSaveEditedVillage = async () => {
    if (!editingVillage) return;
    const nameHi = editingVillage.nameHi.trim();
    const nameEn = editingVillage.nameEn.trim() || nameHi;
    const distanceKm = Math.max(0.1, parseFloat((editingVillage.distanceKm || 0).toFixed(1)));
    const tehsil = editingVillage.tehsil.trim() || 'शामगढ़';
    const district = editingVillage.district.trim() || 'मंदसौर';
    const pincode = editingVillage.pincode.trim() || '458883';

    if (!nameHi) {
      setModalFormError('कृपया गांव का नाम (हिंदी) दर्ज करें।');
      return;
    }
    if (distanceKm <= 0) {
      setModalFormError('कृपया वैध सड़क दूरी (किमी) दर्ज करें।');
      return;
    }

    const updatedEntry: VillageDeliveryEntry = {
      ...editingVillage,
      nameHi,
      nameEn,
      tehsil,
      district,
      pincode,
      distanceKm,
      isActive: editingVillage.isActive !== false,
    };

    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const updated = currentList.map(v => v.id === updatedEntry.id ? updatedEntry : v);

    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      villageDirectory: updated,
    };

    setConfig(updatedConfig);
    setModalFormError(null);
    setEditingVillage(null);

    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on edit village failed:", err);
    }
  };

  const promptDeleteVillage = (village: VillageDeliveryEntry) => {
    setVillageToDelete(village);
  };

  const handleConfirmDeleteVillage = async () => {
    if (!villageToDelete) return;
    const targetId = villageToDelete.id;
    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const updatedList = currentList.filter(v => v.id !== targetId);

    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      villageDirectory: updatedList,
    };

    setConfig(updatedConfig);
    if (editingVillage && editingVillage.id === targetId) {
      setEditingVillage(null);
    }
    setVillageToDelete(null);

    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on village delete failed:", err);
    }
  };

  const handleConfirmAddTehsil = async () => {
    const trimmed = newTehsilName.trim();
    if (!trimmed) {
      setNewTehsilError('कृपया तहसील का नाम दर्ज करें');
      return;
    }
    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const currentActive = (Array.isArray(config.activeTehsils) && config.activeTehsils.length > 0)
      ? config.activeTehsils
      : Array.from(new Set(currentList.map(v => v.tehsil).filter(Boolean)));

    if (currentActive.includes(trimmed)) {
      setNewTehsilError(`तहसील "${trimmed}" पहले से सक्रिय सूची में मौजूद है`);
      return;
    }
    const updatedActive = [...currentActive, trimmed];
    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      activeTehsils: updatedActive,
    };

    setConfig(updatedConfig);
    setSelectedTehsilFilter(trimmed);
    setIsAddingTehsil(false);
    setNewTehsilName('');
    setNewTehsilError(null);

    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on tehsil add failed:", err);
    }
  };

  const promptRemoveTehsil = (tehsilName: string) => {
    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const count = currentList.filter(v => v.tehsil === tehsilName).length;
    setTehsilToRemove({ name: tehsilName, count });
  };

  const confirmRemoveTehsil = async () => {
    if (!tehsilToRemove) return;
    const targetTehsil = tehsilToRemove.name;

    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const currentActive = (Array.isArray(config.activeTehsils) && config.activeTehsils.length > 0)
      ? config.activeTehsils
      : Array.from(new Set(currentList.map(v => v.tehsil).filter(Boolean)));
    const updatedActive = currentActive.filter(t => t !== targetTehsil);
    
    // Completely remove all villages of this Tehsil from saved delivery list
    const updatedList = currentList.filter(v => v.tehsil !== targetTehsil);

    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      activeTehsils: updatedActive,
      villageDirectory: updatedList,
    };

    setConfig(updatedConfig);

    if (selectedTehsilFilter === targetTehsil) {
      setSelectedTehsilFilter('all');
    }

    setTehsilToRemove(null);

    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on tehsil remove failed:", err);
    }
  };

  const handleBatchToggleTehsil = async (tehsil: string, active: boolean) => {
    const currentList = Array.isArray(config.villageDirectory) && config.villageDirectory.length > 0
      ? config.villageDirectory
      : [...DEFAULT_VILLAGE_DIRECTORY];
    const updatedList = currentList.map(v => 
      v.tehsil === tehsil ? { ...v, isActive: active } : v
    );
    const currentActive = (Array.isArray(config.activeTehsils) && config.activeTehsils.length > 0)
      ? config.activeTehsils
      : Array.from(new Set(currentList.map(v => v.tehsil).filter(Boolean)));
    let updatedActive = [...currentActive];
    if (active && !updatedActive.includes(tehsil)) {
      updatedActive.push(tehsil);
    } else if (!active && updatedActive.includes(tehsil)) {
      updatedActive = updatedActive.filter(t => t !== tehsil);
    }

    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      activeTehsils: updatedActive,
      villageDirectory: updatedList,
    };

    setConfig(updatedConfig);

    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save on batch toggle tehsil failed:", err);
    }
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

      {/* Global Delivery Operational Mode Selector */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#2D5A27]" />
              डिलीवरी संचालन मोड (Delivery Operational Mode)
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              चुनें कि आपके ग्राहक किन माध्यमों से डिलीवरी प्राप्त कर सकते हैं
            </p>
          </div>
          <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-[#2D5A27] border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            सक्रिय मोड: {config.deliveryMode === 'local_only' ? 'केवल स्थानीय डिलीवरी' : config.deliveryMode === 'courier_only' ? 'केवल कूरियर डिलीवरी' : 'हाइब्रिड डिलीवरी (लोकल + कूरियर)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Hybrid Mode (Default & Recommended) */}
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, deliveryMode: 'hybrid' }))}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              (config.deliveryMode || 'hybrid') === 'hybrid'
                ? 'bg-emerald-50/80 border-[#2D5A27] ring-2 ring-[#2D5A27]/20 shadow-sm'
                : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-[#2D5A27] flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-700 text-white">
                अनुशंसित (Recommended)
              </span>
            </div>
            <h4 className="text-xs font-black text-gray-900 mt-2.5">
              हाइब्रिड डिलीवरी (Hybrid Mode)
            </h4>
            <p className="text-[11px] text-gray-600 leading-relaxed font-medium mt-1">
              स्थानीय सक्रिय तहसीलों/गांवों में दुकान के वाहनों से, तथा अन्य सभी बाहरी क्षेत्रों में स्पीड पोस्ट / कूरियर से स्वतः डिलीवरी उपलब्ध होगी।
            </p>
          </button>

          {/* Option 2: Local Only */}
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, deliveryMode: 'local_only' }))}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              config.deliveryMode === 'local_only'
                ? 'bg-emerald-50/80 border-[#2D5A27] ring-2 ring-[#2D5A27]/20 shadow-sm'
                : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-xs font-black text-gray-900 mt-2.5">
              केवल स्थानीय डिलीवरी (Local Only)
            </h4>
            <p className="text-[11px] text-gray-600 leading-relaxed font-medium mt-1">
              केवल चुनी गई सक्रिय तहसीलों व गांवों के लिए ही डिलीवरी चालू रहेगी। अन्य किसी भी बाहरी क्षेत्र के ग्राहकों को स्पष्ट अनुपलब्ध संदेश दिखेगा।
            </p>
          </button>

          {/* Option 3: Courier Only */}
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, deliveryMode: 'courier_only' }))}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              config.deliveryMode === 'courier_only'
                ? 'bg-emerald-50/80 border-[#2D5A27] ring-2 ring-[#2D5A27]/20 shadow-sm'
                : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-xs font-black text-gray-900 mt-2.5">
              केवल कूरियर डिलीवरी (Courier Only)
            </h4>
            <p className="text-[11px] text-gray-600 leading-relaxed font-medium mt-1">
              दुकान के वाहन बंद रहेंगे और सभी ऑर्डर्स केवल स्पीड पोस्ट (इंडिया पोस्ट) या कूरियर पार्टनर के वजन-आधारित पार्सल द्वारा डिलीवर होंगे।
            </p>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('matrix')}
          className={`flex-1 min-w-[150px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'matrix' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" /> रेट मैट्रिक्स (Rate Matrix)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('villages')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'villages' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> ग्राम व दूरी प्रबंधन (Villages)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('courier')}
          className={`flex-1 min-w-[160px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'courier' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> कूरियर दरें (Courier Rates)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('partners')}
          className={`flex-1 min-w-[150px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'partners' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> डिलीवरी पार्टनर्स (Delivery Boys)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('email_otp')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'email_otp' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Mail className="w-3.5 h-3.5" /> ईमेल व डिलीवरी OTP (SMTP)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`flex-1 min-w-[150px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                              onClick={() => promptDeleteDistanceSlab(ds)}
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
                              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                                <VehicleIcon emojiOrType={v.icon || v.id} className="w-4 h-4 text-emerald-800" />
                              </div>
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
      {/* SECTION: COURIER / SPEED POST RATES MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'courier' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5">
          <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">
                अखिल भारतीय स्पीड पोस्ट व कूरियर पार्सल दरें (Courier Rates)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-medium mt-0.5">
                जब ग्राहक स्थानीय दुकान क्षेत्र से बाहर का पता भरता है (हाइब्रिड मोड में), या जब केवल कूरियर मोड सक्रिय होता है, तब यह वजन-आधारित दर मैट्रिक्स लागू होता है।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700 block">कूरियर पार्टनर का नाम</label>
              <input
                type="text"
                value={config.courierRates?.defaultPartnerName || 'Speed Post (इंडिया पोस्ट)'}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  courierRates: {
                    ...(prev.courierRates || { isEnabled: true, baseWeightKg: 1, baseCharge: 60, perKgAdditionalCharge: 30, freeDeliveryThreshold: 2000 }),
                    defaultPartnerName: e.target.value,
                  }
                }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700 block">बेस वजन (प्रारंभिक किग्रा)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={config.courierRates?.baseWeightKg ?? 1}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    courierRates: {
                      ...(prev.courierRates || { isEnabled: true, baseWeightKg: 1, baseCharge: 60, perKgAdditionalCharge: 30, freeDeliveryThreshold: 2000, defaultPartnerName: 'Speed Post (इंडिया पोस्ट)' }),
                      baseWeightKg: parseFloat(e.target.value) || 1,
                    }
                  }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">kg</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700 block">बेस डिलीवरी शुल्क (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.courierRates?.baseCharge ?? 60}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    courierRates: {
                      ...(prev.courierRates || { isEnabled: true, baseWeightKg: 1, baseCharge: 60, perKgAdditionalCharge: 30, freeDeliveryThreshold: 2000, defaultPartnerName: 'Speed Post (इंडिया पोस्ट)' }),
                      baseCharge: parseFloat(e.target.value) || 0,
                    }
                  }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700 block">अतिरिक्त प्रति किग्रा शुल्क (₹/kg)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.courierRates?.perKgAdditionalCharge ?? 30}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    courierRates: {
                      ...(prev.courierRates || { isEnabled: true, baseWeightKg: 1, baseCharge: 60, perKgAdditionalCharge: 30, freeDeliveryThreshold: 2000, defaultPartnerName: 'Speed Post (इंडिया पोस्ट)' }),
                      perKgAdditionalCharge: parseFloat(e.target.value) || 0,
                    }
                  }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-700 block">मुफ़्त कूरियर डिलीवरी सीमा (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.courierRates?.freeDeliveryThreshold ?? 2000}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    courierRates: {
                      ...(prev.courierRates || { isEnabled: true, baseWeightKg: 1, baseCharge: 60, perKgAdditionalCharge: 30, defaultPartnerName: 'Speed Post (इंडिया पोस्ट)' }),
                      freeDeliveryThreshold: parseFloat(e.target.value) || 0,
                    }
                  }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-3 text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DELIVERY PARTNERS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'partners' && (
        <AdminDeliveryPartnersManager availableVehicles={config.vehicles} />
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: EMAIL SMTP & DELIVERY OTP MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'email_otp' && (
        <SafeErrorBoundary fallbackTitle="ईमेल व डिलीवरी OTP सेटिंग्स लोड करने में समस्या">
          <AdminEmailOtpManager />
        </SafeErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: VILLAGE DIRECTORY & FOUR-WHEELER ROAD DISTANCE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'villages' && (() => {
        const fullList = getCombinedVillageDirectory(config.villageDirectory);

        // Derive effective active tehsils reliably
        const activeTehsilsList: string[] = (() => {
          if (Array.isArray(config.activeTehsils) && config.activeTehsils.length > 0) {
            const set = new Set<string>(config.activeTehsils);
            fullList.forEach(v => {
              if (v.tehsil && v.tehsil.trim()) set.add(v.tehsil.trim());
            });
            return Array.from(set);
          }
          const fromVillages = Array.from(new Set(fullList.map(v => v.tehsil).filter(Boolean)));
          if (fromVillages.length > 0) return fromVillages;
          return ['शामगढ़', 'गरोठ', 'सुवासरा', 'सीतामऊ', 'भानपुरा', 'मंदसौर'];
        })();

        // Filter by Tehsil
        const tehsilFiltered = selectedTehsilFilter === 'all'
          ? fullList
          : selectedTehsilFilter === 'अन्य'
            ? fullList.filter(v => !PRIMARY_TEHSILS.includes(v.tehsil))
            : fullList.filter(v => v.tehsil === selectedTehsilFilter);

        // Filter by Search Query
        const normalizedQuery = normalizeLocationText(villageSearchQuery);
        const filteredVillages = !normalizedQuery
          ? tehsilFiltered
          : tehsilFiltered.filter(v => {
              const normHi = normalizeLocationText(v.nameHi);
              const normEn = v.nameEn.toLowerCase();
              const normTehsil = normalizeLocationText(v.tehsil);
              const normDist = normalizeLocationText(v.district);
              return normHi.includes(normalizedQuery) ||
                normEn.includes(normalizedQuery) ||
                v.pincode.includes(normalizedQuery) ||
                normTehsil.includes(normalizedQuery) ||
                normDist.includes(normalizedQuery);
            });

        const totalCount = fullList.length;
        const activeCount = fullList.filter(v => v.isActive).length;
        const disabledCount = fullList.filter(v => !v.isActive).length;
        const customCount = fullList.filter(v => v.isCustom).length;

        return (
          <div className="space-y-5">
            {/* Manual Village & Tehsil Action Header */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-[#2D5A27] flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-gray-800">
                    स्थानीय ग्राम डायरेक्टरी एवं फोर-व्हीलर सड़क दूरी प्रबंधन
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    स्टोर ओरिजिन (<span className="font-bold text-[#2D5A27]">फल्सावदिया कृषि बाजार, डिंपल चौराहा, शामगढ़ – 458883</span>) से प्रत्येक गांव की वास्तविक चार-पहिया पक्की सड़क दूरी। यहां से आप किसी भी तहसील व गांव को सीधे जोड़ सकते हैं, दूरी संपादित कर सकते हैं अथवा डिलीवरी चालू/बंद कर सकते हैं।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTehsil(true);
                    setNewTehsilName('');
                    setNewTehsilError(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" /> + नई तहसील जोड़ें
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingVillage(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + नया गांव जोड़ें
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 block">कुल गांव व कस्बे</span>
                <span className="text-lg font-black text-gray-800">{totalCount}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 block">डिलीवरी सक्रिय</span>
                <span className="text-lg font-black text-emerald-700">{activeCount}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                <span className="text-[11px] font-bold text-red-600 block">डिलीवरी बंद</span>
                <span className="text-lg font-black text-red-600">{disabledCount}</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 block">सक्रिय तहसीलें</span>
                <span className="text-lg font-black text-amber-700">{activeTehsilsList.length}</span>
              </div>
            </div>

            {/* Tehsil Filters & Search Box */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
              {/* Tehsil Selector Pills with Cross Remove Badges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-500">सक्रिय तहसील सूची:</span>
                  {selectedTehsilFilter !== 'all' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleBatchToggleTehsil(selectedTehsilFilter, true)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> पूरी तहसील सक्रिय करें
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchToggleTehsil(selectedTehsilFilter, false)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-red-200 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3 h-3 text-red-600" /> पूरी तहसील निष्क्रिय करें
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTehsilFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedTehsilFilter === 'all'
                        ? 'bg-[#2D5A27] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    सभी ({totalCount})
                  </button>
                  {activeTehsilsList.map(tehsil => {
                    const count = fullList.filter(v => v.tehsil === tehsil).length;
                    const isSelected = selectedTehsilFilter === tehsil;

                    return (
                      <div
                        key={tehsil}
                        className={`inline-flex items-center rounded-xl text-xs font-bold transition-all shrink-0 border ${
                          isSelected
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedTehsilFilter(tehsil)}
                          className="px-2.5 py-1.5 cursor-pointer flex items-center gap-1"
                        >
                          <span>{tehsil}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200/60 text-emerald-900'
                          }`}>
                            {count}
                          </span>
                        </button>

                        {/* Cross Remove Badge - triggers confirmation dialog */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            promptRemoveTehsil(tehsil);
                          }}
                          title={`तहसील "${tehsil}" और इसके सभी ${count} गांव डिलीवरी सूची से हटाएं`}
                          className={`p-1.5 rounded-r-xl transition-colors cursor-pointer ${
                            isSelected 
                              ? 'hover:bg-red-700 text-white/80 hover:text-white' 
                              : 'hover:bg-red-100 text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={villageSearchQuery}
                  onChange={e => setVillageSearchQuery(e.target.value)}
                  placeholder="गांव का नाम (हिंदी या अंग्रेजी) अथवा पिन कोड से खोजें... (e.g. Takrawad, चान, 458883)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-9 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]/20 transition-all"
                />
                {villageSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setVillageSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Village Cards Grid */}
            {filteredVillages.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-2">
                <Building2 className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-700">कोई गांव नहीं मिला</p>
                <p className="text-[11px] text-gray-500">
                  {villageSearchQuery ? `"${villageSearchQuery}" से मेल खाता हुआ कोई गांव दर्ज नहीं है।` : 'इस तहसील में कोई गांव नहीं मिला।'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingVillage(true)}
                    className="px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> इस नाम से नया गांव जोड़ें
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredVillages.map(village => (
                  <div
                    key={village.id}
                    className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                      village.isActive ? 'border-gray-200/90 hover:border-emerald-300' : 'border-red-200 bg-red-50/20 opacity-80'
                    }`}
                  >
                    {/* Top Row: Village Names & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-gray-900 truncate">
                            {village.nameHi}
                          </span>
                          <span className="text-xs text-gray-500 font-semibold truncate">
                            ({village.nameEn})
                          </span>
                          {village.isCustom && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              कस्टम
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                          <span>तहसील: <strong className="text-gray-700">{village.tehsil}</strong></span>
                          <span>•</span>
                          <span>पिन: <strong className="text-gray-700">{village.pincode}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingVillage({ ...village })}
                          title="गांव का नाम, तहसील, पिन कोड व विवरण संपादित करें"
                          className="p-1.5 text-gray-500 hover:text-[#2D5A27] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDeleteVillage(village)}
                          title="गांव हटाएं"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Four-Wheeler Road Distance Editable Input */}
                    <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-gray-700 block">
                          सड़क दूरी (Four-Wheeler Road):
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium block">
                          फल्सावदिया, शामगढ़ से दूरी
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={village.distanceKm}
                          onChange={e => handleUpdateVillageDistance(village.id, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-white border border-gray-200 rounded-lg py-1 px-2 text-right font-black text-xs text-gray-900 outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]/20"
                        />
                        <span className="text-xs font-bold text-gray-600">किमी</span>
                      </div>
                    </div>

                    {/* Bottom: Active / Disabled Delivery Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVillageActive(village.id)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        village.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {village.isActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>डिलीवरी चालू (Active)</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>डिलीवरी बंद (Delivery Disabled)</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Save Reminder Floating Banner */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                <Info className="w-4 h-4 text-[#2D5A27] shrink-0" />
                <span>
                  गांवों की दूरी अथवा स्थिति में किए गए बदलाव तुरंत लागू करने के लिए सेटिंग्स सुरक्षित करें।
                </span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> सेव हो रहा है...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> गांव सेटिंग्स सुरक्षित करें (Save)
                  </>
                )}
              </button>
            </div>

            {/* MODAL: ADD CUSTOM VILLAGE */}
            {isAddingVillage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#2D5A27]" /> + नया गांव जोड़ें (Add Custom Village)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddingVillage(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {modalFormError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{modalFormError}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">गांव का नाम हिंदी में * (e.g. खेड़ा, रुंडी)</label>
                      <input
                        type="text"
                        placeholder="गांव का नाम (हिंदी)"
                        value={newVillageForm.nameHi}
                        onChange={e => setNewVillageForm(prev => ({ ...prev, nameHi: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">Village Name in English (e.g. Kheda, Rundi)</label>
                      <input
                        type="text"
                        placeholder="Village name (English)"
                        value={newVillageForm.nameEn}
                        onChange={e => setNewVillageForm(prev => ({ ...prev, nameEn: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">तहसील * (Tehsil)</label>
                        <input
                          type="text"
                          placeholder="e.g. शामगढ़"
                          value={newVillageForm.tehsil}
                          onChange={e => setNewVillageForm(prev => ({ ...prev, tehsil: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">जिला</label>
                        <input
                          type="text"
                          value={newVillageForm.district}
                          onChange={e => setNewVillageForm(prev => ({ ...prev, district: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">पिन कोड</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={newVillageForm.pincode}
                          onChange={e => setNewVillageForm(prev => ({ ...prev, pincode: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">सड़क दूरी (किमी) *</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          placeholder="e.g. 12"
                          value={newVillageForm.distanceKm}
                          onChange={e => setNewVillageForm(prev => ({ ...prev, distanceKm: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <span className="font-bold text-gray-700">डिलीवरी स्थिति</span>
                      <button
                        type="button"
                        onClick={() => setNewVillageForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`px-3 py-1 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                          newVillageForm.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {newVillageForm.isActive ? 'सक्रिय (चालू)' : 'अक्षम (बंद)'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingVillage(false)}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomVillage}
                      className="flex-1 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> जोड़ें
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: EDIT VILLAGE DETAILS */}
            {editingVillage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-[#2D5A27]" /> गांव की जानकारी संपादित करें
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingVillage(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {modalFormError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{modalFormError}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">गांव का नाम हिंदी में * (e.g. शामगढ़, खेड़ा)</label>
                      <input
                        type="text"
                        placeholder="गांव का नाम (हिंदी)"
                        value={editingVillage.nameHi}
                        onChange={e => setEditingVillage(prev => prev ? { ...prev, nameHi: e.target.value } : null)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">Village Name in English (e.g. Shamgarh, Kheda)</label>
                      <input
                        type="text"
                        placeholder="Village name (English)"
                        value={editingVillage.nameEn}
                        onChange={e => setEditingVillage(prev => prev ? { ...prev, nameEn: e.target.value } : null)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">तहसील * (Tehsil)</label>
                        <input
                          type="text"
                          placeholder="e.g. शामगढ़"
                          value={editingVillage.tehsil}
                          onChange={e => setEditingVillage(prev => prev ? { ...prev, tehsil: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">जिला</label>
                        <input
                          type="text"
                          value={editingVillage.district}
                          onChange={e => setEditingVillage(prev => prev ? { ...prev, district: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">पिन कोड</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={editingVillage.pincode}
                          onChange={e => setEditingVillage(prev => prev ? { ...prev, pincode: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-gray-700">सड़क दूरी (Four-Wheeler Road किमी) *</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={editingVillage.distanceKm}
                          onChange={e => setEditingVillage(prev => prev ? { ...prev, distanceKm: parseFloat(e.target.value) || 0 } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <div>
                        <span className="font-bold text-gray-800 block">डिलीवरी स्थिति</span>
                        <span className="text-[10px] text-gray-500">क्या इस गांव के पते पर ऑर्डर स्वीकार करने हैं?</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingVillage(prev => prev ? { ...prev, isActive: !prev.isActive } : null)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                          editingVillage.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {editingVillage.isActive ? 'सक्रिय (चालू)' : 'अक्षम (बंद)'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => promptDeleteVillage(editingVillage)}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> हटाएं
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingVillage(null)}
                        className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedVillage}
                        className="py-2.5 px-5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> बदलाव सुरक्षित करें
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: CONFIRM DELETE VILLAGE */}
            {villageToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-gray-900 text-base">
                      गांव सूची से हटाएं?
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      क्या आप <strong className="text-gray-900">{villageToDelete.nameHi} ({villageToDelete.nameEn})</strong>, तहसील: <strong className="text-gray-900">{villageToDelete.tehsil}</strong> को डायरेक्टरी से हटाना चाहते हैं?
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setVillageToDelete(null)}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteVillage}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> हां, हटाएं
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: CONFIRM REMOVE TEHSIL & ITS LINKED VILLAGES */}
            {tehsilToRemove && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-gray-900 text-base">
                      तहसील व सभी गांव हटाएं?
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      क्या आप <strong className="text-gray-900 font-black">"{tehsilToRemove.name}"</strong> तहसील और इसके अंतर्गत सक्रिय सभी <strong className="text-red-600 font-black">{tehsilToRemove.count} गांवों</strong> को अपनी डिलीवरी सूची से पूरी तरह हटाना चाहते हैं?
                    </p>
                    <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 font-medium text-left leading-relaxed">
                      <span className="font-bold mb-0.5 flex items-center gap-1 text-amber-950">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" /> डेटा सुरक्षा की गारंटी:
                      </span>
                      सरकारी LGD/OSM मास्टर डायरेक्टरी 100% सुरक्षित रहेगी। पूर्व में किए गए ऑर्डर्स, बिल और ग्राहक रिकॉर्ड्स पर कोई प्रभाव नहीं पड़ेगा। आप भविष्य में इस तहसील को दोबारा जोड़ सकते हैं।
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setTehsilToRemove(null)}
                      className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> रद्द करें
                    </button>
                    <button
                      type="button"
                      onClick={confirmRemoveTehsil}
                      className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> हाँ, तहसील हटाएं
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: ADD CUSTOM TEHSIL */}
            {isAddingTehsil && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#2D5A27]" /> + नई तहसील जोड़ें
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTehsil(false);
                        setNewTehsilError(null);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {newTehsilError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{newTehsilError}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="font-bold text-gray-700">तहसील का नाम * (उदा. शामगढ़, गरोठ, सुवासरा)</label>
                      <input
                        type="text"
                        placeholder="तहसील का नाम दर्ज करें"
                        value={newTehsilName}
                        onChange={e => {
                          setNewTehsilName(e.target.value);
                          if (newTehsilError) setNewTehsilError(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleConfirmAddTehsil();
                        }}
                        autoFocus
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      तहसील जुड़ने के बाद आप उस तहसील के अंतर्गत किसी भी गांव को सीधे "+ नया गांव जोड़ें" बटन द्वारा जोड़ सकते हैं।
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTehsil(false);
                        setNewTehsilError(null);
                      }}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAddTehsil}
                      className="flex-1 py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> तहसील जोड़ें
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
              {modalFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{modalFormError}</span>
                </div>
              )}
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
              {modalFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{modalFormError}</span>
                </div>
              )}
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
              {modalFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{modalFormError}</span>
                </div>
              )}
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
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
                        newVehicle.icon === emoji 
                          ? 'bg-emerald-50 border-[#2D5A27] shadow-xs scale-105' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <VehicleIcon emojiOrType={emoji} className="w-5 h-5 text-gray-700" />
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
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
                          v.icon === emoji 
                            ? 'bg-emerald-50 border-[#2D5A27] shadow-xs scale-105' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <VehicleIcon emojiOrType={emoji} className="w-5 h-5 text-gray-700" />
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
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-gray-800">
                क्या आप इस वाहन को हटाना चाहते हैं?
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-700">
                <VehicleIcon emojiOrType={vehicleToDelete.icon || vehicleToDelete.id} className="w-4 h-4 text-emerald-800" />
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

      {/* ========================================================================= */}
      {/* DISTANCE SLAB DELETE CONFIRMATION POPUP MODAL */}
      {/* ========================================================================= */}
      {distanceSlabToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-gray-800">
                क्या आप इस दूरी स्लैब को हटाना चाहते हैं?
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-700">
                <Navigation className="w-4 h-4 text-[#2D5A27]" />
                <span>{distanceSlabToDelete.label}</span>
                <span className="text-[10px] text-gray-500 font-bold">
                  ({distanceSlabToDelete.minDistanceKm}–{distanceSlabToDelete.maxDistanceKm >= 9999 ? '∞' : distanceSlabToDelete.maxDistanceKm} km)
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed pt-1">
                यह दूरी कॉलम Delivery Matrix से हट जाएगा और इसके सभी संबंधित वाहनों के डिलीवरी चार्ज भी हट जाएँगे।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDistanceSlabToDelete(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={confirmDeleteDistanceSlab}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
