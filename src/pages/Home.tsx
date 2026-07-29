import { Package, Search, ShieldCheck, ChevronRight } from 'lucide-react';
import { navigate } from '../App';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Quality Restaurantes</h1>
              <p className="text-xs text-gray-500">Produções de Cozinha</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-5 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo</h2>
          <p className="text-gray-500">Selecione uma opção para continuar</p>
        </div>

        <div className="space-y-4 max-w-md mx-auto">
          {/* New Processing */}
          <button
            onClick={() => navigate('/novo')}
            className="group w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all active:scale-95 text-left animate-slide-up"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                <Package className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">Novo Beneficiamento</h3>
                <p className="text-sm text-gray-500">Registrar um novo processo</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
            </div>
          </button>

          {/* Consult */}
          <button
            onClick={() => navigate('/consultar')}
            className="group w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all active:scale-95 text-left animate-slide-up"
            style={{ animationDelay: '0.05s' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-success-100 flex items-center justify-center group-hover:bg-success-600 transition-colors">
                <Search className="w-7 h-7 text-success-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">Consultar Beneficiamentos</h3>
                <p className="text-sm text-gray-500">Ver registros anteriores</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-success-500 transition-colors" />
            </div>
          </button>
        </div>

        <div className="mt-12 text-center text-xs text-gray-400">
          <p>Versão 1.0 — MVP Operacional</p>
        </div>
      </main>
    </div>
  );
}
