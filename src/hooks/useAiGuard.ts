import { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export const USER_GEMINI_API_KEY_STORAGE = 'falsawdiya_user_gemini_api_key';

/**
 * Returns the validated, user-specific Gemini API Key.
 * Checks Firestore userSettings first, then device-local storage fallback.
 * STRICT SECURITY: Never returns or falls back to any shared or central API keys.
 */
export function getStoredUserApiKey(userSettings?: { geminiApiKey?: string } | null): string {
  const profileKey = userSettings?.geminiApiKey?.trim();
  if (profileKey && profileKey.length > 5) {
    return profileKey;
  }
  if (typeof window !== 'undefined') {
    const cachedKey = localStorage.getItem(USER_GEMINI_API_KEY_STORAGE)?.trim();
    if (cachedKey && cachedKey.length > 5) {
      return cachedKey;
    }
  }
  return '';
}

/**
 * Centralized Hook to enforce User-Specific Gemini API Key across all AI features.
 * When a user attempts to execute an AI feature without their own key,
 * requireApiKey() blocks the execution and displays the "API Key आवश्यक है" Modal.
 */
export function useAiGuard() {
  const { userSettings, loading: appLoading } = useAppContext();
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyModalMessage, setApiKeyModalMessage] = useState<string | undefined>(undefined);

  const apiKey = useMemo(() => getStoredUserApiKey(userSettings), [userSettings?.geminiApiKey]);
  const hasApiKey = Boolean(apiKey && apiKey.length > 5);

  const openApiKeyModal = useCallback((customMessage?: string) => {
    setApiKeyModalMessage(customMessage);
    setIsApiKeyModalOpen(true);
  }, []);

  const closeApiKeyModal = useCallback(() => {
    setIsApiKeyModalOpen(false);
    setApiKeyModalMessage(undefined);
  }, []);

  /**
   * Central Guard Check:
   * Returns true if the user has their own valid API key configured.
   * If not configured, immediately blocks the action, opens the ApiKeyModal, and returns false.
   */
  const requireApiKey = useCallback((customMessage?: string): boolean => {
    const currentKey = getStoredUserApiKey(userSettings);
    if (!currentKey || currentKey.length <= 5) {
      openApiKeyModal(customMessage);
      return false;
    }
    return true;
  }, [userSettings, openApiKeyModal]);

  return {
    apiKey,
    hasApiKey,
    isApiKeyModalOpen,
    apiKeyModalMessage,
    openApiKeyModal,
    closeApiKeyModal,
    requireApiKey,
    appLoading
  };
}

export default useAiGuard;
