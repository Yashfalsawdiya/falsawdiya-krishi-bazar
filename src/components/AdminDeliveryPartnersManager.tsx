import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Phone, Mail, MapPin, 
  Truck, CheckCircle2, AlertCircle, Search, 
  Trash2, Pencil, X, Check, Clock, ShieldCheck,
  Power, PowerOff, Shield, RefreshCw
} from 'lucide-react';
import { DeliveryPartner, DeliveryPartnerAvailability, VehicleConfig } from '../types';
import { 
  fetchDeliveryPartners, 
  listenDeliveryPartners, 
  addDeliveryPartner, 
  updateDeliveryPartner, 
  deleteDeliveryPartner, 
  togglePartnerActiveStatus,
  updatePartnerAvailability
} from '../services/deliveryPartnerService';

interface AdminDeliveryPartnersManagerProps {
  availableVehicles?: VehicleConfig[];
}

export const AdminDeliveryPartnersManager: React.FC<AdminDeliveryPartnersManagerProps> = ({ availableVehicles }) => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'busy' | 'offline'>('all');

  // Modal State
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState<{
    id?: string;
    name: string;
    phone: string;
    email: string;
    vehicleType: string;
    vehicleTypeName: string;
    vehicleNumber: string;
    address: string;
    isActive: boolean;
    availabilityStatus: DeliveryPartnerAvailability;
  }>({
    name: '',
    phone: '',
    email: '',
    vehicleType: 'bike',
    vehicleTypeName: 'मोटरसाइकिल (Bike)',
    vehicleNumber: '',
    address: '',
    isActive: true,
    availabilityStatus: 'available',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = listenDeliveryPartners((list) => {
      setPartners(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      if (filterStatus !== 'all' && p.availabilityStatus !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesVehicle = (p.vehicleTypeName || '').toLowerCase().includes(q) || (p.vehicleNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesVehicle) return false;
      }
      return true;
    });
  }, [partners, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: partners.length,
      active: partners.filter(p => p.isActive).length,
      available: partners.filter(p => p.isActive && p.availabilityStatus === 'available').length,
      totalDelivered: partners.reduce((sum, p) => sum + (p.completedDeliveriesCount || 0), 0),
    };
  }, [partners]);

  const openAddModal = () => {
    setEditingPartner(null);
    setIsNewModalOpen(true);
    setFormError(null);
    const defaultVehicle = availableVehicles && availableVehicles.length > 0 ? availableVehicles[0] : null;
    setPartnerForm({
      name: '',
      phone: '',
      email: '',
      vehicleType: defaultVehicle?.id || 'bike',
      vehicleTypeName: defaultVehicle?.name || 'मोटरसाइकिल (Bike)',
      vehicleNumber: '',
      address: '',
      isActive: true,
      availabilityStatus: 'available',
    });
  };

  const openEditModal = (p: DeliveryPartner) => {
    setEditingPartner(p);
    setIsNewModalOpen(false);
    setFormError(null);
    setPartnerForm({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email || '',
      vehicleType: p.vehicleType || 'bike',
      vehicleTypeName: p.vehicleTypeName || 'वाहन',
      vehicleNumber: p.vehicleNumber || '',
      address: p.address || '',
      isActive: p.isActive,
      availabilityStatus: p.availabilityStatus || 'available',
    });
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) {
      setFormError('कृपया पार्टनर का पूरा नाम दर्ज करें।');
      return;
    }
    const cleanPhone = partnerForm.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('कृपया 10-अंकीय मान्य मोबाइल नंबर दर्ज करें।');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingPartner) {
        await updateDeliveryPartner({
          ...editingPartner,
          ...partnerForm,
          phone: cleanPhone,
        });
      } else {
        await addDeliveryPartner({
          ...partnerForm,
          phone: cleanPhone,
        });
      }

      setIsNewModalOpen(false);
      setEditingPartner(null);
    } catch (err: any) {
      setFormError(err.message || 'पार्टनर जानकारी सुरक्षित करने में समस्या आई।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (partnerId: string, name: string) => {
    if (!confirm(`क्या आप निश्चित रूप से "${name}" को डिलीवरी पार्टनर्स सूची से हटाना चाहते हैं?`)) {
      return;
    }
    const res = await deleteDeliveryPartner(partnerId);
    if (!res.success) {
      alert(res.error || 'डिलीवरी पार्टनर को हटाने में विफलता।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2D5A27]" />
            डिलीवरी पार्टनर्स प्रबंधन (Delivery Boys & Drivers)
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            स्थानीय आर्डर्स पहुँचाने वाले डिलीवरी बॉयज, ड्राइवर व उनके वाहनों का प्रबंधन
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-black hover:bg-[#23461e] active:scale-95 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <UserPlus className="w-4 h-4" /> नया डिलीवरी पार्टनर जोड़ें
        </button>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">कुल पार्टनर्स</span>
          <span className="text-xl font-black text-gray-900">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">सक्रिय (Active)</span>
          <span className="text-xl font-black text-emerald-700">{stats.active}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">उपलब्ध (Available)</span>
          <span className="text-xl font-black text-blue-700">{stats.available}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">डिलीवर किए ऑर्डर्स</span>
          <span className="text-xl font-black text-purple-800">{stats.totalDelivered}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Availability Status Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'available', 'busy', 'offline'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                  filterStatus === st 
                    ? 'bg-[#2D5A27] text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {st === 'all' && 'सभी'}
                {st === 'available' && 'उपलब्ध (Available)'}
                {st === 'busy' && 'कार्यरत (Busy)'}
                {st === 'offline' && 'ऑफलाइन (Offline)'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम, मोबाइल या गाड़ी नंबर..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#2D5A27]"
            />
          </div>
        </div>
      </div>

      {/* Partners Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && partners.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-white rounded-3xl border border-gray-100">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2D5A27] mx-auto" />
            <p className="text-xs text-gray-400 mt-2 font-medium">पार्टनर्स लोड हो रहे हैं...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 p-6 space-y-2">
            <Users className="w-10 h-10 text-gray-300 mx-auto" />
            <h4 className="font-bold text-gray-700 text-sm">कोई डिलीवरी पार्टनर नहीं मिला</h4>
            <p className="text-xs text-gray-400">खोज शब्द बदलें अथवा 'नया डिलीवरी पार्टनर जोड़ें' पर क्लिक करें।</p>
          </div>
        ) : (
          filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-xs space-y-3.5 hover:border-gray-300 transition-all text-xs"
            >
              {/* Partner Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#2D5A27] font-black text-sm shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-sm">
                      {partner.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                      {partner.vehicleTypeName} {partner.vehicleNumber ? `• ${partner.vehicleNumber}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(partner)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="संपादित करें"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(partner.id, partner.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="हटाएं"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details & Contacts */}
              <div className="bg-gray-50/70 p-3 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> मोबाइल:
                  </span>
                  <a href={`tel:${partner.phone}`} className="font-bold text-gray-800 hover:text-[#2D5A27]">
                    {partner.phone}
                  </a>
                </div>

                {partner.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> ईमेल:
                    </span>
                    <span className="font-semibold text-gray-700 truncate max-w-[200px]">
                      {partner.email}
                    </span>
                  </div>
                )}

                {partner.address && (
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-gray-100">
                    <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> पता:
                    </span>
                    <span className="text-gray-700 font-medium text-right line-clamp-1">
                      {partner.address}
                    </span>
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Availability Status Select */}
                <select
                  value={partner.availabilityStatus || 'available'}
                  onChange={(e) => updatePartnerAvailability(partner.id, e.target.value as DeliveryPartnerAvailability)}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[11px] text-gray-800 outline-none focus:border-[#2D5A27] cursor-pointer"
                >
                  <option value="available">🟢 उपलब्ध (Available)</option>
                  <option value="busy">🟡 कार्यरत (Busy / On Delivery)</option>
                  <option value="offline">⚪ ऑफलाइन (Offline)</option>
                </select>

                {/* Active Toggle Button */}
                <button
                  type="button"
                  onClick={() => togglePartnerActiveStatus(partner.id, !partner.isActive)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-colors border cursor-pointer ${
                    partner.isActive 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}
                >
                  {partner.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Partner Modal */}
      {(isNewModalOpen || editingPartner) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2D5A27]" />
                <h4 className="text-base font-black text-gray-900">
                  {isNewModalOpen ? 'नया डिलीवरी पार्टनर जोड़ें' : 'पार्टनर विवरण संपादित करें'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingPartner(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePartner} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  पूरा नाम (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="उदा: रमेश कुमार"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    मोबाइल नंबर (Phone) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    ईमेल (Email)
                  </label>
                  <input
                    type="email"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="partner@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    वाहन का प्रकार (Assigned Vehicle) *
                  </label>
                  <select
                    value={partnerForm.vehicleType}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const matched = availableVehicles?.find(v => v.id === vId);
                      setPartnerForm(prev => ({
                        ...prev,
                        vehicleType: vId,
                        vehicleTypeName: matched ? matched.name : vId,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                  >
                    {availableVehicles && availableVehicles.length > 0 ? (
                      availableVehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.icon ? `${v.icon} ` : ''}{v.name} ({v.shortName})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="bike">मोटरसाइकिल (Bike)</option>
                        <option value="e_rickshaw">ई-रिक्शा (E-Rickshaw)</option>
                        <option value="pickup">पिकअप (Pickup)</option>
                        <option value="tempo">छोटा हाथी (Tempo)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    गाड़ी नंबर (Vehicle Registration)
                  </label>
                  <input
                    type="text"
                    value={partnerForm.vehicleNumber}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                    placeholder="MP-14-AB-1234"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  निवास / पता (Address)
                </label>
                <input
                  type="text"
                  value={partnerForm.address}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="उदा: ग्राम फल्सावदिया, शामगढ़"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setEditingPartner(null);
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#2D5A27] text-white hover:bg-[#23461e] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
