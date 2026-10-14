/**
 * Utility helper for WhatsApp product enquiries and support
 * Strictly uses professional Lucide icons and clean phone number formatting.
 */

export const getCleanWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '918982338046';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '918982338046';
  return clean.startsWith('91') && clean.length === 12 ? clean : `91${clean.slice(-10)}`;
};

export const openProductWhatsAppEnquiry = (
  productName: string,
  brand?: string,
  variantQuantity?: string,
  customId?: string,
  whatsappNumber?: string
) => {
  const phone = getCleanWhatsAppNumber(whatsappNumber);
  const details = [
    `नमस्ते फल्सावदिया कृषि बाजार,`,
    `मुझे निम्नलिखित उत्पाद की कीमत और उपलब्धता जाननी है:`,
    `• उत्पाद का नाम: ${productName}`,
    brand ? `• कंपनी (Brand): ${brand}` : null,
    variantQuantity ? `• मात्रा (Quantity/Pack): ${variantQuantity}` : null,
    customId ? `• उत्पाद कोड (ID): ${customId}` : null,
    `\nकृपया इसकी वर्तमान कीमत और उपलब्धता साझा करें। धन्यवाद!`
  ].filter(Boolean).join('\n');

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(details)}`;
  window.open(url, '_blank');
};
