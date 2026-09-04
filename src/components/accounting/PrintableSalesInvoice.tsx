import React from 'react';
import { AccountingSale, AccountingSaleItem } from '../../types/accounting';

interface Props {
  sale: AccountingSale;
  customerOutstanding?: number;
}

export const PrintableSalesInvoice: React.FC<Props> = ({ sale, customerOutstanding = 0 }) => {
  const paymentModeText = 
    sale.paymentMode === 'cash' ? 'नकद (Cash)' :
    sale.paymentMode === 'online' ? 'ऑनलाइन (UPI)' :
    sale.paymentMode === 'split' ? 'नकद + UPI' : 'उधारी (Credit)';

  const paidAmount = (sale.cashPaid || 0) + (sale.onlinePaid || 0);

  return (
    <div 
      className="printable-sales-invoice-root bg-white text-gray-900 font-sans p-6 max-w-[794px] mx-auto box-border"
      style={{
        width: '100%',
        maxWidth: '794px',
        backgroundColor: '#ffffff',
        color: '#111827',
        boxSizing: 'border-box',
        fontSize: '12px',
        lineHeight: '1.4',
        pageBreakInside: 'avoid',
      }}
    >
      {/* 1. SHOP BRANDING & HEADER */}
      <div className="border-b-2 border-emerald-700 pb-3 mb-4 flex justify-between items-start">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <div>
              <h1 className="text-xl font-black text-emerald-900 tracking-tight leading-none">
                फल्सावदिया कृषि बाजार
              </h1>
              <span className="text-[11px] font-bold text-emerald-700">
                Falsawdiya Krishi Bazaar
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-emerald-800 pt-0.5">
            किसान का भरोसा, हमारी पहचान · उच्च गुणवत्ता कीटनाशक, बीज एवं उर्वरक
          </p>
          <p className="text-[11px] text-gray-600">
            डिंपल चौराहा, शामगढ़ (जिला मन्दसौर, म.प्र.) | पिन: 458883
          </p>
          <p className="text-[11px] text-gray-600 font-medium">
            संपर्क: <strong className="text-gray-900 font-bold">8982338046, 98260XXXXX</strong>
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-lg border border-emerald-300 uppercase tracking-wider mb-1">
            बिक्री बिल / SALES INVOICE
          </div>
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>
              बिल नंबर: <strong className="text-gray-900 font-bold font-mono">#{sale.invoiceNo}</strong>
            </p>
            <p>
              दिनांक: <strong className="text-gray-900 font-bold">{sale.date}</strong>
            </p>
            {sale.timestamp && (
              <p className="text-[10px] text-gray-500">
                समय: {new Date(sale.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. CUSTOMER & BILL META CARD */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
            ग्राहक का विवरण (Customer Details)
          </span>
          <p className="font-extrabold text-sm text-gray-900">
            {sale.customerName}
          </p>
          <p className="text-gray-700 text-[11px] mt-0.5">
            {sale.customerVillage && (
              <span>गाँव / कस्बा: <strong>{sale.customerVillage}</strong></span>
            )}
            {sale.customerVillage && sale.customerPhone && ' · '}
            {sale.customerPhone && (
              <span>मो: <strong>{sale.customerPhone}</strong></span>
            )}
          </p>
          {sale.note && (
            <p className="text-[11px] text-emerald-900 italic mt-1">
              टिप्पणी: {sale.note}
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
            भुगतान विवरण (Payment Info)
          </span>
          <p className="text-[11px] text-gray-700">
            भुगतान माध्यम:{' '}
            <strong className="text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
              {paymentModeText}
            </strong>
          </p>
          <p className="text-[11px] text-gray-700">
            बिल स्थिति:{' '}
            <strong className={sale.udhariAmount > 0 ? 'text-amber-800' : 'text-emerald-800'}>
              {sale.udhariAmount > 0 ? 'आंशिक उधारी बिल' : 'पूर्ण भुगतान सफल'}
            </strong>
          </p>
        </div>
      </div>

      {/* 3. PRODUCTS BREAKDOWN TABLE */}
      <div className="border border-gray-300 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-left border-collapse" style={{ width: '100%', fontSize: '11px' }}>
          <thead>
            <tr className="bg-emerald-800 text-white font-bold border-b border-gray-300">
              <th className="p-2 text-center w-8">#</th>
              <th className="p-2">सामान / उत्पाद का नाम</th>
              <th className="p-2 text-center w-20">मात्रा</th>
              <th className="p-2 text-right w-20">मूल भाव</th>
              <th className="p-2 text-right w-16">छूट</th>
              <th className="p-2 text-right w-20">शुद्ध दर</th>
              <th className="p-2 text-right w-24">कुल योग</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item: AccountingSaleItem, idx: number) => {
                const effectiveRate = item.effectiveSellingPrice ?? item.originalSellingPrice;
                const lineTotal = item.totalEffectiveAmount ?? (item.quantity * effectiveRate);
                const discount = item.bargainingDiscountShare || 0;

                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="p-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                    <td className="p-2">
                      <div className="font-bold text-gray-900 text-xs flex items-center flex-wrap gap-1">
                        <span>{item.hindiName || item.name}</span>
                        {item.variantLabel && (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                            {item.variantLabel}
                          </span>
                        )}
                        {item.saleType === 'loose' && (
                          <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            💧 खुला ({item.looseQuantity || item.quantity} {item.looseUnit || item.unit})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.hindiName && item.name && item.hindiName !== item.name && (
                          <span className="text-[10px] text-gray-500 font-medium leading-tight">
                            {item.name}
                          </span>
                        )}
                        {item.batchNumber && (
                          <span className="text-[9px] text-gray-400 font-mono">
                            बैच: {item.batchNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center font-bold text-gray-800">
                      {item.saleType === 'loose'
                        ? `${item.looseQuantity || item.quantity} ${item.looseUnit || item.unit}`
                        : `${item.quantity} ${item.unit}`}
                    </td>
                    <td className="p-2 text-right text-gray-600">
                      ₹{(item.originalSellingPrice || effectiveRate).toLocaleString()}
                    </td>
                    <td className="p-2 text-right text-emerald-700 font-bold">
                      {discount > 0 ? `-₹${discount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-2 text-right text-gray-900 font-bold">
                      ₹{effectiveRate.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-extrabold text-gray-900 text-xs">
                      ₹{lineTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500 font-medium">
                  कुल बिक्री राशि: ₹{sale.finalTotal.toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. CALCULATION & TOTALS SUMMARY */}
      <div className="grid grid-cols-12 gap-4 bg-gray-50 border border-gray-300 rounded-xl p-3 mb-4 text-xs">
        <div className="col-span-6 flex flex-col justify-between pr-2 border-r border-gray-200">
          <div className="space-y-1 text-[11px] text-gray-600">
            <p>
              <strong>बिल संदर्भ:</strong> #{sale.invoiceNo}
            </p>
            <p>
              <strong>दिनांक:</strong> {sale.date}
            </p>
            <div className="pt-2 text-[10px] text-gray-500 space-y-0.5">
              <p className="font-bold text-emerald-800">नियम व शर्तें:</p>
              <p>1. बीज व कीटनाशक का उपयोग कृषि विशेषज्ञ के परामर्शानुसार करें।</p>
              <p>2. यह कंप्यूटर द्वारा जनरेट किया गया अधिकृत बिक्री बिल है।</p>
            </div>
          </div>
        </div>

        <div className="col-span-6 pl-2 space-y-1 text-right">
          <div className="flex justify-between text-gray-600 text-xs">
            <span>उप-कुल (Subtotal):</span>
            <span className="font-bold text-gray-900">
              ₹{(sale.subtotal || sale.finalTotal).toLocaleString()}
            </span>
          </div>

          {sale.bargainingDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 text-xs font-bold">
              <span>मोलभाव / विशेष छूट:</span>
              <span>-₹{sale.bargainingDiscount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-black text-gray-900 border-t-2 border-gray-300 pt-1.5 pb-1">
            <span>अंतिम कुल बिल:</span>
            <span className="text-base text-emerald-900">
              ₹{sale.finalTotal.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-emerald-700 font-bold text-xs bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200">
            <span>जमा की गई राशि:</span>
            <span>₹{paidAmount.toLocaleString()}</span>
          </div>

          {sale.udhariAmount > 0 && (
            <div className="flex justify-between text-red-700 font-extrabold text-xs bg-red-50/80 px-2 py-0.5 rounded border border-red-200">
              <span>इस बिल पर उधारी:</span>
              <span>₹{sale.udhariAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-600 border-t border-gray-200 pt-1 mt-1">
            <span>किसान का वर्तमान कुल बकाया:</span>
            <span className={`font-extrabold ${customerOutstanding > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              ₹{customerOutstanding.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER & AUTHORIZED SIGNATURE */}
      <div className="flex justify-between items-end pt-4 border-t border-gray-200 text-xs text-gray-600">
        <div>
          <p className="font-medium text-[11px]">धन्यवाद! आपका दिन शुभ हो। फल्सावदिया कृषि बाजार में फिर पधारें।</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            प्रणाली: फल्सावदिया कृषि लेखा बही प्रबंधन प्रणाली
          </p>
        </div>

        <div className="text-center">
          <div className="w-40 border-b border-gray-400 mb-1"></div>
          <p className="font-extrabold text-gray-800 text-[11px]">
            वास्ते: फल्सावदिया कृषि बाजार
          </p>
          <p className="text-[10px] text-gray-500">
            अधिकृत हस्ताक्षर / मुहर
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrintableSalesInvoice;
