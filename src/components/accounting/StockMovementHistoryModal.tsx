import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { StockMovementLog } from '../../types/accounting';
import {
  clearStockMovements,
  deleteStockMovement,
  fetchStockMovements,
} from '../../services/accountingService';
import { formatHindiDateTime } from '../../lib/dateUtils';

interface StockMovementHistoryModalProps {
  productId?: string;
  productName?: string;
  onClose: () => void;
}

const MOVEMENT_TYPE_LABELS: Record<
  StockMovementLog['type'],
  { label: string; badgeClass: string }
> = {
  opening: { label: 'ओपनिंग स्टॉक', badgeClass: 'bg-blue-100 text-blue-800' },
  purchase: { label: 'स्टॉक आवक (+)', badgeClass: 'bg-emerald-100 text-emerald-800' },
  pack_sale: { label: 'POS बिक्री (-)', badgeClass: 'bg-amber-100 text-amber-800' },
  loose_sale: { label: 'खुली बिक्री (-)', badgeClass: 'bg-sky-100 text-sky-800' },
  pack_opened: { label: 'पैक खुला', badgeClass: 'bg-purple-100 text-purple-800' },
  weighing_adjustment: { label: 'स्टॉक सुधार', badgeClass: 'bg-gray-100 text-gray-800' },
  damage: { label: 'क्षतिग्रस्त', badgeClass: 'bg-red-100 text-red-800' },
  expired_writeoff: { label: 'एक्सपायरी राइट-ऑफ़', badgeClass: 'bg-red-100 text-red-800' },
  return: { label: 'वापसी (+)', badgeClass: 'bg-emerald-100 text-emerald-800' },
  sale_reversal: { label: 'बिल वापसी (+)', badgeClass: 'bg-teal-100 text-teal-800' },
};

export const StockMovementHistoryModal: React.FC<StockMovementHistoryModalProps> = ({
  productId,
  productName,
  onClose,
}) => {
  const [logs, setLogs] = useState<StockMovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmSingleId, setConfirmSingleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchStockMovements(productId, 80)
      .then((data) => {
        if (active) setLogs(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  const handleDeleteSingle = async (id: string) => {
    setErrorMsg(null);
    setDeletingId(id);
    try {
      await deleteStockMovement(id);
      setLogs((prev) => prev.filter((item) => item.id !== id));
      setConfirmSingleId(null);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'हिस्ट्री रिकॉर्ड हटाने में त्रुटि हुई।'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setErrorMsg(null);
    setClearingAll(true);
    try {
      await clearStockMovements(productId);
      setLogs([]);
      setConfirmClearAll(false);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'सभी हिस्ट्री हटाने में त्रुटि हुई।'
      );
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-[#2D5A27]" />
              <span>स्टॉक मूवमेंट हिस्ट्री (Stock Audit Log)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {productName ? `उत्पाद: ${productName}` : 'सभी उत्पादों के हालिया स्टॉक व बैच बदलाव'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!loading && logs.length > 0 && !confirmClearAll && (
              <button
                type="button"
                onClick={() => {
                  setConfirmSingleId(null);
                  setConfirmClearAll(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                title="पूरी स्टॉक हिस्ट्री हटाएं"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>सभी हटाएं</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Confirm Clear All Banner */}
        {confirmClearAll && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-start gap-2 text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-black">
                  {productName
                    ? `"${productName}" की पूरी स्टॉक हिस्ट्री हटाएं?`
                    : 'सभी उत्पादों की पूरी स्टॉक हिस्ट्री हटाएं?'}
                </div>
                <div className="text-[11px] text-red-700">
                  इससे केवल हिस्ट्री लॉग साफ होगा; मौजूदा स्टॉक मात्रा पर कोई असर नहीं पड़ेगा।
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={clearingAll}
                onClick={() => setConfirmClearAll(false)}
                className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={clearingAll}
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {clearingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>हाँ, सभी हटाएं</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#2D5A27]" />
              <span>स्टॉक हिस्ट्री लोड हो रही है...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              अभी कोई स्टॉक मूवमेंट रिकॉर्ड उपलब्ध नहीं है।
            </div>
          ) : (
            logs.map((log) => {
              const meta = MOVEMENT_TYPE_LABELS[log.type] || {
                label: log.type,
                badgeClass: 'bg-gray-100 text-gray-700',
              };
              const isPackChange =
                log.quantityChangePacks !== undefined && log.quantityChangePacks !== 0;
              const isBaseChange =
                log.quantityChangeBaseUnit !== undefined &&
                log.quantityChangeBaseUnit !== 0;
              const isConfirming = confirmSingleId === log.id;
              const isDeleting = deletingId === log.id;

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl border border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <span className="font-extrabold text-gray-900 truncate">
                        {log.productName}
                      </span>
                      {log.variantLabel && (
                        <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {log.variantLabel}
                        </span>
                      )}
                      {log.batchNumber && (
                        <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                          बैच: {log.batchNumber}
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-gray-600 leading-snug">
                        {log.reason}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 font-mono">
                      {formatHindiDateTime(log.timestamp)}
                      {log.purchaseCostPerPack !== undefined && ` · खरीद दर: ₹${log.purchaseCostPerPack}`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right space-y-0.5">
                      {isPackChange && (
                        <div
                          className={`font-black text-xs flex items-center sm:justify-end gap-0.5 ${
                            (log.quantityChangePacks || 0) > 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {(log.quantityChangePacks || 0) > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {(log.quantityChangePacks || 0) > 0 ? '+' : ''}
                            {log.quantityChangePacks} पैक
                          </span>
                        </div>
                      )}
                      {isBaseChange && (
                        <div
                          className={`font-black text-xs flex items-center sm:justify-end gap-0.5 ${
                            (log.quantityChangeBaseUnit || 0) > 0
                              ? 'text-blue-700'
                              : 'text-rose-700'
                          }`}
                        >
                          <span>
                            {(log.quantityChangeBaseUnit || 0) > 0 ? '+' : ''}
                            {log.quantityChangeBaseUnit} ml/g
                          </span>
                        </div>
                      )}
                      {log.balancePacksAfter !== undefined && (
                        <div className="text-[10px] text-gray-500 font-semibold">
                          शेष पैक: <strong>{log.balancePacksAfter}</strong>
                        </div>
                      )}
                      {log.balanceBaseUnitAfter !== undefined && (
                        <div className="text-[10px] text-blue-700 font-semibold">
                          शेष खुला: <strong>{log.balanceBaseUnitAfter} ml/g</strong>
                        </div>
                      )}
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl p-1">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteSingle(log.id)}
                          className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'हट रहा...' : 'हटाएं'}
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => setConfirmSingleId(null)}
                          className="px-2 py-1 rounded-lg bg-white text-gray-600 hover:bg-gray-100 text-[10px] font-bold cursor-pointer"
                        >
                          नहीं
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmClearAll(false);
                          setConfirmSingleId(log.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                        title="यह हिस्ट्री रिकॉर्ड हटाएं"
                        aria-label="यह हिस्ट्री रिकॉर्ड हटाएं"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
