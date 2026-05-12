import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import MandiBhav from './pages/MandiBhav';
import DiseaseDetection from './pages/DiseaseDetection';
import Weather from './pages/Weather';
import Schemes from './pages/Schemes';
import AgriNews from './pages/AgriNews';
import SoilTesting from './pages/SoilTesting';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import AgriCalculator from './pages/AgriCalculator';
import Helpline from './pages/Helpline';
import CropCalendar from './pages/CropCalendar';
import Encyclopedia from './pages/Encyclopedia';
import EncyclopediaDetail from './pages/EncyclopediaDetail';
import AiAgriExpert from './pages/AiAgriExpert';
import PWAUpdater from './components/PWAUpdater';
import InstallPwaModal from './components/InstallPwaModal';
import BlockedScreen from './components/BlockedScreen';
import Onboarding from './components/Onboarding';
import { useAppContext } from './context/AppContext';

function AppRoutes() {
  const { isBlocked, needsOnboarding, loading, user } = useAppContext();

  if (loading) return null;

  if (isBlocked) {
    return <BlockedScreen />;
  }

  if (user && needsOnboarding) {
    return <Onboarding />;
  }

  return (
    <>
      <PWAUpdater />
      <InstallPwaModal />
      <BrowserRouter>
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
