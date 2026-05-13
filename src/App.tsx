import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import PWAUpdater from './components/PWAUpdater';
import InstallPwaModal from './components/InstallPwaModal';
import BlockedScreen from './components/BlockedScreen';
import { useAppContext } from './context/AppContext';

// Lazy load components
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

function AppRoutes() {
  const { isBlocked, loading } = useAppContext();

  if (loading) return <LoadingScreen />;

  if (isBlocked) {
    return <BlockedScreen />;
  }

  return (
    <>
      <PWAUpdater />
      <InstallPwaModal />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
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
