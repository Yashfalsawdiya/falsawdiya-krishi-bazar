import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  DynamicDeliveryConfig, 
  VehicleConfig, 
  DistanceSlab, 
  WeightSlab, 
  VillageDeliveryEntry,
  TehsilEntry 
} from '../types';
import { 
  Store, Save, MapPin, Clock, Phone, 
  Info, CheckCircle2, AlertCircle, Mail, ShieldCheck,
  Check, Sparkles, Truck, Users, Plus, 
  Pencil, Trash2, Search, X, Navigation, Bike,
  Filter, AlertTriangle, ChevronRight, Settings2, Edit3,
  ArrowRightLeft, Loader2
} from 'lucide-react';
import { AdminEmailOtpManager } from './AdminEmailOtpManager';
import { AdminDeliveryPartnersManager } from './AdminDeliveryPartnersManager';
import { SafeErrorBoundary } from './SafeErrorBoundary';
import { 
  DEFAULT_VILLAGE_DIRECTORY, 
  getCombinedVillageDirectory,
  DEFAULT_TEHSIL_DIRECTORY,
  getCombinedTehsils, 
  PRIMARY_TEHSILS 
} from '../data/villageDirectory';
import { formatWeightSlabLabel } from '../utils/deliveryCalculator';

// Default Distance Slabs matching Screenshot
const DEFAULT_FALLBACK_DISTANCE_SLABS: DistanceSlab[] = [
  { id: 'ds_0_10', minDistanceKm: 0, maxDistanceKm: 10, label: '0-10 किमी' },
  { id: 'ds_10_30', minDistanceKm: 10.001, maxDistanceKm: 30, label: '10-30 किमी' },
  { id: 'ds_30_50', minDistanceKm: 30.001, maxDistanceKm: 50, label: '30-50 किमी' },
  { id: 'ds_50_100', minDistanceKm: 50.001, maxDistanceKm: 100, label: '50-100 किमी' },
  { id: 'ds_100_plus', minDistanceKm: 100.001, maxDistanceKm: 99999, label: '100+ किमी' },
];

const POPULAR_VEHICLE_EMOJIS = ['🛵', '🏍️', '🛺', '🚜', '🛻', '🚚', '🚛', '🚲', '🚗', '🚐', '📦', '⚡'];

const AdminDeliveryManager: React.FC = () => {
  const { deliveryConfig, updateDeliveryConfig } = useAppContext();

  // Local draft state for editing
  const [config, setConfig] = useState<DynamicDeliveryConfig>(() => ({
    ...deliveryConfig,
    enableStorePickup: deliveryConfig.enableStorePickup !== false,
    enableLocalDelivery: deliveryConfig.enableLocalDelivery !== false,
    storeOrigin: { 
      name: deliveryConfig.storeOrigin?.name || 'फल्सावदिया कृषि बाजार, शामगढ़',
      address: deliveryConfig.storeOrigin?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़',
      city: deliveryConfig.storeOrigin?.city || 'शामगढ़',
      district: deliveryConfig.storeOrigin?.district || 'मंदसौर',
      state: deliveryConfig.storeOrigin?.state || 'मध्यप्रदेश',
      pincode: deliveryConfig.storeOrigin?.pincode || '458883',
      latitude: deliveryConfig.storeOrigin?.latitude || 24.1842,
      longitude: deliveryConfig.storeOrigin?.longitude || 75.6431,
    },
    pickupTimings: deliveryConfig.pickupTimings || 'प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक (08:00 AM – 08:00 PM)',
    pickupInstructions: deliveryConfig.pickupInstructions || 'कृपया दुकान पर आकर अपना ऑर्डर नंबर दिखाकर पैक किया हुआ सामान प्राप्त करें।',
    pickupPhone: deliveryConfig.pickupPhone || '8982338046',
    distanceSlabs: (deliveryConfig.distanceSlabs && deliveryConfig.distanceSlabs.length > 0)
      ? deliveryConfig.distanceSlabs
      : DEFAULT_FALLBACK_DISTANCE_SLABS,
    villageDirectory: (deliveryConfig.villageDirectory && deliveryConfig.villageDirectory.length > 0)
      ? deliveryConfig.villageDirectory
      : DEFAULT_VILLAGE_DIRECTORY,
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'rate_matrix' | 'villages' | 'store_pickup' | 'delivery_boys' | 'email_otp'>('rate_matrix');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state if context changes externally
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      ...deliveryConfig,
      enableStorePickup: deliveryConfig.enableStorePickup !== false,
      enableLocalDelivery: deliveryConfig.enableLocalDelivery !== false,
      storeOrigin: { 
        name: deliveryConfig.storeOrigin?.name || 'फल्सावदिया कृषि बाजार, शामगढ़',
        address: deliveryConfig.storeOrigin?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़',
        city: deliveryConfig.storeOrigin?.city || 'शामगढ़',
        district: deliveryConfig.storeOrigin?.district || 'मंदसौर',
        state: deliveryConfig.storeOrigin?.state || 'मध्यप्रदेश',
        pincode: deliveryConfig.storeOrigin?.pincode || '458883',
        latitude: deliveryConfig.storeOrigin?.latitude || 24.1842,
        longitude: deliveryConfig.storeOrigin?.longitude || 75.6431,
      },
      pickupTimings: deliveryConfig.pickupTimings || 'प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक (08:00 AM – 08:00 PM)',
      pickupInstructions: deliveryConfig.pickupInstructions || 'कृपया दुकान पर आकर अपना ऑर्डर नंबर दिखाकर पैक किया हुआ सामान प्राप्त करें।',
      pickupPhone: deliveryConfig.pickupPhone || '8982338046',
      distanceSlabs: (deliveryConfig.distanceSlabs && deliveryConfig.distanceSlabs.length > 0)
        ? deliveryConfig.distanceSlabs
        : DEFAULT_FALLBACK_DISTANCE_SLABS,
      villageDirectory: (deliveryConfig.villageDirectory && deliveryConfig.villageDirectory.length > 0)
        ? deliveryConfig.villageDirectory
        : (prev.villageDirectory && prev.villageDirectory.length > 0 ? prev.villageDirectory : DEFAULT_VILLAGE_DIRECTORY),
    }));
  }, [deliveryConfig]);

  // Village Directory Filter & Search state
  const [selectedTehsil, setSelectedTehsil] = useState<string>('all');
  const [villageSearch, setVillageSearch] = useState<string>('');

  // Vehicle Modal State (Add / Edit)
  const [editingVehicle, setEditingVehicle] = useState<VehicleConfig | null>(null);
  const [isNewVehicleModal, setIsNewVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<{
    id: string;
    name: string;
    shortName: string;
    icon: string;
    description: string;
    minWeightKg: number | string;
    maxWeightKg: number | string;
    maxCapacityKg?: number | string;
    isActive: boolean;
  }>({
    id: '',
    name: '',
    shortName: '',
    icon: '🚚',
    description: '',
    minWeightKg: 0,
    maxWeightKg: 50,
    isActive: true,
  });

  // Village Modal State (Add / Edit)
  const [editingVillage, setEditingVillage] = useState<VillageDeliveryEntry | null>(null);
  const [isNewVillageModal, setIsNewVillageModal] = useState(false);
  const [villageForm, setVillageForm] = useState<{
    id: string;
    nameHi: string;
    nameEn: string;
    tehsil: string;
    district: string;
    pincode: string;
    distanceKm: number | string;
    isActive: boolean;
  }>({
    id: '',
    nameHi: '',
    nameEn: '',
    tehsil: 'शामगढ़',
    district: 'मंदसौर',
    pincode: '458883',
    distanceKm: '',
    isActive: true,
  });

  // Dynamic Tehsil Management State
  const [showTehsilManagerModal, setShowTehsilManagerModal] = useState(false);
  const [editingTehsil, setEditingTehsil] = useState<TehsilEntry | null>(null);
  const [tehsilForm, setTehsilForm] = useState<{
    id: string;
    nameHi: string;
    nameEn: string;
    district: string;
    isActive: boolean;
  }>({
    id: '',
    nameHi: '',
    nameEn: '',
    district: 'मंदसौर',
    isActive: true,
  });
  const [tehsilActionMsg, setTehsilActionMsg] = useState<{ type: 'error' | 'success' | 'warning'; text: string } | null>(null);
  const [deletingTehsil, setDeletingTehsil] = useState<TehsilEntry | null>(null);
  const [reassignTargetTehsil, setReassignTargetTehsil] = useState<string>('अन्य');
  const [isTehsilActionLoading, setIsTehsilActionLoading] = useState<boolean>(false);
  const [villageToDelete, setVillageToDelete] = useState<VillageDeliveryEntry | null>(null);
  const [villageModalError, setVillageModalError] = useState<string | null>(null);

  // Vehicle Deletion State
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleConfig | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState<boolean>(false);
  const [vehicleDeleteError, setVehicleDeleteError] = useState<string | null>(null);

  // Active Tehsil list derived dynamically from config
  const currentTehsils: TehsilEntry[] = useMemo(() => {
    return getCombinedTehsils(config.tehsilDirectory);
  }, [config.tehsilDirectory]);

  // Calculate Tehsil counts for filter pills (matching screenshot)
  const tehsilStats = useMemo(() => {
    const list = config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;
    const counts: Record<string, number> = {};
    for (const v of list) {
      const t = v.tehsil || 'अन्य';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [config.villageDirectory]);

  // Filtered village list
  const filteredVillages = useMemo(() => {
    const list = config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;
    return list.filter((v) => {
      // Tehsil filter
      if (selectedTehsil !== 'all' && v.tehsil !== selectedTehsil) {
        return false;
      }
      // Search filter
      if (villageSearch.trim()) {
        const q = villageSearch.toLowerCase().trim();
        const matchesNameHi = v.nameHi.toLowerCase().includes(q);
        const matchesNameEn = (v.nameEn || '').toLowerCase().includes(q);
        const matchesPin = (v.pincode || '').includes(q);
        const matchesTehsil = (v.tehsil || '').toLowerCase().includes(q);
        if (!matchesNameHi && !matchesNameEn && !matchesPin && !matchesTehsil) {
          return false;
        }
      }
      return true;
    });
  }, [config.villageDirectory, selectedTehsil, villageSearch]);

  const validateConfig = (cfg: DynamicDeliveryConfig): string | null => {
    if (!cfg.storeOrigin.name.trim()) {
      return 'दुकान का नाम दर्ज करना अनिवार्य है।';
    }
    if (!cfg.storeOrigin.address.trim()) {
      return 'दुकान का पूरा पिकअप पता दर्ज करना अनिवार्य है।';
    }
    if (!cfg.storeOrigin.pincode.trim() || cfg.storeOrigin.pincode.trim().length !== 6) {
      return 'मान्य 6-अंकीय पिनकोड दर्ज करें।';
    }
    return null;
  };

  const handleSave = async (customConfig?: DynamicDeliveryConfig) => {
    const targetConfig = customConfig || config;
    const error = validateConfig(targetConfig);
    if (error) {
      setValidationError(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateDeliveryConfig(targetConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Save delivery config failed:", err);
      alert("सेटिंग्स सेव करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsSaving(false);
    }
  };

  // Matrix Cell Rate Change Handler
  const handleMatrixRateChange = (vehicleId: string, slabId: string, value: string) => {
    const num = parseFloat(value);
    const key = `${vehicleId}_${slabId}`;
    setConfig(prev => ({
      ...prev,
      rateMatrix: {
        ...prev.rateMatrix,
        [key]: isNaN(num) ? 0 : Math.max(0, num),
      }
    }));
  };

  // Toggle Vehicle Active
  const handleToggleVehicle = (vehicleId: string) => {
    setConfig(prev => {
      const updatedVehicles = prev.vehicles.map(v => 
        v.id === vehicleId ? { ...v, isActive: !v.isActive } : v
      );
      return { ...prev, vehicles: updatedVehicles };
    });
  };

  // Open Add Vehicle Modal
  const openAddVehicleModal = () => {
    setEditingVehicle(null);
    setIsNewVehicleModal(true);
    setVehicleForm({
      id: `vehicle_${Date.now()}`,
      name: '',
      shortName: '',
      icon: '🚚',
      description: '',
      minWeightKg: 0,
      maxWeightKg: 100,
      isActive: true,
    });
  };

  // Open Edit Vehicle Modal
  const openEditVehicleModal = (v: VehicleConfig) => {
    const ws = config.weightSlabs.find(w => w.vehicleId === v.id);
    let cleanShortName = v.shortName || '';
    if (cleanShortName.includes('(')) cleanShortName = cleanShortName.split('(')[0].trim();
    if (cleanShortName.includes('किग्रा')) cleanShortName = cleanShortName.replace(/[0-9.]+\s*[-–]\s*[0-9.]+\s*किग्रा/g, '').trim();

    setEditingVehicle(v);
    setIsNewVehicleModal(false);
    setVehicleForm({
      id: v.id,
      name: v.name,
      shortName: cleanShortName || v.name.split('(')[0].trim(),
      icon: v.icon || '🚚',
      description: v.description || '',
      minWeightKg: ws ? ws.minWeightKg : 0,
      maxWeightKg: ws ? ws.maxWeightKg : (v.maxCapacityKg || 50),
      isActive: v.isActive !== false,
    });
  };

  // Save Vehicle from Modal
  const handleSaveVehicleModal = () => {
    if (!vehicleForm.name.trim()) {
      alert('कृपया वाहन का नाम हिंदी में दर्ज करें।');
      return;
    }
    const minW = parseFloat(String(vehicleForm.minWeightKg));
    const maxW = parseFloat(String(vehicleForm.maxWeightKg));

    if (isNaN(minW) || minW < 0 || isNaN(maxW) || maxW <= minW) {
      alert('कृपया मान्य वजन सीमा (न्यूनतम < अधिकतम) दर्ज करें।');
      return;
    }

    let cleanShort = (vehicleForm.shortName.trim() || vehicleForm.name.trim()).split('(')[0].trim();
    if (cleanShort.includes('किग्रा')) cleanShort = cleanShort.replace(/[0-9.]+\s*[-–]\s*[0-9.]+\s*किग्रा/g, '').trim();

    const vehicleId = vehicleForm.id || `vehicle_${Date.now()}`;
    const newVehicle: VehicleConfig = {
      id: vehicleId,
      name: vehicleForm.name.trim(),
      shortName: cleanShort || 'Vehicle',
      icon: vehicleForm.icon.trim() || '🚚',
      description: vehicleForm.description.trim() || `${minW} से ${maxW} किग्रा ऑर्डर्स के लिए`,
      maxCapacityKg: maxW,
      isActive: vehicleForm.isActive,
      order: editingVehicle ? editingVehicle.order : config.vehicles.length + 1,
    };

    setConfig(prev => {
      let updatedVehicles: VehicleConfig[];
      if (isNewVehicleModal) {
        updatedVehicles = [...prev.vehicles, newVehicle];
      } else {
        updatedVehicles = prev.vehicles.map(v => v.id === vehicleId ? newVehicle : v);
      }

      // Sync weight slab with clean label
      const existingWsIndex = prev.weightSlabs.findIndex(w => w.vehicleId === vehicleId);
      const updatedWeightSlabs = [...prev.weightSlabs];
      const newWs: WeightSlab = {
        id: existingWsIndex >= 0 ? prev.weightSlabs[existingWsIndex].id : `ws_${vehicleId}`,
        vehicleId: vehicleId,
        minWeightKg: minW,
        maxWeightKg: maxW,
        label: formatWeightSlabLabel(minW, maxW),
      };

      if (existingWsIndex >= 0) {
        updatedWeightSlabs[existingWsIndex] = newWs;
      } else {
        updatedWeightSlabs.push(newWs);
      }

      // Initialize rateMatrix keys if new vehicle
      const updatedRateMatrix = { ...prev.rateMatrix };
      for (const slab of prev.distanceSlabs) {
        const key = `${vehicleId}_${slab.id}`;
        if (typeof updatedRateMatrix[key] !== 'number') {
          const basePrice = maxW <= 30 ? 40 : maxW <= 100 ? 60 : maxW <= 300 ? 100 : 200;
          updatedRateMatrix[key] = basePrice;
        }
      }

      return {
        ...prev,
        vehicles: updatedVehicles,
        weightSlabs: updatedWeightSlabs,
        rateMatrix: updatedRateMatrix,
      };
    });

    setEditingVehicle(null);
    setIsNewVehicleModal(false);
  };

  // Open Vehicle Delete Confirmation Modal (Replaces blocked window.confirm)
  const handleDeleteVehicle = (vehicleId: string) => {
    const vToDelete = config.vehicles.find(v => v.id === vehicleId);
    if (!vToDelete) return;
    setVehicleDeleteError(null);
    setVehicleToDelete(vToDelete);
  };

  // Permanently delete vehicle from Firebase Database, LocalStorage & IndexedDB
  const confirmDeleteVehicle = async (vehicleId: string) => {
    if (config.vehicles.length <= 1) {
      setVehicleDeleteError('कम से कम एक वाहन होना अनिवार्य है। आप अंतिम शेष वाहन को नहीं हटा सकते।');
      return;
    }

    setIsDeletingVehicle(true);
    setVehicleDeleteError(null);

    try {
      const updatedVehicles = config.vehicles.filter(v => v.id !== vehicleId);
      const updatedWeightSlabs = config.weightSlabs.filter(w => w.vehicleId !== vehicleId);

      // Clean up rateMatrix entries for this deleted vehicle
      const updatedRateMatrix: { [key: string]: number } = {};
      Object.entries(config.rateMatrix || {}).forEach(([k, val]) => {
        if (!k.startsWith(`${vehicleId}_`)) {
          updatedRateMatrix[k] = val;
        }
      });

      const updatedConfig: DynamicDeliveryConfig = {
        ...config,
        vehicles: updatedVehicles,
        weightSlabs: updatedWeightSlabs,
        rateMatrix: updatedRateMatrix,
        lastUpdated: Date.now(),
      };

      // Persist permanently to Firestore and sync local storage/context
      await updateDeliveryConfig(updatedConfig);
      setConfig(updatedConfig);

      if (editingVehicle?.id === vehicleId) {
        setEditingVehicle(null);
        setIsNewVehicleModal(false);
      }

      setVehicleToDelete(null);
    } catch (err: any) {
      console.error('Failed to permanently delete vehicle from Firestore:', err);
      setVehicleDeleteError(err?.message || 'वाहन हटाने में सर्वर त्रुटि आई। डेटा सुरक्षित है, कृपया पुनः प्रयास करें।');
    } finally {
      setIsDeletingVehicle(false);
    }
  };

  // Village Quick Distance Change
  const handleQuickDistanceChange = (villageId: string, newDistStr: string) => {
    const dist = parseFloat(newDistStr);
    if (isNaN(dist) || dist < 0) return;

    setConfig(prev => {
      const updated = (prev.villageDirectory || DEFAULT_VILLAGE_DIRECTORY).map(v => 
        v.id === villageId ? { ...v, distanceKm: dist } : v
      );
      return { ...prev, villageDirectory: updated };
    });
  };

  // Village Active Toggle
  const handleToggleVillageActive = (villageId: string) => {
    setConfig(prev => {
      const updated = (prev.villageDirectory || DEFAULT_VILLAGE_DIRECTORY).map(v => 
        v.id === villageId ? { ...v, isActive: !v.isActive } : v
      );
      return { ...prev, villageDirectory: updated };
    });
  };

  // Open Edit Village Modal
  const openEditVillage = (v: VillageDeliveryEntry) => {
    setEditingVillage(v);
    setIsNewVillageModal(false);
    setVillageForm({
      id: v.id,
      nameHi: v.nameHi,
      nameEn: v.nameEn || '',
      tehsil: v.tehsil || 'शामगढ़',
      district: v.district || 'मंदसौर',
      pincode: v.pincode || '458883',
      distanceKm: v.distanceKm,
      isActive: v.isActive !== false,
    });
  };

  // Open Add Village Modal
  const openAddVillage = () => {
    setEditingVillage(null);
    setIsNewVillageModal(true);
    setVillageForm({
      id: `village_${Date.now()}`,
      nameHi: '',
      nameEn: '',
      tehsil: selectedTehsil !== 'all' ? selectedTehsil : 'शामगढ़',
      district: 'मंदसौर',
      pincode: '458883',
      distanceKm: '',
      isActive: true,
    });
  };

  // Save Village from Modal
  const handleSaveVillageModal = () => {
    if (!villageForm.nameHi.trim()) {
      alert('कृपया गाँव का नाम हिंदी में दर्ज करें।');
      return;
    }
    const dist = parseFloat(String(villageForm.distanceKm));
    if (isNaN(dist) || dist < 0) {
      alert('कृपया मान्य सड़क दूरी (किमी) दर्ज करें।');
      return;
    }

    const newEntry: VillageDeliveryEntry = {
      id: villageForm.id || `village_${Date.now()}`,
      nameHi: villageForm.nameHi.trim(),
      nameEn: villageForm.nameEn.trim() || villageForm.nameHi.trim(),
      tehsil: villageForm.tehsil.trim(),
      district: villageForm.district.trim() || 'मंदसौर',
      pincode: villageForm.pincode.trim() || '458883',
      distanceKm: dist,
      isActive: villageForm.isActive,
    };

    setConfig(prev => {
      const current = prev.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;
      let nextList: VillageDeliveryEntry[];
      if (isNewVillageModal) {
        nextList = [newEntry, ...current];
      } else {
        nextList = current.map(v => v.id === newEntry.id ? newEntry : v);
      }
      return { ...prev, villageDirectory: nextList };
    });

    setEditingVillage(null);
    setIsNewVillageModal(false);
  };

  // Delete Village with in-modal confirmation (No window.confirm)
  const confirmDeleteVillage = async (villageId: string) => {
    const current = config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;
    const nextList = current.filter(v => v.id !== villageId);
    const updated = { ...config, villageDirectory: nextList };
    setConfig(updated);
    try {
      await updateDeliveryConfig(updated);
    } catch (err) {
      console.error('Failed to sync village deletion:', err);
    }
    setEditingVillage(null);
    setIsNewVillageModal(false);
    setVillageToDelete(null);
  };

  const handleDeleteVillage = (villageId: string) => {
    const current = config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;
    const found = current.find(v => v.id === villageId);
    if (found) {
      setVillageToDelete(found);
    } else {
      confirmDeleteVillage(villageId);
    }
  };

  // Tehsil CRUD Handlers
  const handleOpenAddTehsil = () => {
    setEditingTehsil(null);
    setTehsilForm({
      id: `tehsil_${Date.now()}`,
      nameHi: '',
      nameEn: '',
      district: 'मंदसौर',
      isActive: true,
    });
    setTehsilActionMsg(null);
    setShowTehsilManagerModal(true);
  };

  const handleOpenEditTehsil = (t: TehsilEntry) => {
    setEditingTehsil(t);
    setTehsilForm({
      id: t.id,
      nameHi: t.nameHi,
      nameEn: t.nameEn || '',
      district: t.district || 'मंदसौर',
      isActive: t.isActive !== false,
    });
    setTehsilActionMsg(null);
  };

  const handleSaveTehsil = async () => {
    if (!tehsilForm.nameHi.trim()) {
      setTehsilActionMsg({ type: 'error', text: 'कृपया तहसील का नाम हिंदी में दर्ज करें।' });
      return;
    }

    const trimmedHi = tehsilForm.nameHi.trim();
    const trimmedEn = tehsilForm.nameEn.trim() || trimmedHi;
    const trimmedDistrict = tehsilForm.district.trim() || 'मंदसौर';

    // Check duplicate name
    const isDuplicate = currentTehsils.some(
      t => t.id !== tehsilForm.id && (t.nameHi.toLowerCase() === trimmedHi.toLowerCase() || (t.nameEn && t.nameEn.toLowerCase() === trimmedEn.toLowerCase()))
    );
    if (isDuplicate) {
      setTehsilActionMsg({ type: 'error', text: `तहसील "${trimmedHi}" पहले से सूची में मौजूद है।` });
      return;
    }

    const newTehsil: TehsilEntry = {
      id: tehsilForm.id || `tehsil_${Date.now()}`,
      nameHi: trimmedHi,
      nameEn: trimmedEn,
      district: trimmedDistrict,
      isActive: tehsilForm.isActive,
      createdAt: editingTehsil?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const existingList = getCombinedTehsils(config.tehsilDirectory);
    let nextTehsils: TehsilEntry[];
    let nextVillages = config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;

    if (editingTehsil) {
      // If name changed, update village mapping so no village becomes an orphan
      const oldNameHi = editingTehsil.nameHi;
      if (oldNameHi !== trimmedHi) {
        nextVillages = nextVillages.map(v => v.tehsil === oldNameHi ? { ...v, tehsil: trimmedHi } : v);
      }
      nextTehsils = existingList.map(t => t.id === newTehsil.id ? newTehsil : t);
    } else {
      nextTehsils = [...existingList, newTehsil];
    }

    const updatedConfig: DynamicDeliveryConfig = {
      ...config,
      tehsilDirectory: nextTehsils,
      villageDirectory: nextVillages,
    };

    setConfig(updatedConfig);
    try {
      await updateDeliveryConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to sync tehsil to Firebase:', err);
    }

    setEditingTehsil(null);
    setTehsilForm({
      id: '',
      nameHi: '',
      nameEn: '',
      district: 'मंदसौर',
      isActive: true,
    });
    setTehsilActionMsg({ type: 'success', text: `तहसील "${trimmedHi}" सफलतापूर्वक सुरक्षित की गई।` });
  };

  // Open Delete Confirmation Dialog for a Tehsil
  const handleRequestDeleteTehsil = (tehsil: TehsilEntry) => {
    setDeletingTehsil(tehsil);
    // Find default alternative target tehsil that is not the one being deleted
    const otherTehsils = currentTehsils.filter(t => t.nameHi !== tehsil.nameHi);
    const defaultTarget = otherTehsils.find(t => t.nameHi === 'अन्य')?.nameHi || otherTehsils[0]?.nameHi || 'अन्य';
    setReassignTargetTehsil(defaultTarget);
    setTehsilActionMsg(null);
  };

  // Perform Tehsil Deletion (with optional village reassignment)
  const handleConfirmDeleteTehsil = async (reassignVillages: boolean = false) => {
    if (!deletingTehsil) return;
    setIsTehsilActionLoading(true);

    try {
      const targetTehsil = deletingTehsil;
      const existingTehsils = getCombinedTehsils(config.tehsilDirectory);
      const nextTehsils = existingTehsils.filter(t => t.id !== targetTehsil.id && t.nameHi !== targetTehsil.nameHi);
      
      let nextVillages = config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY;
      const attachedCount = tehsilStats[targetTehsil.nameHi] || 0;

      if (attachedCount > 0) {
        if (reassignVillages) {
          nextVillages = nextVillages.map(v => 
            v.tehsil === targetTehsil.nameHi ? { ...v, tehsil: reassignTargetTehsil } : v
          );
        } else {
          setTehsilActionMsg({
            type: 'error',
            text: `तहसील "${targetTehsil.nameHi}" से ${attachedCount} गाँव जुड़े हैं। कृपया गाँव स्थानांतरित करें या केवल निष्क्रिय करें।`
          });
          setIsTehsilActionLoading(false);
          return;
        }
      }

      const updatedConfig: DynamicDeliveryConfig = {
        ...config,
        tehsilDirectory: nextTehsils,
        villageDirectory: nextVillages,
      };

      setConfig(updatedConfig);
      await updateDeliveryConfig(updatedConfig);

      if (selectedTehsil === targetTehsil.nameHi) {
        setSelectedTehsil('all');
      }
      if (editingTehsil?.id === targetTehsil.id) {
        setEditingTehsil(null);
      }

      setDeletingTehsil(null);
      setTehsilActionMsg({
        type: 'success',
        text: attachedCount > 0 && reassignVillages
          ? `तहसील "${targetTehsil.nameHi}" हटा दी गई और ${attachedCount} गाँव "${reassignTargetTehsil}" में स्थानांतरित कर दिए गए।`
          : `तहसील "${targetTehsil.nameHi}" सफलतापूर्वक सूची से हटा दी गई है।`
      });
    } catch (err) {
      console.error('Failed to delete tehsil:', err);
      setTehsilActionMsg({
        type: 'error',
        text: 'तहसील हटाने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
      });
    } finally {
      setIsTehsilActionLoading(false);
    }
  };

  // Set Tehsil to Inactive Instead of Hard Delete
  const handleSetTehsilInactive = async (tehsil: TehsilEntry) => {
    setIsTehsilActionLoading(true);
    try {
      const existingTehsils = getCombinedTehsils(config.tehsilDirectory);
      const nextTehsils = existingTehsils.map(t => 
        (t.id === tehsil.id || t.nameHi === tehsil.nameHi) ? { ...t, isActive: false, updatedAt: Date.now() } : t
      );

      const updatedConfig: DynamicDeliveryConfig = {
        ...config,
        tehsilDirectory: nextTehsils,
      };

      setConfig(updatedConfig);
      await updateDeliveryConfig(updatedConfig);

      setDeletingTehsil(null);
      setTehsilActionMsg({
        type: 'success',
        text: `तहसील "${tehsil.nameHi}" को निष्क्रिय (Inactive) कर दिया गया है। यह ड्रॉपडाउन में नहीं दिखेगी, लेकिन पुराने गाँव सुरक्षित रहेंगे।`
      });
    } catch (err) {
      console.error('Failed to set tehsil inactive:', err);
      setTehsilActionMsg({
        type: 'error',
        text: 'स्थिति बदलने में समस्या आई।'
      });
    } finally {
      setIsTehsilActionLoading(false);
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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#4A3728]">
                स्थानीय डिलीवरी व दुकान पिकअप प्रबंधन
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Local Only System
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              शामगढ़, गरोठ, सुवासरा, सीतामऊ व आसपास के अधिकृत गाँवों के लिए रेट मैट्रिक्स और ग्राम डायरेक्टरी
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#2D5A27] text-white hover:bg-[#23461e] shadow-md shadow-emerald-900/10 text-xs font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                <Save className="w-4 h-4" /> बदलाव सुरक्षित करें (Save)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-black text-red-900">कृपया निम्नलिखित त्रुटि ठीक करें:</p>
            <p className="text-xs text-red-700 font-medium">{validationError}</p>
          </div>
        </div>
      )}

      {/* Delivery Operational Mode Status (Strictly Local Only & Store Pickup) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#2D5A27]" />
              डिलीवरी संचालन मोड (Delivery Operational Mode)
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              फल्सावदिया कृषि बाजार में ऑनलाइन ऑर्डरिंग, स्टोर पिकअप एवं स्थानीय वाहन डिलीवरी की स्थिति
            </p>
          </div>
          
          {/* Dynamic Status Badge matching actual combined operational state */}
          <span className={`text-[11px] font-black px-3.5 py-1.5 rounded-full border self-start sm:self-auto flex items-center gap-2 shadow-2xs ${
            config.enableStorePickup === false
              ? 'bg-red-50 text-red-800 border-red-200'
              : config.enableLocalDelivery === false
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-[#2D5A27] border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              config.enableStorePickup === false
                ? 'bg-red-600'
                : config.enableLocalDelivery === false
                ? 'bg-blue-600'
                : 'bg-emerald-600'
            }`} />
            {config.enableStorePickup === false
              ? 'ऑनलाइन ऑर्डरिंग सेवा: पूरी तरह बंद (Online Ordering Suspended)'
              : config.enableLocalDelivery === false
              ? 'सक्रिय मोड: केवल दुकान से स्वयं पिकअप (Store Pickup Only)'
              : 'सक्रिय मोड: स्टोर पिकअप + होम डिलीवरी (Online Ordering Active)'
            }
          </span>
        </div>

        {/* Master Switches Grid: Master Online Orders (Store Pickup), Subordinated Local Home Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Switch 1: Store Pickup = Master Online Ordering Switch */}
          <div className={`p-4 rounded-2xl border transition-all ${
            config.enableStorePickup !== false 
              ? 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs' 
              : 'bg-red-50/40 border-red-200/90'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-[#2D5A27] flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-gray-900">
                    दुकान से स्वयं पिकअप (Store Pickup)
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                    मास्टर स्विच (Master Switch)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    config.enableStorePickup !== false 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {config.enableStorePickup !== false ? "सक्रिय (ऑनलाइन ऑर्डर चालू)" : "बंद (पूरी ऑर्डरिंग बंद)"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  {config.enableStorePickup !== false 
                    ? "पूरे ऐप में ऑनलाइन ऑर्डरिंग चालू है। किसान फल्सावदिया कृषि बाजार दुकान से अपना ऑर्डर स्वयं पिकअप कर सकेंगे।"
                    : "पूरे ऐप में ऑनलाइन ऑर्डरिंग बंद है। किसान कार्ट व चेकआउट से कोई भी नया ऑनलाइन ऑर्डर दर्ज नहीं कर सकेंगे।"
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfig(prev => {
                    const nextVal = prev.enableStorePickup === false ? true : false;
                    return {
                      ...prev,
                      enableStorePickup: nextVal,
                      isDeliveryActive: nextVal,
                    };
                  });
                }}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  config.enableStorePickup !== false ? "bg-[#2D5A27]" : "bg-gray-300"
                }`}
                title="दुकान पिकअप व ऑनलाइन ऑर्डरिंग मास्टर टॉगल"
              >
                <span 
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    config.enableStorePickup !== false ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Switch 2: Local Home Delivery (Subordinated to Master Switch) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            config.enableStorePickup === false
              ? 'bg-gray-50/80 border-gray-200 opacity-80'
              : config.enableLocalDelivery !== false
              ? 'bg-blue-50/40 border-blue-200/90 shadow-2xs'
              : 'bg-gray-50/80 border-gray-200/80'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-gray-900">
                    घर तक स्थानीय डिलीवरी (Local Home Delivery)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    config.enableStorePickup === false
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : config.enableLocalDelivery !== false 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-gray-200 text-gray-600 border border-gray-300"
                  }`}>
                    {config.enableStorePickup === false 
                      ? "स्थगित (मास्टर स्विच बंद)"
                      : config.enableLocalDelivery !== false 
                      ? "सक्रिय (होम डिलीवरी चालू)" 
                      : "बंद (केवल स्टोर पिकअप)"
                    }
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  {config.enableStorePickup === false
                    ? "चेतावनी: मास्टर स्विच (दुकान पिकअप) बंद होने के कारण होम डिलीवरी भी निलंबित है।"
                    : config.enableLocalDelivery !== false
                    ? "डायरेक्टरी में अधिकृत व पंजीकृत गांवों में दुकान के वाहनों द्वारा सुरक्षित होम डिलीवरी उपलब्ध रहेगी।"
                    : "होम डिलीवरी बंद है। चेकआउट में केवल दुकान से स्वयं पिकअप विकल्प ही उपलब्ध रहेगा।"
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfig(prev => ({ 
                    ...prev, 
                    enableLocalDelivery: prev.enableLocalDelivery === false ? true : false 
                  }));
                }}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  config.enableLocalDelivery !== false ? "bg-[#2D5A27]" : "bg-gray-300"
                }`}
                title="स्थानीय होम डिलीवरी टॉगल"
              >
                <span 
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    config.enableLocalDelivery !== false ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Operational Rules Matrix Callout */}
        <div className="bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-100 text-xs text-gray-700 space-y-1.5">
          <div className="font-black text-emerald-950 flex items-center gap-1.5 text-xs">
            <Info className="w-4 h-4 text-[#2D5A27] shrink-0" />
            <span>व्यवस्था स्थिति नियम (Delivery Operational Logic Matrix):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
            <div className={`p-2.5 rounded-xl border transition-all ${
              config.enableStorePickup !== false && config.enableLocalDelivery !== false 
                ? 'bg-white border-emerald-300 font-bold text-emerald-950 shadow-2xs' 
                : 'bg-white/60 border-gray-200 text-gray-500'
            }`}>
              <span className="block text-[10px] text-emerald-700 font-bold mb-0.5">स्थिति 1 (पूर्ण सक्रिय)</span>
              ✓ पिकअप ON + होम डिलीवरी ON: दोनों सेवाएँ चालू (ऑनलाइन ऑर्डर + पिकअप + होम डिलीवरी)
            </div>
            <div className={`p-2.5 rounded-xl border transition-all ${
              config.enableStorePickup !== false && config.enableLocalDelivery === false 
                ? 'bg-white border-blue-300 font-bold text-blue-950 shadow-2xs' 
                : 'bg-white/60 border-gray-200 text-gray-500'
            }`}>
              <span className="block text-[10px] text-blue-700 font-bold mb-0.5">स्थिति 2 (केवल पिकअप)</span>
              ✓ पिकअप ON + होम डिलीवरी OFF: केवल दुकान से स्वयं पिकअप उपलब्ध
            </div>
            <div className={`p-2.5 rounded-xl border transition-all ${
              config.enableStorePickup === false 
                ? 'bg-white border-red-300 font-bold text-red-950 shadow-2xs' 
                : 'bg-white/60 border-gray-200 text-gray-500'
            }`}>
              <span className="block text-[10px] text-red-700 font-bold mb-0.5">स्थिति 3 (मास्टर स्विच बंद)</span>
              ✕ पिकअप OFF: पूरे ऐप में ऑनलाइन ऑर्डरिंग 100% बंद (होम डिलीवरी भी स्थगित)
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('rate_matrix')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'rate_matrix' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Truck className="w-4 h-4" /> रेट मैट्रिक्स (Rate Matrix)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('villages')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'villages' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MapPin className="w-4 h-4" /> ग्राम व दूरी डायरेक्टरी (Villages)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('store_pickup')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'store_pickup' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Store className="w-4 h-4" /> दुकान पिकअप विवरण (Store Details)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('delivery_boys')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'delivery_boys' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" /> डिलीवरी पार्टनर्स (Delivery Boys)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('email_otp')}
          className={`flex-1 min-w-[170px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'email_otp' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Mail className="w-4 h-4" /> ईमेल व सूचना (SMTP)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: RATE MATRIX (Matches Screenshots 2 & 3) */}
      {/* ========================================================================= */}
      {activeSection === 'rate_matrix' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#2D5A27]" />
                स्थानीय डिलीवरी रेट मैट्रिक्स (Local Delivery Rate Matrix)
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                वाहन क्षमता, वजन सीमा और दूरी स्लैब के आधार पर डिलीवरी शुल्क निर्धारित करें
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAddVehicleModal}
                className="px-3.5 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#23461e] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> नया वाहन जोड़ें (Add Vehicle)
              </button>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hidden sm:inline-block">
                ऑटोमैटिक बिलिंग गणना
              </span>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-200/80 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-64">
                    वाहन (VEHICLE) & स्थिति
                  </th>
                  <th className="py-3 px-4 w-48 text-center">
                    वजन सीमा (WEIGHT RANGE)
                  </th>
                  {config.distanceSlabs.map((slab) => (
                    <th key={slab.id} className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-gray-800">{slab.label}</span>
                        <span className="text-[9px] text-gray-400 font-medium lowercase">
                          {slab.minDistanceKm}-{slab.maxDistanceKm} KM
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-xs">
                {config.vehicles.map((vehicle) => {
                  const weightSlab = config.weightSlabs.find(w => w.vehicleId === vehicle.id);

                  return (
                    <tr key={vehicle.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Vehicle Column */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                            <span>{vehicle.icon || (vehicle.id === 'bike' ? '🛵' : '🚚')}</span>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-gray-900 text-xs">
                                {vehicle.name}
                              </span>
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-bold">
                                {vehicle.shortName}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium line-clamp-1">
                              {vehicle.description}
                            </p>
                          </div>

                          {/* Action Buttons: Edit, Delete, Active Toggle */}
                          <div className="flex items-center gap-1 ml-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditVehicleModal(vehicle)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="वाहन संपादित करें (Edit)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="वाहन हटाएं (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleVehicle(vehicle.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                vehicle.isActive 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {vehicle.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Weight Range Column */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditVehicleModal(vehicle)}
                          className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-emerald-50/70 border border-gray-200 hover:border-emerald-300 rounded-xl px-3 py-1.5 font-bold text-gray-700 text-xs transition-colors cursor-pointer"
                          title="वजन सीमा बदलने के लिए क्लिक करें"
                        >
                          <span>{weightSlab ? weightSlab.minWeightKg : 0}</span>
                          <span className="text-gray-400">-</span>
                          <span>{weightSlab ? weightSlab.maxWeightKg : vehicle.maxCapacityKg}</span>
                          <span className="text-[10px] text-gray-500 font-medium">kg</span>
                          <Pencil className="w-3 h-3 text-gray-400 ml-0.5" />
                        </button>
                      </td>

                      {/* Rate Inputs for each Distance Slab */}
                      {config.distanceSlabs.map((slab) => {
                        const matrixKey = `${vehicle.id}_${slab.id}`;
                        const currentRate = config.rateMatrix?.[matrixKey] ?? '';

                        return (
                          <td key={slab.id} className="py-4 px-4 text-center">
                            <div className="relative inline-block w-24">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={currentRate}
                                onChange={(e) => handleMatrixRateChange(vehicle.id, slab.id, e.target.value)}
                                placeholder="0"
                                className="w-full pl-6 pr-2 py-1.5 bg-white border border-gray-200 rounded-xl text-center font-black text-gray-800 text-xs focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none"
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

          <div className="pt-2 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100">
            <span>* किसी भी सेल में दर बदलने के बाद ऊपर दिए गए 'बदलाव सुरक्षित करें' बटन पर क्लिक करें।</span>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#23461e] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" /> दरें सुरक्षित करें
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: VILLAGE & DISTANCE DIRECTORY (Matches Screenshots 4 & 5) */}
      {/* ========================================================================= */}
      {activeSection === 'villages' && (
        <div className="space-y-4">
          {/* Filter Bar & Search Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2D5A27]" />
                  ग्राम व सड़क दूरी डायरेक्टरी (Village Directory)
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  फल्सावदिया कृषि बाजार से अधिकृत सड़क दूरी और डिलीवरी स्थिति प्रबंधित करें।
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTehsil(null);
                    setTehsilActionMsg(null);
                    setShowTehsilManagerModal(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-50 text-[#2D5A27] border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-black active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Settings2 className="w-4 h-4" /> तहसील प्रबंधित करें (Manage Tehsils)
                </button>

                <button
                  type="button"
                  onClick={openAddVillage}
                  className="px-4 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#23461e] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> नया गाँव जोड़ें (Add Village)
                </button>
              </div>
            </div>

            {/* Tehsil Filter Pills (Matching screenshot 5) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="font-bold text-gray-500 text-xs shrink-0 mr-1">
                तहसील:
              </span>

              <button
                type="button"
                onClick={() => setSelectedTehsil('all')}
                className={`px-3 py-1.5 rounded-full font-black text-xs transition-colors shrink-0 cursor-pointer ${
                  selectedTehsil === 'all'
                    ? 'bg-[#2D5A27] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                सभी ({(config.villageDirectory || DEFAULT_VILLAGE_DIRECTORY).length})
              </button>

              {currentTehsils.filter(t => t.isActive !== false && t.nameHi !== 'अन्य').map((t) => {
                const count = tehsilStats[t.nameHi] || 0;
                return (
                  <button
                    key={t.id || t.nameHi}
                    type="button"
                    onClick={() => setSelectedTehsil(t.nameHi)}
                    className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                      selectedTehsil === t.nameHi
                        ? 'bg-[#2D5A27] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t.nameHi} ({count})
                  </button>
                );
              })}
            </div>

            {/* Bilingual Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={villageSearch}
                onChange={(e) => setVillageSearch(e.target.value)}
                placeholder="गांव का नाम (हिंदी या अंग्रेजी) अथवा पिन कोड से खोजें... (e.g. Shamgarh, 458883)"
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]"
              />
              {villageSearch && (
                <button
                  type="button"
                  onClick={() => setVillageSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Village Cards List (Matching screenshot 5) */}
          <div className="space-y-3">
            {filteredVillages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6 space-y-3">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
                <h4 className="font-bold text-gray-700 text-sm">कोई गाँव नहीं मिला</h4>
                <p className="text-xs text-gray-400">खोज शब्द बदलें अथवा नया गाँव जोड़ें।</p>
              </div>
            ) : (
              filteredVillages.map((village) => (
                <div
                  key={village.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-3 hover:border-gray-300 transition-all"
                >
                  {/* Card Header: Village Name & Edit/Delete Icons */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-gray-900">
                        {village.nameHi} <span className="text-xs text-gray-500 font-semibold">({village.nameEn})</span>
                      </h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        तहसील: <span className="font-bold text-gray-700">{village.tehsil}</span> • पिन: <span className="font-bold text-gray-700">{village.pincode || '458883'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditVillage(village)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                        title="संपादित करें (Edit)"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVillage(village.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="हटाएं (Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Road Distance Input Box */}
                  <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-gray-800 block">
                        सड़क दूरी (Four-Wheeler Road):
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium block">
                        फल्सावदिया कृषि बाजार, शामगढ़ से दूरी।
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={village.distanceKm}
                        onChange={(e) => handleQuickDistanceChange(village.id, e.target.value)}
                        className="w-20 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl font-black text-gray-900 text-center text-xs outline-none focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]"
                      />
                      <span className="text-xs font-black text-gray-700">किमी</span>
                    </div>
                  </div>

                  {/* Card Footer: Active/Inactive Toggle Button (Exact match from screenshot 5) */}
                  <button
                    type="button"
                    onClick={() => handleToggleVillageActive(village.id)}
                    className={`w-full py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      village.isActive !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80'
                        : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {village.isActive !== false ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        डिलीवरी चालू (Active)
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-gray-400" />
                        डिलीवरी बंद (Inactive)
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: STORE PICKUP SETTINGS (Section 1 in previous view) */}
      {/* ========================================================================= */}
      {activeSection === 'store_pickup' && (
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5 sm:p-6 rounded-3xl border border-emerald-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#2D5A27]" />
                ग्राहक चेकआउट स्क्रीन पर ऐसा दिखेगा (Live Preview)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200">
                100% नि:शुल्क पिकअप
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm space-y-3.5 max-w-xl mx-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-800 shadow-2xs shrink-0">
                    <Store className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      दुकान से स्वयं पिकअप
                    </h3>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      {config.storeOrigin.name || 'फल्सावदिया कृषि बाजार, शामगढ़'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
                  ₹0 (नि:शुल्क)
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{config.storeOrigin.address || 'डिंपल चौराहा, शामगढ़'}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>सुबह 8:00 से रात 8:00 बजे</span>
                </div>
              </div>
            </div>
          </div>

          {/* Store Location Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <MapPin className="w-4 h-4 text-[#2D5A27]" />
              <h3 className="text-sm font-black text-gray-800">
                दुकान का पता व पिकअप विवरण (Store Pickup Location Details)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">दुकान का नाम (Store Name) *</label>
                <input
                  type="text"
                  value={config.storeOrigin.name}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, name: e.target.value } }))}
                  placeholder="फल्सावदिया कृषि बाजार, शामगढ़"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">पिनकोड (Pincode) *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={config.storeOrigin.pincode}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, pincode: e.target.value.replace(/\D/g, '') } }))}
                  placeholder="458883"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">शहर / कस्बा (City / Town)</label>
                <input
                  type="text"
                  value={config.storeOrigin.city}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, city: e.target.value } }))}
                  placeholder="शामगढ़"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">जिला (District)</label>
                <input
                  type="text"
                  value={config.storeOrigin.district}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, district: e.target.value } }))}
                  placeholder="मंदसौर"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-gray-700">दुकान का पूरा पता (Full Pickup Address) *</label>
                <input
                  type="text"
                  value={config.storeOrigin.address}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, address: e.target.value } }))}
                  placeholder="डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">दुकान खुलने का समय (Store Timings)</label>
                <input
                  type="text"
                  value={config.pickupTimings || ''}
                  onChange={e => setConfig(prev => ({ ...prev, pickupTimings: e.target.value }))}
                  placeholder="प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक (08:00 AM – 08:00 PM)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">पिकअप सहायता मोबाइल नंबर (Helpline / Phone)</label>
                <input
                  type="text"
                  value={config.pickupPhone || ''}
                  onChange={e => setConfig(prev => ({ ...prev, pickupPhone: e.target.value }))}
                  placeholder="8982338046"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-gray-700">किसान भाइयों के लिए पिकअप निर्देश (Customer Instructions Note)</label>
                <textarea
                  rows={3}
                  value={config.pickupInstructions || ''}
                  onChange={e => setConfig(prev => ({ ...prev, pickupInstructions: e.target.value }))}
                  placeholder="कृपया दुकान पर आकर अपना ऑर्डर नंबर दिखाकर पैक किया हुआ सामान प्राप्त करें।"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-6 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" /> सेटिंग्स सुरक्षित करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: DELIVERY BOYS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'delivery_boys' && (
        <SafeErrorBoundary fallbackTitle="डिलीवरी पार्टनर्स लोड करने में समस्या">
          <AdminDeliveryPartnersManager availableVehicles={config.vehicles} />
        </SafeErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: EMAIL SMTP & ORDER OTP MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'email_otp' && (
        <SafeErrorBoundary fallbackTitle="ईमेल व ऑर्डर OTP सेटिंग्स लोड करने में समस्या">
          <AdminEmailOtpManager />
        </SafeErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* EDIT / ADD VILLAGE MODAL (Matches Screenshot 4 exactly) */}
      {/* ========================================================================= */}
      {(editingVillage || isNewVillageModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#2D5A27]" />
                <h3 className="text-base font-black text-gray-900">
                  {isNewVillageModal ? 'नया गाँव जोड़ें' : 'गांव की जानकारी संपादित करें'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingVillage(null);
                  setIsNewVillageModal(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="space-y-3.5 text-xs">
              {/* Field 1: Village Hindi Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  गांव का नाम हिंदी में * (e.g. शामगढ़, खेड़ा)
                </label>
                <input
                  type="text"
                  value={villageForm.nameHi}
                  onChange={(e) => setVillageForm(prev => ({ ...prev, nameHi: e.target.value }))}
                  placeholder="उदा: फल्सावदिया"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              {/* Field 2: Village English Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Village Name in English (e.g. Shamgarh, Kheda)
                </label>
                <input
                  type="text"
                  value={villageForm.nameEn}
                  onChange={(e) => setVillageForm(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="e.g. Falsawdiya"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              {/* Field 3: Tehsil & District */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    तहसील *
                  </label>
                  <select
                    value={villageForm.tehsil}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const matched = currentTehsils.find(t => t.nameHi === selectedVal || t.nameEn === selectedVal);
                      setVillageForm(prev => ({
                        ...prev,
                        tehsil: selectedVal,
                        district: matched?.district || prev.district || 'Mandsaur',
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                  >
                    {currentTehsils.map((t) => (
                      <option
                        key={t.id || t.nameHi}
                        value={t.nameHi}
                        disabled={t.isActive === false && villageForm.tehsil !== t.nameHi}
                      >
                        {t.nameHi} {t.nameEn && t.nameEn !== t.nameHi ? `(${t.nameEn})` : ''} {t.isActive === false ? '• निष्क्रिय' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    जिला
                  </label>
                  <input
                    type="text"
                    value={villageForm.district}
                    onChange={(e) => setVillageForm(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Field 4: Pincode & Road Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    पिन कोड
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={villageForm.pincode}
                    onChange={(e) => setVillageForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    सड़क दूरी (Four-Wheeler Road किमी) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={villageForm.distanceKm}
                    onChange={(e) => setVillageForm(prev => ({ ...prev, distanceKm: e.target.value }))}
                    placeholder="0.8"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-black outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Field 5: Delivery Status Toggle Box (Matching screenshot 4) */}
              <div className="bg-gray-50/90 border border-gray-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-gray-800 text-xs">डिलीवरी स्थिति</h5>
                  <p className="text-[10px] text-gray-400">क्या इस गांव के पते पर ऑर्डर स्वीकार करने हैं?</p>
                </div>

                <button
                  type="button"
                  onClick={() => setVillageForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-colors border cursor-pointer ${
                    villageForm.isActive 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                >
                  {villageForm.isActive ? 'सक्रिय (चालू)' : 'निष्क्रिय (बंद)'}
                </button>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              {!isNewVillageModal ? (
                <button
                  type="button"
                  onClick={() => handleDeleteVillage(villageForm.id)}
                  className="px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> हटाएं
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingVillage(null);
                    setIsNewVillageModal(false);
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSaveVillageModal}
                  className="px-5 py-2.5 bg-[#2D5A27] text-white hover:bg-[#23461e] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> बदलाव सुरक्षित करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT / ADD VEHICLE MODAL */}
      {/* ========================================================================= */}
      {(editingVehicle || isNewVehicleModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#2D5A27]" />
                <h3 className="text-base font-black text-gray-900">
                  {isNewVehicleModal ? 'नया डिलीवरी वाहन जोड़ें' : 'वाहन की जानकारी संपादित करें'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingVehicle(null);
                  setIsNewVehicleModal(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="space-y-4 text-xs">
              {/* EMOJI PICKER SECTION */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-800">
                    वाहन का इमोजी / आइकॉन चुनें (Choose Vehicle Emoji) *
                  </label>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    क्लिक करके चुनें
                  </span>
                </div>

                {/* Popular Emojis Grid */}
                <div className="grid grid-cols-6 gap-2">
                  {POPULAR_VEHICLE_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setVehicleForm(prev => ({ ...prev, icon: emoji }))}
                      className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                        vehicleForm.icon === emoji
                          ? 'bg-white border-2 border-[#2D5A27] shadow-sm scale-105'
                          : 'bg-white/80 border border-gray-200 hover:bg-white hover:border-gray-300'
                      }`}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Emoji Input & Live Preview */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-300 flex items-center justify-center text-2xl shadow-xs shrink-0">
                    <span>{vehicleForm.icon || '🚚'}</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                      कस्टम इमोजी दर्ज करें (या पेस्ट करें):
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={vehicleForm.icon}
                      onChange={(e) => setVehicleForm(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="उदा: 🚜 या 🛻"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-center text-sm font-bold outline-none focus:border-[#2D5A27]"
                    />
                  </div>
                </div>
              </div>

              {/* Hindi Name & English Short Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    वाहन का नाम हिंदी में * (e.g. ट्रैक्टर, ई-रिक्शा)
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.name}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="उदा: ट्रैक्टर (Tractor)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    संक्षिप्त नाम (English Name) * (e.g. Tractor)
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.shortName}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, shortName: e.target.value }))}
                    placeholder="उदा: Tractor"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  संक्षिप्त विवरण (Description)
                </label>
                <input
                  type="text"
                  value={vehicleForm.description}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="उदा: भारी व हेवी ऑर्डर्स (300 से 500 किग्रा)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              {/* Weight Range Inputs (Min & Max Weight Only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    न्यूनतम वजन (Min kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={vehicleForm.minWeightKg}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, minWeightKg: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-black outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    अधिकतम वजन (Max kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={vehicleForm.maxWeightKg}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, maxWeightKg: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-black outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              {/* Status Toggle Box */}
              <div className="bg-gray-50/90 border border-gray-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-gray-800 text-xs">वाहन डिलीवरी स्थिति</h5>
                  <p className="text-[10px] text-gray-400">क्या इस वाहन को स्थानीय डिलीवरी के लिए सक्रिय रखना है?</p>
                </div>

                <button
                  type="button"
                  onClick={() => setVehicleForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-colors border cursor-pointer ${
                    vehicleForm.isActive 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                >
                  {vehicleForm.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                </button>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              {!isNewVehicleModal ? (
                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(vehicleForm.id)}
                  className="px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> वाहन हटाएं
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicle(null);
                    setIsNewVehicleModal(false);
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleSaveVehicleModal}
                  className="px-5 py-2.5 bg-[#2D5A27] text-white hover:bg-[#23461e] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> बदलाव सुरक्षित करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DYNAMIC TEHSIL MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {showTehsilManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#2D5A27] shadow-xs">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    तहसील मास्टर प्रबंधन (Tehsil Management)
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    गाँव डायरेक्टरी व चेकआउट के लिए तहसील सूची जोड़ें, बदलें या प्रबंधित करें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTehsilManagerModal(false);
                  setEditingTehsil(null);
                  setTehsilActionMsg(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification / Feedback Banner */}
            {tehsilActionMsg && (
              <div
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
                  tehsilActionMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : tehsilActionMsg.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tehsilActionMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{tehsilActionMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTehsilActionMsg(null)}
                  className="p-1 hover:bg-black/5 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Add / Edit Form Card */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  {editingTehsil ? (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-[#2D5A27]" />
                      तहसील संपादित करें: <span className="text-[#2D5A27]">{editingTehsil.nameHi}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-[#2D5A27]" />
                      नई तहसील जोड़ें (Add New Tehsil)
                    </>
                  )}
                </span>
                {editingTehsil && (
                  <button
                    type="button"
                    onClick={handleOpenAddTehsil}
                    className="text-[11px] font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer"
                  >
                    रद्द करें (नया जोड़ें)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    तहसील नाम (हिंदी में) *
                  </label>
                  <input
                    type="text"
                    value={tehsilForm.nameHi}
                    onChange={(e) => setTehsilForm(prev => ({ ...prev, nameHi: e.target.value }))}
                    placeholder="उदा: शामगढ़"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Tehsil Name (English) *
                  </label>
                  <input
                    type="text"
                    value={tehsilForm.nameEn}
                    onChange={(e) => setTehsilForm(prev => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="e.g. Shamgarh"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 font-semibold outline-none focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    जिला (District)
                  </label>
                  <input
                    type="text"
                    value={tehsilForm.district}
                    onChange={(e) => setTehsilForm(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="उदा: मंदसौर"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 font-semibold outline-none focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">स्थिति:</span>
                  <button
                    type="button"
                    onClick={() => setTehsilForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-colors border cursor-pointer ${
                      tehsilForm.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                  >
                    {tehsilForm.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                  </button>
                  <span className="text-[10px] text-gray-400">
                    {tehsilForm.isActive ? 'चेकआउट व गाँव फॉर्म में दिखेगी' : 'ड्रॉपडाउन में छिपी रहेगी'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTehsil}
                  className="px-4 py-2 bg-[#2D5A27] text-white hover:bg-[#23461e] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs self-end sm:self-auto"
                >
                  <Check className="w-4 h-4" />
                  {editingTehsil ? 'बदलाव सुरक्षित करें' : 'तहसील जोड़ें'}
                </button>
              </div>
            </div>

            {/* Existing Tehsils Master List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-800">
                  वर्तमान तहसील सूची ({currentTehsils.length})
                </h4>
                <span className="text-[11px] text-gray-500 font-medium">
                  क्लिक करके संपादित करें या स्थिति बदलें
                </span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                {currentTehsils.map((t) => {
                  const villageCount = tehsilStats[t.nameHi] || 0;
                  const isBeingEdited = editingTehsil?.id === t.id;

                  return (
                    <div
                      key={t.id || t.nameHi}
                      className={`p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors ${
                        isBeingEdited ? 'bg-emerald-50/40 border-l-4 border-[#2D5A27]' : ''
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-gray-900">
                            {t.nameHi}
                          </span>
                          <span className="text-xs text-gray-500 font-semibold">
                            ({t.nameEn})
                          </span>
                          {t.isActive === false ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
                              निष्क्रिय
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                              सक्रिय
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium">
                          जिला: <span className="font-semibold text-gray-700">{t.district}</span> •{' '}
                          <span className={villageCount > 0 ? 'text-[#2D5A27] font-bold' : 'text-gray-400'}>
                            {villageCount} गाँव पंजीकृत
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTehsil(t)}
                          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          title="तहसील संपादित करें"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteTehsil(t)}
                          className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 border ${
                            villageCount > 0
                              ? 'text-amber-700 bg-amber-50/70 border-amber-200 hover:bg-amber-100'
                              : 'text-red-600 bg-red-50/70 border-red-200 hover:bg-red-100'
                          }`}
                          title={
                            villageCount > 0
                              ? `तहसील हटाएं (${villageCount} गाँव पंजीकृत - सुरक्षित विलोपन)`
                              : 'तहसील हटाएं (Delete Tehsil)'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500 font-medium">
                * तहसील में किए गए बदलाव तुरंत चेकआउट और गाँव डायरेक्टरी में लागू हो जाएंगे।
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowTehsilManagerModal(false);
                  setEditingTehsil(null);
                  setTehsilActionMsg(null);
                  setDeletingTehsil(null);
                }}
                className="px-5 py-2.5 bg-gray-900 text-white hover:bg-black rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                पूर्ण (Done)
              </button>
            </div>

            {/* Inline / Overlay Delete Confirmation for Tehsil */}
            {deletingTehsil && (
              <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      (tehsilStats[deletingTehsil.nameHi] || 0) > 0 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {(tehsilStats[deletingTehsil.nameHi] || 0) > 0 ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <Trash2 className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-black text-gray-900">
                        {(tehsilStats[deletingTehsil.nameHi] || 0) > 0
                          ? `तहसील हटाना: ${deletingTehsil.nameHi}`
                          : `तहसील हटाएं: ${deletingTehsil.nameHi}`}
                      </h4>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        {deletingTehsil.nameEn ? `(${deletingTehsil.nameEn})` : ''} • जिला: {deletingTehsil.district}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isTehsilActionLoading}
                      onClick={() => setDeletingTehsil(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Case 1: Tehsil has 0 registered villages (Direct Safe Deletion) */}
                  {(tehsilStats[deletingTehsil.nameHi] || 0) === 0 ? (
                    <div className="space-y-4">
                      <div className="bg-red-50/80 border border-red-200 rounded-2xl p-3.5 text-xs text-red-900 leading-relaxed font-medium">
                        क्या आप निश्चित रूप से तहसील <span className="font-bold text-red-950">"{deletingTehsil.nameHi}"</span> को सूची से हटाना चाहते हैं? इस तहसील से कोई भी गाँव पंजीकृत नहीं है। यह स्थायी रूप से हट जाएगी।
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          disabled={isTehsilActionLoading}
                          onClick={() => setDeletingTehsil(null)}
                          className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          रद्द करें
                        </button>
                        <button
                          type="button"
                          disabled={isTehsilActionLoading}
                          onClick={() => handleConfirmDeleteTehsil(false)}
                          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isTehsilActionLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              हटाया जा रहा है...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              हाँ, तहसील हटाएं
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Case 2: Tehsil has registered villages (Reassign or Inactive) */
                    <div className="space-y-3.5">
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-amber-900 leading-relaxed">
                        <p className="font-black text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          इस तहसील से {tehsilStats[deletingTehsil.nameHi]} गाँव पंजीकृत हैं!
                        </p>
                        <p className="font-medium text-[11px] text-amber-800">
                          डायरेक्टरी और पतों की सुरक्षा के लिए, इन {tehsilStats[deletingTehsil.nameHi]} पंजीकृत गाँवों को किसी अन्य तहसील में स्थानांतरित करके इसे हटाया जा सकता है, अथवा इसे केवल निष्क्रिय (Inactive) किया जा सकता है।
                        </p>
                      </div>

                      {/* Reassignment Target Selector */}
                      <div className="space-y-1.5 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                        <label className="block text-[11px] font-bold text-gray-700">
                          इन {tehsilStats[deletingTehsil.nameHi]} गाँवों को किस तहसील में स्थानांतरित करें?
                        </label>
                        <select
                          value={reassignTargetTehsil}
                          onChange={(e) => setReassignTargetTehsil(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-[#2D5A27]"
                        >
                          {currentTehsils
                            .filter(t => t.nameHi !== deletingTehsil.nameHi)
                            .map(t => (
                              <option key={t.id || t.nameHi} value={t.nameHi}>
                                {t.nameHi} ({t.nameEn})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isTehsilActionLoading}
                          onClick={() => handleConfirmDeleteTehsil(true)}
                          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isTehsilActionLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              प्रक्रिया जारी है...
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              गाँव "{reassignTargetTehsil}" में भेजें और तहसील हटाएं
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isTehsilActionLoading}
                            onClick={() => handleSetTehsilInactive(deletingTehsil)}
                            className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer transition-colors"
                          >
                            केवल निष्क्रिय (Inactive) करें
                          </button>
                          <button
                            type="button"
                            disabled={isTehsilActionLoading}
                            onClick={() => setDeletingTehsil(null)}
                            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            रद्द करें
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Deletion Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-black text-gray-900">
                    वाहन हटाएं (Delete Vehicle)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeletingVehicle) {
                        setVehicleToDelete(null);
                        setVehicleDeleteError(null);
                      }
                    }}
                    disabled={isDeletingVehicle}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-black text-gray-900 text-sm">
                    {vehicleToDelete.name}
                  </span>
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-bold">
                    {vehicleToDelete.shortName}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    vehicleToDelete.isActive 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {vehicleToDelete.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Details Card */}
            {(() => {
              const weightSlab = config.weightSlabs.find(w => w.vehicleId === vehicleToDelete.id);
              return (
                <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-medium">वजन सीमा (Weight Range):</span>
                    <span className="font-bold text-gray-900">
                      {weightSlab ? `${weightSlab.minWeightKg} - ${weightSlab.maxWeightKg} kg` : `0 - ${vehicleToDelete.maxCapacityKg} kg`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-medium">अधिकतम भार क्षमता (Capacity):</span>
                    <span className="font-bold text-gray-900">{vehicleToDelete.maxCapacityKg} kg</span>
                  </div>
                  {vehicleToDelete.description && (
                    <div className="pt-1 border-t border-gray-200/60 text-[11px] text-gray-500 line-clamp-2">
                      {vehicleToDelete.description}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Safety Check: If only 1 vehicle exists in the entire system, show blocking notice */}
            {config.vehicles.length <= 1 ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-black text-red-900">यह वाहन हटाया नहीं जा सकता</p>
                  <p className="text-red-700 text-[11px] leading-relaxed">
                    सिस्टम में कम से कम 1 डिलीवरी वाहन होना अनिवार्य है। डिलीवरी गणना और स्थानीय डिलीवरी सेवा के लिए न्यूनतम एक वाहन आवश्यक है।
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Warning if deleting the last ACTIVE vehicle */}
                {config.vehicles.filter(v => v.isActive).length === 1 && vehicleToDelete.isActive && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-black text-amber-900">चेतावनी: एकमात्र सक्रिय (Active) वाहन</p>
                      <p className="text-amber-700 text-[11px] leading-relaxed">
                        यह वर्तमान में एकमात्र सक्रिय वाहन है। इसे हटाने पर होम डिलीवरी के लिए कोई भी सक्रिय वाहन नहीं बचेगा और ग्राहक केवल दुकान से पिकअप कर सकेंगे।
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-600 leading-relaxed">
                  क्या आप वाकई वाहन <strong>"{vehicleToDelete.name}"</strong> को हटाना चाहते हैं? यह वाहन और इससे जुड़े सभी <strong>रेट स्लैब (Rate Matrix)</strong> डेटाबेस से स्थायी रूप से हटा दिए जाएंगे।
                </p>
              </>
            )}

            {/* Server / Firebase Error Feedback */}
            {vehicleDeleteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="flex-1 font-medium">{vehicleDeleteError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setVehicleToDelete(null);
                  setVehicleDeleteError(null);
                }}
                disabled={isDeletingVehicle}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {config.vehicles.length <= 1 ? 'ठीक है, समझ गया' : 'रद्द करें'}
              </button>

              {config.vehicles.length > 1 && (
                <button
                  type="button"
                  onClick={() => confirmDeleteVehicle(vehicleToDelete.id)}
                  disabled={isDeletingVehicle}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeletingVehicle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>हटाया जा रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>हाँ, वाहन हटाएं</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Village Deletion Confirmation Modal */}
      {villageToDelete && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-black text-gray-900">
                  गाँव डायरेक्टरी से हटाएं
                </h4>
                <p className="text-xs text-gray-600 font-bold mt-0.5">
                  {villageToDelete.nameHi} ({villageToDelete.nameEn})
                </p>
                <p className="text-[11px] text-gray-400 font-medium">
                  तहसील: {villageToDelete.tehsil} • दूरी: {villageToDelete.distanceKm} किमी
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              क्या आप वाकई गाँव <strong>"{villageToDelete.nameHi}"</strong> को डायरेक्टरी से हटाना चाहते हैं?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVillageToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteVillage(villageToDelete.id)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                हाँ, गाँव हटाएं
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryManager;
