import React, { useState, useEffect } from 'react';
import { 
  DeliveryPartner, 
  DeliveryPartnerAvailability, 
  VehicleConfig 
} from '../types';
import { 
  fetchDeliveryPartners, 
  listenDeliveryPartners, 
  addDeliveryPartner, 
  updateDeliveryPartner, 
  deleteDeliveryPartner, 
  togglePartnerActiveStatus, 
  updatePartnerAvailability 
} from '../services/deliveryPartnerService';
import { 
  Users, UserPlus, Phone, Mail, Truck, Edit3, Trash2, 
  CheckCircle2, XCircle, AlertCircle, Search, Filter, 
  Plus, Check, X, Shield, Clock, MapPin, ChevronRight, 
  RefreshCw, Power, Award, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AdminDeliveryPartnersManagerProps {
  availableVehicles?: VehicleConfig[];
}

export const AdminDeliveryPartnersManager: React.FC<AdminDeliveryPartnersManagerProps> = ({ availableVehicles }) => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'available' | 'on_delivery' | 'inactive'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');

  // Add / Edit Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<DeliveryPartner | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form draft state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formVehicleType, setFormVehicleType] = useState('bike');
  const [formVehicleTypeName, setFormVehicleTypeName] = useState('बाइक / मोटरसाइकिल (Bike)');
  const [formVehicleNumber, setFormVehicleNumber] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAvailability, setFormAvailability] = useState<DeliveryPartnerAvailability>('available');

  useEffect(() => {
    const unsubscribe = listenDeliveryPartners((list) => {
      setPartners(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const openAddModal = () => {
    setEditingPartner(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormVehicleType('bike');
    setFormVehicleTypeName('बाइक / मोटरसाइकिल (Bike)');
    setFormVehicleNumber('');
    setFormAddress('');
    setFormEmergencyPhone('');
    setFormNotes('');
    setFormIsActive(true);
    setFormAvailability('available');
    setIsAddModalOpen(true);
  };

  const openEditModal = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setFormName(partner.name);
    setFormPhone(partner.phone);
    setFormEmail(partner.email);
    setFormVehicleType(partner.vehicleType);
    setFormVehicleTypeName(partner.vehicleTypeName || partner.vehicleType);
    setFormVehicleNumber(partner.vehicleNumber || '');
    setFormAddress(partner.address || '');
    setFormEmergencyPhone(partner.emergencyPhone || '');
    setFormNotes(partner.notes || '');
    setFormIsActive(partner.isActive);
    setFormAvailability(partner.availabilityStatus);
    setIsAddModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showFeedback('कृपया डिलीवरी पार्टनर का नाम दर्ज करें।', 'error');
      return;
    }
    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showFeedback('कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।', 'error');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      showFeedback('कृपया वैध Gmail / ईमेल ID दर्ज करें (Google लॉगिन हेतु आवश्यक)।', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPartner) {
        await updateDeliveryPartner({
          ...editingPartner,
          name: formName.trim(),
          phone: cleanPhone,
          email: formEmail.trim().toLowerCase(),
          vehicleType: formVehicleType,
          vehicleTypeName: formVehicleTypeName,
          vehicleNumber: formVehicleNumber.trim().toUpperCase(),
          address: formAddress.trim(),
          emergencyPhone: formEmergencyPhone.replace(/\D/g, ''),
          notes: formNotes.trim(),
          isActive: formIsActive,
          availabilityStatus: formAvailability,
        });
        showFeedback('डिलीवरी पार्टनर की जानकारी सफलतापूर्वक अपडेट हुई।');
      } else {
        await addDeliveryPartner({
          name: formName.trim(),
          phone: cleanPhone,
          email: formEmail.trim().toLowerCase(),
          vehicleType: formVehicleType,
          vehicleTypeName: formVehicleTypeName,
          vehicleNumber: formVehicleNumber.trim().toUpperCase(),
          address: formAddress.trim(),
          emergencyPhone: formEmergencyPhone.replace(/\D/g, ''),
          notes: formNotes.trim(),
          isActive: formIsActive,
          availabilityStatus: formAvailability,
        });
        showFeedback('नया डिलीवरी पार्टनर सफलतापूर्वक जोड़ा गया!');
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      showFeedback('त्रुटि: डिलीवरी पार्टनर सेव नहीं हो सका।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!partnerToDelete) return;
    setIsSaving(true);
    setDeleteErrorMessage(null);
    const result = await deleteDeliveryPartner(partnerToDelete.id);
    setIsSaving(false);
    if (result.success) {
      setPartnerToDelete(null);
      showFeedback('डिलीवरी पार्टनर को सूची से हटा दिया गया है।');
    } else {
      setDeleteErrorMessage(result.error || 'डिलीवरी पार्टनर को हटाया नहीं जा सका।');
    }
  };

  // Filtered partners
  const filteredPartners = partners.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      p.name.toLowerCase().includes(q) || 
      p.phone.includes(q) || 
      p.email.toLowerCase().includes(q) || 
      (p.vehicleNumber && p.vehicleNumber.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'available' && (p.availabilityStatus !== 'available' || !p.isActive)) return false;
    if (statusFilter === 'on_delivery' && p.availabilityStatus !== 'on_delivery') return false;
    if (statusFilter === 'inactive' && p.isActive) return false;

    if (vehicleFilter !== 'all' && p.vehicleType !== vehicleFilter) return false;

    return true;
  });

  // Summary Metrics
  const totalCount = partners.length;
  const activeCount = partners.filter(p => p.isActive).length;
  const availableCount = partners.filter(p => p.isActive && p.availabilityStatus === 'available').length;
  const onDeliveryCount = partners.filter(p => p.availabilityStatus === 'on_delivery').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Feedback */}
      {feedbackMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm",
            feedbackMsg.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </motion.div>
      )}

      {/* Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold">कुल पार्टनर्स</span>
            <Users className="w-4 h-4 text-[#2D5A27]" />
          </div>
          <p className="text-2xl font-black text-gray-900">{totalCount}</p>
          <span className="text-[10px] text-gray-400 font-medium">पंजीकृत डिलीवरी बॉयज</span>
        </div>

        <div className="bg-white border border-emerald-100 p-4 rounded-3xl shadow-sm bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold">उपलब्ध (Ready)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-emerald-800">{availableCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">डिलीवरी लेने हेतु तैयार</span>
        </div>

        <div className="bg-white border border-blue-100 p-4 rounded-3xl shadow-sm bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold">डिलीवरी पर (Transit)</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-800">{onDeliveryCount}</p>
          <span className="text-[10px] text-blue-600 font-medium">रास्ते में सक्रिय</span>
        </div>

        <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold">सक्रिय (Active)</span>
            <Shield className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-800">{activeCount}</p>
          <span className="text-[10px] text-gray-400 font-medium">स्वीकृत डिलीवरी पार्टनर्स</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Add Button */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम, मोबाइल नं., Gmail या गाड़ी नंबर से खोजें..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#2D5A27]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Partner Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="bg-[#2D5A27] hover:bg-[#23461e] text-white px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ नया डिलीवरी पार्टनर जोड़ें</span>
          </button>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-50">
          <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> फ़िल्टर:
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={cn(
              "text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all",
              statusFilter === 'all' ? "bg-[#2D5A27] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            सभी ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('available')}
            className={cn(
              "text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5",
              statusFilter === 'available' ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            उपलब्ध ({availableCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('on_delivery')}
            className={cn(
              "text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5",
              statusFilter === 'on_delivery' ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            )}
          >
            डिलीवरी पर ({onDeliveryCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={cn(
              "text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all",
              statusFilter === 'inactive' ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            निष्क्रिय ({partners.filter(p => !p.isActive).length})
          </button>
        </div>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-gray-100">
          <RefreshCw className="w-6 h-6 text-[#2D5A27] animate-spin mr-2" />
          <span className="text-xs font-bold text-gray-500">पार्टनर्स लोड हो रहे हैं...</span>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-700">कोई डिलीवरी पार्टनर नहीं मिला</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'खोजे गए नाम या नंबर से कोई पार्टनर मेल नहीं खाता।' : 'डिलीवरी ऑर्डर्स सौंपने के लिए ऊपर दिए गए बटन से नया डिलीवरी बॉय जोड़ें।'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" /> + पहला पार्टनर जोड़ें
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPartners.map((partner) => {
            const isAvailable = partner.isActive && partner.availabilityStatus === 'available';
            const isOnDelivery = partner.availabilityStatus === 'on_delivery';

            return (
              <div
                key={partner.id}
                className={cn(
                  "bg-white rounded-3xl border p-5 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between",
                  !partner.isActive ? "border-gray-200 bg-gray-50/50 opacity-80" : "border-gray-100 hover:border-[#2D5A27]/30"
                )}
              >
                {/* Status Indicator Bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] font-black text-lg border border-[#2D5A27]/20">
                      {partner.vehicleType === 'truck' ? '🚛' : partner.vehicleType === 'pickup' ? '🛻' : partner.vehicleType === 'tempo' ? '🚚' : partner.vehicleType === 'e_rickshaw' ? '🛺' : '🛵'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-gray-900">{partner.name}</h3>
                        {!partner.isActive && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                            निष्क्रिय
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3 text-[#2D5A27]" />
                        <span>{partner.vehicleTypeName || partner.vehicleType}</span>
                        {partner.vehicleNumber && (
                          <span className="text-gray-400 font-mono">({partner.vehicleNumber})</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Availability Badge */}
                  <div className="flex flex-col items-end gap-1">
                    {partner.isActive ? (
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border",
                        isAvailable 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                          : isOnDelivery 
                          ? "bg-blue-50 text-blue-800 border-blue-200" 
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isAvailable ? "bg-emerald-500 animate-pulse" : isOnDelivery ? "bg-blue-500" : "bg-gray-400"
                        )}></span>
                        {isAvailable ? 'उपलब्ध (Ready)' : isOnDelivery ? 'डिलीवरी पर' : 'ऑफ ड्यूटी'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        अक्षम (Disabled)
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact & Assignment Stats */}
                <div className="space-y-2 py-3 border-y border-gray-50 my-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> मोबाइल:
                    </span>
                    <a
                      href={`tel:${partner.phone}`}
                      className="font-bold text-[#2D5A27] hover:underline"
                    >
                      +91 {partner.phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> Google Gmail:
                    </span>
                    <span className="font-mono text-gray-700 font-medium text-[11px] truncate max-w-[180px]">
                      {partner.email}
                    </span>
                  </div>

                  {partner.address && (
                    <div className="flex items-start justify-between text-xs pt-0.5">
                      <span className="text-gray-400 font-medium flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> पता:
                      </span>
                      <span className="text-gray-600 text-right text-[11px] truncate max-w-[200px]">
                        {partner.address}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 bg-gray-50/80 p-2 rounded-xl">
                    <span className="text-gray-500 font-bold">डिलीवरी रिकॉर्ड:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-blue-700 font-bold">
                        असाइन: <b>{partner.assignedOrdersCount || 0}</b>
                      </span>
                      <span className="text-emerald-700 font-bold">
                        सफल: <b>{partner.completedDeliveriesCount || 0}</b>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  {/* Quick Active/Inactive toggle */}
                  <button
                    type="button"
                    onClick={() => togglePartnerActiveStatus(partner.id, !partner.isActive)}
                    className={cn(
                      "text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1",
                      partner.isActive 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100" 
                        : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                    )}
                  >
                    <Power className="w-3 h-3" />
                    {partner.isActive ? 'सक्रिय है' : 'निष्क्रिय करें'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(partner)}
                      className="p-2 text-gray-600 hover:text-[#2D5A27] bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      title="एडिट करें"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">एडिट</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteErrorMessage(null);
                        setPartnerToDelete(partner);
                      }}
                      className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                      title="हटाएँ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT DELIVERY PARTNER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      {editingPartner ? 'डिलीवरी पार्टनर की जानकारी संपादित करें' : 'नया डिलीवरी पार्टनर जोड़ें'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">डिलीवरी और ऑर्डर असाइनमेंट हेतु क्रेडेंशियल्स</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePartner} className="p-6 space-y-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    डिलीवरी पार्टनर का नाम <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="उदा. राहुल पटेल, विकास शर्मा"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                  />
                </div>

                {/* Mobile Number & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      मोबाइल नंबर (10 अंक) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-3 py-2.5 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Google Gmail ID (लॉगिन हेतु) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="partner@gmail.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-mono text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      वाहन का प्रकार (Vehicle Type) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formVehicleType}
                      onChange={(e) => {
                        const vType = e.target.value;
                        setFormVehicleType(vType);
                        const found = availableVehicles?.find(v => v.id === vType);
                        if (found) {
                          setFormVehicleTypeName(`${found.name} (${found.shortName})`);
                        } else {
                          const labels: Record<string, string> = {
                            bike: 'बाइक / मोटरसाइकिल (Bike)',
                            e_rickshaw: 'ई-रिक्शा (E-Rickshaw)',
                            pickup: 'पिकअप / छोटा हाथी (Pickup)',
                            tempo: 'टेंपो / 407 (Tempo)',
                            truck: 'ट्रक / भारी वाहन (Truck)',
                          };
                          setFormVehicleTypeName(labels[vType] || vType);
                        }
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    >
                      {availableVehicles && availableVehicles.length > 0 ? (
                        availableVehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.icon} {v.name} ({v.shortName})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="bike">🛵 बाइक / मोटरसाइकिल (0-10 kg)</option>
                          <option value="e_rickshaw">🛺 ई-रिक्शा (10-50 kg)</option>
                          <option value="pickup">🛻 पिकअप / छोटा हाथी (50-500 kg)</option>
                          <option value="tempo">🚚 टेंपो / 407 (500-1500 kg)</option>
                          <option value="truck">🚛 ट्रक (1500+ kg)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      गाड़ी नंबर (Vehicle Number Plate)
                    </label>
                    <input
                      type="text"
                      value={formVehicleNumber}
                      onChange={(e) => setFormVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="उदा. MP-09-AB-1234"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-mono uppercase font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                {/* Address & Emergency Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      निवास स्थान / पता (Address)
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="ग्राम, तहसील, जिला"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      आपातकालीन संपर्क (Emergency Mobile)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formEmergencyPhone}
                      onChange={(e) => setFormEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="वैकल्पिक नंबर"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                    />
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800 block">सक्रिय स्थिति</span>
                      <span className="text-[10px] text-gray-400 block">Active / Inactive</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormIsActive(!formIsActive)}
                      className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded-xl transition-all",
                        formIsActive ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {formIsActive ? 'सक्रिय (ON)' : 'निष्क्रिय (OFF)'}
                    </button>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <label className="font-bold text-gray-800 block mb-1">उपलब्धता</label>
                    <select
                      value={formAvailability}
                      onChange={(e) => setFormAvailability(e.target.value as DeliveryPartnerAvailability)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 outline-none"
                    >
                      <option value="available">🟢 उपलब्ध (Ready)</option>
                      <option value="on_delivery">🚚 डिलीवरी पर (On Delivery)</option>
                      <option value="off_duty">⚪ ऑफ ड्यूटी (Off Duty)</option>
                    </select>
                  </div>
                </div>

                {/* Information Tip */}
                <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl flex items-start gap-2 text-blue-900 text-[11px] leading-relaxed font-medium">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    डिलीवरी पार्टनर जब इस Gmail ID से ऐप में लॉगिन करेगा, तो उसकी प्रोफाइल में सीधे <b>"डिलीवरी हेतु ऑर्डर (Orders for Delivery)"</b> का विशेष पोर्टल दिखाई देगा।
                  </span>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-[#2D5A27] hover:bg-[#23461e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{editingPartner ? 'अपडेट सुरक्षित करें' : 'डिलीवरी पार्टनर जोड़ें'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION POPUP */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {partnerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-gray-900">
                  क्या आप इस डिलीवरी पार्टनर को हटाना चाहते हैं?
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  डिलीवरी पार्टनर: <span className="font-bold text-gray-800">{partnerToDelete.name}</span> (+91 {partnerToDelete.phone})
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                  हटाने के बाद यह पार्टनर सक्रिय डिलीवरी सूची से हट जाएगा और भविष्य में ऑर्डर असाइन नहीं किया जा सकेगा।
                </p>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{deleteErrorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPartnerToDelete(null);
                    setDeleteErrorMessage(null);
                  }}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmDelete}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>हटाएँ</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDeliveryPartnersManager;
