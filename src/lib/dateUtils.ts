// Universal Hindi date & time formatting helper
// Ensures full Hindi month names (e.g. "अगस्त" instead of abbreviated "अग॰") across all platforms

export const HINDI_MONTHS = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर'
];

/**
 * Formats a timestamp / date into a clean Hindi date string with full month name.
 * Example: "26 अगस्त 2026, 04:30 PM" or "26 अगस्त 2026"
 */
export const formatFullHindiDate = (
  timestamp: number | string | Date,
  includeTime: boolean = true
): string => {
  try {
    const date = typeof timestamp === 'object' && timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp);

    if (isNaN(date.getTime())) {
      return String(timestamp || '');
    }

    const day = date.getDate();
    const month = HINDI_MONTHS[date.getMonth()];
    const year = date.getFullYear();

    if (!includeTime) {
      return `${day} ${month} ${year}`;
    }

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');

    return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return new Date(timestamp).toLocaleString();
  }
};
