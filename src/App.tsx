import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import PWAUpdater from './components/PWAUpdater';
import InstallPwaModal from './components/InstallPwaModal';
import { Loader2 } from 'lucide-react';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const MandiBhav = lazy(() => import('./pages/MandiBhav'));
const DiseaseDetection = lazy(() => import('./pages/DiseaseDetection'));
const Weather = lazy(() => import('./pages/Weather'));
const Schemes = lazy(() => import('./pages/Schemes'));
const AgriNews = lazy(() => import('./pages/AgriNews'));
const SoilTesting = lazy(() => import('./pages/SoilTesting'));
const AgriCalculator = lazy(() => import('./pages/AgriCalculator'));
const Helpline = lazy(() => import('./pages/Helpline'));
const CropCalendar = lazy(() => import('./pages/CropCalendar'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const EncyclopediaDetail = lazy(() => import('./pages/EncyclopediaDetail'));
const AiAgriExpert = lazy(() => import('./pages/AiAgriExpert'));
const AiProductKnowledge = lazy(() => import('./pages/AiProductKnowledge'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AgriTradeInfo = lazy(() => import('./pages/AgriTradeInfo'));

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
                <Route path="mandi" element={<MandiBhav />} />
                <Route path="disease" element={<DiseaseDetection />} />
                <Route path="weather" element={<Weather />} />
                <Route path="schemes" element={<Schemes />} />
                <Route path="news" element={<AgriNews />} />
                <Route path="soil-testing" element={<SoilTesting />} />
                <Route path="calculator" element={<AgriCalculator />} />
                <Route path="helpline" element={<Helpline />} />
                <Route path="calendar" element={<CropCalendar />} />
                <Route path="encyclopedia" element={<Encyclopedia />} />
                <Route path="encyclopedia/:id" element={<EncyclopediaDetail />} />
                <Route path="ai-call" element={<AiAgriExpert />} />
                <Route path="ai-product-knowledge" element={<AiProductKnowledge />} />
                <Route path="admin" element={<Admin />} />
                <Route path="profile" element={<Profile />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="agri-trade-info" element={<AgriTradeInfo />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AppProvider>
  );
}
