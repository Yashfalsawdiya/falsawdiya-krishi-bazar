import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import PWAUpdater from './components/PWAUpdater';
import InstallPwaModal from './components/InstallPwaModal';
import ErrorBoundary from './components/ErrorBoundary';
import { Loader2, Sprout } from 'lucide-react';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const MandiBhav = lazy(() => import('./pages/MandiBhav'));
const DiseaseDetection = lazy(() => import('./pages/DiseaseDetection'));
const Weather = lazy(() => import('./pages/Weather'));
const Schemes = lazy(() => import('./pages/Schemes'));
const AgriNews = lazy(() => import('./pages/AgriNews'));
const SoilTesting = lazy(() => import('./pages/SoilTesting'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const AgriCalculator = lazy(() => import('./pages/AgriCalculator'));
const Helpline = lazy(() => import('./pages/Helpline'));
const CropCalendar = lazy(() => import('./pages/CropCalendar'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const EncyclopediaDetail = lazy(() => import('./pages/EncyclopediaDetail'));
const AiAgriExpert = lazy(() => import('./pages/AiAgriExpert'));

const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F5F2ED] min-h-[60vh]">
    <div className="relative">
      <Loader2 className="w-12 h-12 text-[#2D5A27] animate-spin" />
      <Sprout className="w-6 h-6 text-[#2D5A27] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />
    </div>
    <p className="mt-4 text-sm font-bold text-gray-400 font-sans tracking-tight">लोड हो रहा है...</p>
  </div>
);

export default function App() {
  return (
    <AppProvider>
      <SplashScreen />
      <PWAUpdater />
      <InstallPwaModal />
      <BrowserRouter>
        <ErrorBoundary>
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
                <Route path="admin" element={<Admin />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}
