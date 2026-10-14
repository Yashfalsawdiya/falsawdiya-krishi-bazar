import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { useFeatureToggle } from '../hooks/useFeatureToggle';

interface FeatureGuardProps {
  featureKey: string;
  featureTitle?: string;
  children: React.ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ 
  featureKey, 
  featureTitle = 'यह सुविधा', 
  children 
}) => {
  const { isEnabled, isAdmin, isHiddenForUsers } = useFeatureToggle(featureKey);

  // If user is regular farmer and feature is disabled
  if (!isEnabled && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {featureTitle} वर्तमान में अस्थायी रूप से बंद है
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
            यह सुविधा रखरखाव (Maintenance) या अपडेट के लिए वर्तमान में उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें।
          </p>
          <div className="space-y-2.5">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#2D5A27] text-white font-bold text-sm shadow-sm hover:bg-[#23471f] transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>होम पेज पर वापस जाएं</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If Admin is viewing a feature that is hidden from regular users
  return (
    <>
      {isAdmin && isHiddenForUsers && (
        <div className="bg-amber-500 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-xs sticky top-16 z-40 border-b border-amber-600">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>[एडमिन टेस्ट मोड] यह सुविधा सामान्य ग्राहकों के लिए बंद (HIDE) है। केवल आप इसे देख व टेस्ट कर सकते हैं।</span>
        </div>
      )}
      {children}
    </>
  );
};

export default FeatureGuard;
