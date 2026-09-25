/**
 * AI Error Handler Utility
 * Maps technical Gemini API errors to user-friendly and farmer-friendly Hindi messages.
 * Strictly adheres to Rule 4: NO EMOJIS IN UI - Professional text only.
 */

export interface FriendlyError {
  message: string;
  type: 'key_missing' | 'key_invalid' | 'network' | 'quota' | 'server' | 'permission_denied' | 'unknown';
  originalError?: any;
}

export const getFriendlyAiError = (error: any): FriendlyError => {
  const errorString = error?.message || String(error);
  
  const lowerStr = errorString.toLowerCase();

  // 1. Missing API Key
  if (
    errorString.includes('GEMINI_KEY_NOT_SET') || 
    errorString.includes('API_KEY_MISSING') || 
    errorString.includes('USER_API_KEY_MISSING')
  ) {
    return {
      type: 'key_missing',
      message: 'कृपया प्रोफाइल में अपनी Gemini API Key जोड़ें।',
      originalError: error
    };
  }

  // 2. High Demand / Server Overload (503 / UNAVAILABLE) - VERY COMMON DURING EVENING/NIGHT PEAK US HOURS
  if (
    errorString.includes('503') ||
    errorString.includes('UNAVAILABLE') ||
    lowerStr.includes('high demand') ||
    lowerStr.includes('spikes in demand') ||
    lowerStr.includes('service unavailable') ||
    lowerStr.includes('temporarily unavailable')
  ) {
    return {
      type: 'server',
      message: 'Google AI सर्वर पर इस समय भारी ट्रैफिक (High Demand) है। आपकी API Key बिल्कुल सही है, कृपया 1-2 मिनट बाद पुनः प्रयास करें।',
      originalError: error
    };
  }

  // 3. API limit / Quota exceeded (429 / RESOURCE_EXHAUSTED)
  if (
    errorString.includes('429') || 
    errorString.includes('RESOURCE_EXHAUSTED') || 
    lowerStr.includes('quota') ||
    lowerStr.includes('resource_exhausted') ||
    lowerStr.includes('rate limit')
  ) {
    return {
      type: 'quota',
      message: 'दैनिक फ्री कोटा समाप्त: आपकी Key का आज का कोटा पूरा हो चुका है। यह भारतीय समयानुसार दोपहर 12:30 बजे (Midnight PT) स्वतः रीसेट हो जाएगा।',
      originalError: error
    };
  }

  // 4. Invalid API Key - STRICT MATCH ONLY (Never misclassify quota or server load as invalid key)
  if (
    errorString.includes('API_KEY_INVALID') || 
    lowerStr.includes('api key not valid') ||
    lowerStr.includes('api_key_invalid') ||
    (lowerStr.includes('api key') && (lowerStr.includes('not found') || lowerStr.includes('invalid') || lowerStr.includes('expired')))
  ) {
    return {
      type: 'key_invalid',
      message: 'कृपया अपनी API Key जांचें। Google AI Studio से सही Valid API Key दर्ज करें।',
      originalError: error
    };
  }

  // 5. Internet / Network Connectivity
  if (
    !navigator.onLine || 
    errorString.includes('fetch') || 
    errorString.includes('Network Error') ||
    errorString.includes('Failed to fetch')
  ) {
    return {
      type: 'network',
      message: 'इंटरनेट कनेक्शन उपलब्ध नहीं है। कृपया अपना नेटवर्क जांचें।',
      originalError: error
    };
  }

  // 6. General Server Issues
  if (
    errorString.includes('500') || 
    errorString.includes('deadline exceeded')
  ) {
    return {
      type: 'server',
      message: 'AI सेवा अस्थायी रूप से व्यस्त है। कृपया कुछ क्षण बाद पुनः प्रयास करें।',
      originalError: error
    };
  }

  // 6. Media / Microphone Permission
  if (
    errorString.includes('NotAllowedError') ||
    errorString.includes('PermissionDeniedError') ||
    errorString.includes('Permission denied') ||
    errorString.includes('permission denied')
  ) {
    return {
      type: 'permission_denied',
      message: 'माइक या कैमरा एक्सेस की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में जाकर अनुमति दें।',
      originalError: error
    };
  }

  // Default fallback
  return {
    type: 'unknown',
    message: 'कुछ तकनीकी समस्या हुई है। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    originalError: error
  };
};
