/**
 * AI Error Handler Utility
 * Maps technical Gemini API errors to user-friendly and farmer-friendly Hindi messages.
 */

export interface FriendlyError {
  message: string;
  type: 'key_missing' | 'key_invalid' | 'network' | 'quota' | 'server' | 'unknown';
  originalError?: any;
}

export const getFriendlyAiError = (error: any): FriendlyError => {
  let errorString = '';
  if (!error) {
    errorString = '';
  } else if (typeof error === 'string') {
    errorString = error;
  } else if (error?.message) {
    errorString = error.message;
  } else if (error?.error?.message) {
    errorString = error.error.message;
  } else if (error?.statusText) {
    errorString = error.statusText;
  } else {
    try {
      errorString = JSON.stringify(error);
    } catch {
      errorString = String(error);
    }
  }

  const lower = errorString.toLowerCase();
  
  // 1. Missing API Key
  if (
    lower.includes('gemini_key_not_set') || 
    lower.includes('api_key_missing') || 
    lower.includes('user_api_key_missing') ||
    lower.includes('api key not found') ||
    lower.includes('missing api key')
  ) {
    return {
      type: 'key_missing',
      message: '🔑 कृपया Profile में अपनी Gemini API Key जोड़ें।',
      originalError: error
    };
  }

  // 2. Invalid API Key
  if (
    lower.includes('api_key_invalid') || 
    lower.includes('invalid_api_key') ||
    (lower.includes('400') && lower.includes('invalid')) ||
    (lower.includes('403') && lower.includes('permission')) ||
    lower.includes('invalid_argument') ||
    lower.includes('api key not valid')
  ) {
    return {
      type: 'key_invalid',
      message: '⚠️ कृपया अपनी API Key जांचें और सही Valid API Key दर्ज करें।',
      originalError: error
    };
  }

  // 3. Internet / Network Connectivity
  if (
    (typeof navigator !== 'undefined' && !navigator.onLine) || 
    lower.includes('fetch') || 
    lower.includes('network error') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkrequestfailed')
  ) {
    return {
      type: 'network',
      message: '📡 इंटरनेट कनेक्शन उपलब्ध नहीं है। कृपया अपना नेटवर्क जांचें।',
      originalError: error
    };
  }

  // 4. API limit / Quota exceeded
  if (
    lower.includes('429') || 
    lower.includes('resource_exhausted') || 
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      type: 'quota',
      message: '⏳ आपकी Gemini API Usage Limit समाप्त हो गई है। कृपया बाद में पुनः प्रयास करें।',
      originalError: error
    };
  }

  // 5. Server Issues
  if (
    lower.includes('500') || 
    lower.includes('service_unavailable') || 
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('504') ||
    lower.includes('deadline exceeded')
  ) {
    return {
      type: 'server',
      message: '🚧 सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें।',
      originalError: error
    };
  }

  // Default fallback
  return {
    type: 'unknown',
    message: '🚧 कुछ तकनीकी समस्या हुई है। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    originalError: error
  };
};
