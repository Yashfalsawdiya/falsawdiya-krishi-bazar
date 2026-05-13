import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';
import PWAUpdater from './components/PWAUpdater';
import InstallPwaModal from './components/InstallPwaModal';
import BlockedScreen from './components/BlockedScreen';

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

// Simple loading fallback
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
    <p className="text-sm font-bold text-green-700">डेटा लोड हो रहा है, कृपया प्रतीक्षा करें...</p>
  </div>
);

function AppRoutes() {
  const { isBlocked, loading } = useAppContext();

  if (loading) return null;

  if (isBlocked) {
    return <BlockedScreen />;
  }

  return (
    <>
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
              <Route path="admin" element={<Admin />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
