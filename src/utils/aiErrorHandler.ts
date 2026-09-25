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

  // 2. Invalid API Key
  if (
    errorString.includes('API_KEY_INVALID') || 
    (errorString.includes('400') && errorString.includes('invalid')) ||
    (errorString.includes('403') && errorString.includes('permission')) ||
    errorString.includes('invalid_argument')
  ) {
    return {
      type: 'key_invalid',
      message: 'कृपया अपनी API Key जांचें और सही Valid API Key दर्ज करें।',
      originalError: error
    };
  }

  // 3. Internet / Network Connectivity
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

  // 4. API limit / Quota exceeded
  if (
    errorString.includes('429') || 
    errorString.includes('RESOURCE_EXHAUSTED') || 
    errorString.includes('quota')
  ) {
    return {
      type: 'quota',
      message: 'Gemini API दैनिक कोटा या सर्वर व्यस्त है। सिस्टम स्वतः वैकल्पिक मॉडल से प्रयास कर रहा है, कृपया 10-15 सेकंड बाद पुनः जांचें।',
      originalError: error
    };
  }

  // 5. Server Issues
  if (
    errorString.includes('500') || 
    errorString.includes('SERVICE_UNAVAILABLE') || 
    errorString.includes('503') ||
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
