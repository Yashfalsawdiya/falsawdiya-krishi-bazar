import { AccountingCustomer, CustomerLedgerEntry } from '../types/accounting';
import {
  triggerBlobDownload,
  shareFileOrDownloadFallback,
  openWhatsAppWithText,
  openSmsComposer,
  copyTextToClipboard,
} from './salesInvoiceShareUtils';

export {
  triggerBlobDownload,
  shareFileOrDownloadFallback,
  openWhatsAppWithText,
  openSmsComposer,
  copyTextToClipboard,
};

function formatLedgerEntryLine(entry: CustomerLedgerEntry, idx: number): string {
  const isDebit = entry.type === 'sale_debit';
  const title = isDebit
    ? 'सामान बिक्री'
    : `उधारी भुगतान (${entry.paymentMode || 'Cash'})`;
  const billRef = entry.invoiceNo ? ` [बिल #${entry.invoiceNo}]` : '';
  const signLabel = isDebit ? 'उधारी (+)' : 'जमा (-)';
  const amountStr = `₹${(entry.amount || 0).toLocaleString('en-IN')}`;
  const balanceStr = `₹${(entry.balanceAfter || 0).toLocaleString('en-IN')}`;
  const noteLine = entry.note && entry.note.trim() ? `\n   विवरण: ${entry.note.trim()}` : '';

  return `${idx + 1}. ${entry.date} | *${title}*${billRef}${noteLine}\n   ${signLabel}: ${amountStr} | शेष: ${balanceStr}`;
}

export function formatDetailedCustomerPassbookText(
  customer: AccountingCustomer,
  ledgerEntries: CustomerLedgerEntry[],
  options?: {
    maxEntries?: number;
  }
): string {
  const today = new Date().toLocaleDateString('hi-IN');
  const displayAccount = customer.accountNumber?.trim()
    ? customer.accountNumber.trim()
    : customer.id.slice(0, 6).toUpperCase();
  const isAllPaid = (customer.currentOutstanding || 0) === 0;
  const totalCount = ledgerEntries.length;
  const maxEntries = options?.maxEntries;

  const visibleEntries =
    maxEntries && totalCount > maxEntries
      ? ledgerEntries.slice(-maxEntries)
      : ledgerEntries;

  const entriesBlock =
    visibleEntries.length === 0
      ? 'अभी कोई लेनदेन दर्ज नहीं है।'
      : visibleEntries.map((entry, idx) => formatLedgerEntryLine(entry, idx)).join('\n');

  const lines: string[] = [
    '*फल्सावदिया कृषि बाजार*',
    'किसान का भरोसा, हमारी पहचान',
    'पता: डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर - (458883)',
    'संपर्क: 8982338046',
    '----------------------------------',
    '*ग्राहक खाता बही पासबुक*',
    `किसान का नाम: ${customer.name}`,
    `खाता संख्या: #${displayAccount}`,
    `गाँव / कस्बा: ${customer.village || 'शामगढ़'}`,
    `मोबाइल: ${customer.phone || 'उपलब्ध नहीं'}`,
    `दिनांक: ${today}`,
    `खाता स्थिति: ${isAllPaid ? 'खाता चुकता' : 'उधारी खाता चालू'}`,
    '----------------------------------',
    `कुल खरीद: ₹${(customer.totalPurchases || 0).toLocaleString('en-IN')}`,
    `कुल जमा राशि: ₹${(customer.totalPaid || 0).toLocaleString('en-IN')}`,
    `*वर्तमान शुद्ध बकाया: ₹${(customer.currentOutstanding || 0).toLocaleString('en-IN')}*`,
    '----------------------------------',
  ];

  if (maxEntries && totalCount > maxEntries) {
    lines.push(`*लेनदेन विवरण (अंतिम ${visibleEntries.length} / कुल ${totalCount}):*`);
    lines.push('(सभी पुराने लेनदेन की पूरी जानकारी पासबुक PDF में देखें)');
  } else {
    lines.push(`*लेनदेन विवरण (कुल ${totalCount}):*`);
  }

  lines.push(entriesBlock);
  lines.push('----------------------------------');
  lines.push('फल्सावदिया कृषि बाजार से जुड़ने के लिए धन्यवाद!');

  return lines.join('\n');
}

/**
 * Generates a concise Hindi summary tailored for mobile SMS URI length & Devanagari UCS-2 limits.
 */
export function formatCompactSmsCustomerPassbookText(
  customer: AccountingCustomer,
  ledgerEntries: CustomerLedgerEntry[]
): string {
  const displayAccount = customer.accountNumber?.trim()
    ? customer.accountNumber.trim()
    : customer.id.slice(0, 6).toUpperCase();
  const statusText = (customer.currentOutstanding || 0) === 0 ? 'खाता चुकता' : 'बकाया शेष';
  const latest = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1] : null;
  const latestLine = latest
    ? `\nअंतिम लेनदेन (${latest.date}): ${latest.type === 'sale_debit' ? 'खरीद +' : 'जमा -'}₹${(latest.amount || 0).toLocaleString('en-IN')}`
    : '';

  return (
    `फल्सावदिया कृषि बाजार (शामगढ़)\n` +
    `पासबुक सार: ${customer.name} (खाता #${displayAccount})\n` +
    `कुल खरीद: ₹${(customer.totalPurchases || 0).toLocaleString('en-IN')}\n` +
    `कुल जमा: ₹${(customer.totalPaid || 0).toLocaleString('en-IN')}\n` +
    `वर्तमान बकाया: ₹${(customer.currentOutstanding || 0).toLocaleString('en-IN')} (${statusText})` +
    latestLine +
    `\nसंपर्क: 8982338046`
  );
}
