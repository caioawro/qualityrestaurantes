import { useState, useEffect, useCallback } from 'react';
import { Home } from './pages/Home';
import { NewProcessing } from './pages/NewProcessing';
import { ConsultProcessing } from './pages/ConsultProcessing';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProcessingList } from './pages/admin/AdminProcessingList';
import { AdminProteins } from './pages/admin/AdminProteins';
import { AdminCuts } from './pages/admin/AdminCuts';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminSchedule } from './pages/admin/AdminSchedule';
import { AdminPurchases } from './pages/admin/AdminPurchases';
import { AdminComingSoon } from './pages/admin/AdminComingSoon';
import { AdminDishes } from './pages/admin/AdminDishes';

type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'consult' }
  | { name: 'admin' }
  | { name: 'admin-login' }
  | { name: 'admin-dashboard' }
  | { name: 'admin-processing' }
  | { name: 'admin-proteins' }
  | { name: 'admin-cuts' }
  | { name: 'admin-settings' }
  | { name: 'admin-dishes' }
  | { name: 'admin-schedule' }
  | { name: 'admin-purchases' }
  | { name: 'admin-coming-soon' };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'novo') return { name: 'new' };
  if (parts[0] === 'consultar') return { name: 'consult' };
  if (parts[0] === 'admin') {
    if (parts.length === 1) return { name: 'admin-login' };
    if (parts[1] === 'dashboard') return { name: 'admin-dashboard' };
    if (parts[1] === 'beneficiamentos') return { name: 'admin-processing' };
    if (parts[1] === 'proteinas') return { name: 'admin-proteins' };
    if (parts[1] === 'cortes') return { name: 'admin-cuts' };
    if (parts[1] === 'configuracoes') return { name: 'admin-settings' };
    if (parts[1] === 'fichas') return { name: 'admin-dishes' };
    if (parts[1] === 'cronograma') return { name: 'admin-schedule' };
    if (parts[1] === 'compras') return { name: 'admin-purchases' };
    if (parts[1] === 'em-breve') return { name: 'admin-coming-soon' };
    return { name: 'admin-login' };
  }
  return { name: 'home' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const goHome = useCallback(() => navigate('/'), []);

  switch (route.name) {
    case 'home':
      return <Home />;
    case 'new':
      return <NewProcessing onBack={goHome} />;
    case 'consult':
      return <ConsultProcessing onBack={goHome} />;
    case 'admin-login':
      return <AdminLogin />;
    case 'admin-dashboard':
    case 'admin-processing':
    case 'admin-proteins':
    case 'admin-cuts':
    case 'admin-settings':
    case 'admin-dishes':
    case 'admin-schedule':
    case 'admin-purchases':
    case 'admin-coming-soon':
      return (
        <AdminLayout current={route.name}>
          {route.name === 'admin-dashboard' && <AdminDashboard />}
          {route.name === 'admin-processing' && <AdminProcessingList />}
          {route.name === 'admin-proteins' && <AdminProteins />}
          {route.name === 'admin-cuts' && <AdminCuts />}
          {route.name === 'admin-settings' && <AdminSettings />}
          {route.name === 'admin-dishes' && <AdminDishes />}
          {route.name === 'admin-schedule' && <AdminSchedule />}
          {route.name === 'admin-purchases' && <AdminPurchases />}
          {route.name === 'admin-coming-soon' && <AdminComingSoon />}
        </AdminLayout>
      );
    default:
      return <Home />;
  }
}
