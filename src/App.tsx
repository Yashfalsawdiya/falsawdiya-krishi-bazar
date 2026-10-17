import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import PWAUpdater from './components/PWAUpdater';
import InstallPwaModal from './components/InstallPwaModal';
import FeatureGuard from './components/FeatureGuard';
import { Loader2 } from 'lucide-react';

// Resilient lazy loader to handle network glitches or stale chunk URLs gracefully
const safeLazy = (importFn: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('Dynamic import failed, retrying module load...', error);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return await importFn();
      } catch (retryError) {
        console.error('Module load failed after retry:', retryError);
        throw retryError;
      }
    }
  });

// Lazy load pages
const Home = safeLazy(() => import('./pages/Home'));
const Products = safeLazy(() => import('./pages/Products'));
const MandiBhav = safeLazy(() => import('./pages/MandiBhav'));
const DiseaseDetection = safeLazy(() => import('./pages/DiseaseDetection'));
const Weather = safeLazy(() => import('./pages/Weather'));
const Schemes = safeLazy(() => import('./pages/Schemes'));
const AgriNews = safeLazy(() => import('./pages/AgriNews'));
const SoilTesting = safeLazy(() => import('./pages/SoilTesting'));
const AgriCalculator = safeLazy(() => import('./pages/AgriCalculator'));
const Helpline = safeLazy(() => import('./pages/Helpline'));
const Encyclopedia = safeLazy(() => import('./pages/Encyclopedia'));
const EncyclopediaDetail = safeLazy(() => import('./pages/EncyclopediaDetail'));
const AiAgriExpert = safeLazy(() => import('./pages/AiAgriExpert'));
const AiProductKnowledge = safeLazy(() => import('./pages/AiProductKnowledge'));
const Admin = safeLazy(() => import('./pages/Admin'));
const Profile = safeLazy(() => import('./pages/Profile'));
const CartPage = safeLazy(() => import('./pages/CartPage'));
const AboutUs = safeLazy(() => import('./pages/AboutUs'));
const PrivacyPolicy = safeLazy(() => import('./pages/PrivacyPolicy'));
const TermsConditions = safeLazy(() => import('./pages/TermsConditions'));
const ReturnRefundPolicy = safeLazy(() => import('./pages/ReturnRefundPolicy'));
const AiDisclaimer = safeLazy(() => import('./pages/AiDisclaimer'));
const ContactUs = safeLazy(() => import('./pages/ContactUs'));
const ChemicalSafety = safeLazy(() => import('./pages/ChemicalSafety'));
const HelpFaq = safeLazy(() => import('./pages/HelpFaq'));
const ShippingDeliveryPolicy = safeLazy(() => import('./pages/ShippingDeliveryPolicy'));
const GrievanceRedressal = safeLazy(() => import('./pages/GrievanceRedressal'));
const LicensingDisclaimer = safeLazy(() => import('./pages/LicensingDisclaimer'));
const CheckoutPage = safeLazy(() => import('./pages/CheckoutPage'));
const MyOrdersPage = safeLazy(() => import('./pages/MyOrdersPage'));
const OrderDetailsPage = safeLazy(() => import('./pages/OrderDetailsPage'));
const DeliveryOrdersPage = safeLazy(() => import('./pages/DeliveryOrdersPage'));


const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-[#2D5A27]/10 rounded-full animate-pulse"></div>
      </div>
    </div>
    <div className="text-center">
      <p className="text-[#2D5A27] font-bold text-lg animate-pulse">कृषि साथी...</p>
      <p className="text-xs text-gray-400 font-medium">जानकारी लोड हो रही है</p>
    </div>
  </div>
);

export default function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <CartProvider>
        <SplashScreen />
        <PWAUpdater />
        <InstallPwaModal />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="products" element={<Products />} />
                <Route path="mandi" element={<FeatureGuard featureKey="mandi" featureTitle="मंडी भाव"><MandiBhav /></FeatureGuard>} />
                <Route path="disease" element={<FeatureGuard featureKey="disease" featureTitle="फसल रोग स्कैन"><DiseaseDetection /></FeatureGuard>} />
                <Route path="weather" element={<FeatureGuard featureKey="weather" featureTitle="मौसम पूर्वानुमान"><Weather /></FeatureGuard>} />
                <Route path="schemes" element={<FeatureGuard featureKey="schemes" featureTitle="सरकारी योजनाएं"><Schemes /></FeatureGuard>} />
                <Route path="news" element={<FeatureGuard featureKey="news" featureTitle="कृषि समाचार"><AgriNews /></FeatureGuard>} />
                <Route path="soil-testing" element={<FeatureGuard featureKey="soil_testing" featureTitle="मिट्टी परीक्षण मार्गदर्शिका"><SoilTesting /></FeatureGuard>} />
                <Route path="calculator" element={<FeatureGuard featureKey="calculator" featureTitle="कृषि कैलकुलेटर"><AgriCalculator /></FeatureGuard>} />
                <Route path="helpline" element={<FeatureGuard featureKey="helpline" featureTitle="हेल्पलाइन डायरेक्टरी"><Helpline /></FeatureGuard>} />
                <Route path="encyclopedia" element={<FeatureGuard featureKey="encyclopedia" featureTitle="कीट एवं रोग निर्देशिका"><Encyclopedia /></FeatureGuard>} />
                <Route path="encyclopedia/:id" element={<FeatureGuard featureKey="encyclopedia" featureTitle="कीट एवं रोग निर्देशिका"><EncyclopediaDetail /></FeatureGuard>} />
                <Route path="ai-call" element={<FeatureGuard featureKey="ai_call" featureTitle="AI कृषि विशेषज्ञ कॉल"><AiAgriExpert /></FeatureGuard>} />
                <Route path="ai-product-knowledge" element={<FeatureGuard featureKey="ai_product_knowledge" featureTitle="AI उत्पाद जानकारी"><AiProductKnowledge /></FeatureGuard>} />
                <Route path="admin" element={<Admin />} />
                <Route path="profile" element={<Profile />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="about" element={<AboutUs />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="terms" element={<TermsConditions />} />
                <Route path="refund-policy" element={<ReturnRefundPolicy />} />
                <Route path="returns" element={<ReturnRefundPolicy />} />
                <Route path="return-policy" element={<ReturnRefundPolicy />} />
                <Route path="cancellation-policy" element={<ReturnRefundPolicy />} />
                <Route path="legal/refund-policy" element={<ReturnRefundPolicy />} />
                <Route path="legal/returns" element={<ReturnRefundPolicy />} />
                <Route path="disclaimer" element={<AiDisclaimer />} />
                <Route path="ai-disclaimer" element={<AiDisclaimer />} />
                <Route path="contact" element={<ContactUs />} />
                <Route path="contact-us" element={<ContactUs />} />
                <Route path="safety-guidelines" element={<ChemicalSafety />} />
                <Route path="chemical-safety" element={<ChemicalSafety />} />
                <Route path="safety" element={<ChemicalSafety />} />
                <Route path="faq" element={<FeatureGuard featureKey="faq" featureTitle="FAQ सहायता व प्रश्नोत्तरी"><HelpFaq /></FeatureGuard>} />
                <Route path="help" element={<FeatureGuard featureKey="faq" featureTitle="FAQ सहायता व प्रश्नोत्तरी"><HelpFaq /></FeatureGuard>} />
                <Route path="help-center" element={<FeatureGuard featureKey="faq" featureTitle="FAQ सहायता व प्रश्नोत्तरी"><HelpFaq /></FeatureGuard>} />
                <Route path="faqs" element={<FeatureGuard featureKey="faq" featureTitle="FAQ सहायता व प्रश्नोत्तरी"><HelpFaq /></FeatureGuard>} />
                <Route path="shipping-policy" element={<ShippingDeliveryPolicy />} />
                <Route path="shipping" element={<ShippingDeliveryPolicy />} />
                <Route path="delivery-policy" element={<ShippingDeliveryPolicy />} />
                <Route path="delivery" element={<ShippingDeliveryPolicy />} />
                <Route path="grievance" element={<GrievanceRedressal />} />
                <Route path="grievance-redressal" element={<GrievanceRedressal />} />
                <Route path="grievance-officer" element={<GrievanceRedressal />} />
                <Route path="nodal-officer" element={<GrievanceRedressal />} />
                <Route path="licensing-disclaimer" element={<LicensingDisclaimer />} />
                <Route path="licensing" element={<LicensingDisclaimer />} />
                <Route path="license" element={<LicensingDisclaimer />} />
                <Route path="statutory-disclaimer" element={<LicensingDisclaimer />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="orders" element={<MyOrdersPage />} />
                <Route path="my-orders" element={<MyOrdersPage />} />
                <Route path="orders/:orderId" element={<OrderDetailsPage />} />
                <Route path="order/:orderId" element={<OrderDetailsPage />} />
                <Route path="delivery-orders" element={<DeliveryOrdersPage />} />
                <Route path="orders-for-delivery" element={<DeliveryOrdersPage />} />
                <Route path="delivery-boy" element={<DeliveryOrdersPage />} />
                <Route path="delivery-partner" element={<DeliveryOrdersPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AppProvider>
  </LanguageProvider>
  );
}
