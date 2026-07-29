import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, Beef, Scissors, Settings, Construction, ChefHat,
  Menu, LogOut, Home, CalendarClock, ShoppingCart,
} from 'lucide-react';
import { navigate } from '../../App';

interface Props {
  current: string;
  children: React.ReactNode;
}

const MENU = [
  { key: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { key: 'admin-processing', label: 'Beneficiamentos', icon: Package, path: '/admin/beneficiamentos' },
  { key: 'admin-proteins', label: 'Proteínas', icon: Beef, path: '/admin/proteinas' },
  { key: 'admin-cuts', label: 'Cortes', icon: Scissors, path: '/admin/cortes' },
  { key: 'admin-dishes', label: 'Fichas Técnicas', icon: ChefHat, path: '/admin/fichas' },
  { key: 'admin-schedule', label: 'Cronograma', icon: CalendarClock, path: '/admin/cronograma' },
  { key: 'admin-purchases', label: 'Sugestão de Compras (IA)', icon: ShoppingCart, path: '/admin/compras' },
  { key: 'admin-settings', label: 'Configurações', icon: Settings, path: '/admin/configuracoes' },
];

const COMING_SOON = [
  { key: 'admin-coming-soon', label: 'Em Breve', icon: Construction, path: '/admin/em-breve' },
];

export function AdminLayout({ current, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') !== 'true') {
      navigate('/admin');
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    navigate('/');
  };

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-gray-900 flex-col fixed inset-y-0">
        <SidebarContent current={current} onNav={handleNav} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <aside className="relative w-64 bg-gray-900 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <SidebarContent current={current} onNav={handleNav} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900">Admin</span>
          <button onClick={handleLogout} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ current, onNav, onLogout }: { current: string; onNav: (p: string) => void; onLogout: () => void }) {
  return (
    <>
      <div className="p-5 flex items-center gap-2.5 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm">Quality Restaurantes</h1>
          <p className="text-xs text-gray-500">Painel Admin</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-2 font-medium">Menu</p>
        {MENU.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}

        <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-2 font-medium pt-4">Futuro</p>
        {COMING_SOON.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-1">
        <button onClick={() => onNav('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <Home className="w-4 h-4" /> Página Inicial
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-error-400 hover:bg-error-500/10 transition-colors">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </>
  );
}
