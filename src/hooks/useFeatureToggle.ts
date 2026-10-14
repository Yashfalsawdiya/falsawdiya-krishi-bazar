import { useAppContext } from '../context/AppContext';
import { ROUTE_TO_FEATURE_MAP } from '../config/features';

export function useFeatureToggle(featureKeyOrRoute?: string) {
  const { appContent, isAdmin } = useAppContext();
  
  const getFeatureKey = (keyOrRoute?: string): string => {
    if (!keyOrRoute) return '';
    if (ROUTE_TO_FEATURE_MAP[keyOrRoute]) {
      return ROUTE_TO_FEATURE_MAP[keyOrRoute];
    }
    return keyOrRoute;
  };

  const isFeatureEnabled = (keyOrRoute: string): boolean => {
    const key = getFeatureKey(keyOrRoute);
    if (!key) return true;
    // If explicitly set to false, it is hidden from users
    if (appContent?.featureToggles && appContent.featureToggles[key] === false) {
      return false;
    }
    // Default is enabled
    return true;
  };

  const canAccessFeature = (keyOrRoute: string): boolean => {
    if (isAdmin) return true; // Admin has permanent bypass
    return isFeatureEnabled(keyOrRoute);
  };

  const currentKey = getFeatureKey(featureKeyOrRoute);
  const isEnabled = currentKey ? isFeatureEnabled(currentKey) : true;
  const canAccess = currentKey ? canAccessFeature(currentKey) : true;
  const isHiddenForUsers = !isEnabled;

  return {
    isEnabled,
    canAccess,
    isAdmin,
    isHiddenForUsers,
    isFeatureEnabled,
    canAccessFeature,
    featureToggles: appContent?.featureToggles || {},
  };
}

export default useFeatureToggle;
