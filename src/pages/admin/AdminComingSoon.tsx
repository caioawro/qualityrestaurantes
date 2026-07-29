import { useState } from 'react';
import {
  FileText, Boxes, Scale, Layers, Route, DollarSign,
  BarChart3, Network, Download, ShieldAlert, Construction, X,
} from 'lucide-react';

const MODULES = [
  { icon: FileText, title: 'Integração com Nota Fiscal (XML)', desc: 'Importação automática de notas fiscais em XML para conciliação de entradas.' },
  { icon: Boxes, title: 'Controle de Estoque', desc: 'Gestão de saldos de proteínas e cortes em tempo real.' },
  { icon: Scale, title: 'Conciliação Comprado × Beneficiado', desc: 'Comparação entre peso comprado e peso beneficiado com apuração de divergências.' },
  { icon: Layers, title: 'Controle de Lotes', desc: 'Rastreamento de lotes de matéria-prima e produção.' },
  { icon: Route, title: 'Rastreabilidade Completa', desc: 'Histórico completo do produto, do recebimento ao beneficiamento final.' },
  { icon: DollarSign, title: 'Custos por Beneficiamento', desc: 'Apuração de custos de mão de obra, insumos e perdas por beneficiamento.' },
  { icon: BarChart3, title: 'Relatórios Financeiros', desc: 'Relatórios gerenciais e financeiros detalhados para tomada de decisão.' },
  { icon: Network, title: 'Integração com ERP', desc: 'Conexão com sistemas ERP para sincronização de dados.' },
  { icon: Download, title: 'Exportação Automática de Indicadores', desc: 'Exportação programada de KPIs em diversos formatos.' },
  { icon: ShieldAlert, title: 'Auditoria de Divergências', desc: 'Registro e auditoria de divergências entre esperado e realizado.' },
];

export function AdminComingSoon() {
  const [selected, setSelected] = useState<typeof MODULES[0] | null>(null);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Em Breve</h1>
        <p className="text-sm text-gray-500">Próximas evoluções do sistema</p>
      </div>

      <div className="bg-accent-50 border border-accent-100 rounded-xl p-4 flex items-center gap-3">
        <Construction className="w-5 h-5 text-accent-600 flex-shrink-0" />
        <p className="text-sm text-accent-700">Estes módulos estão em desenvolvimento e serão disponibilizados em próximas versões.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          return (
            <button
              key={i}
              onClick={() => setSelected(m)}
              className="card p-5 text-left opacity-75 hover:opacity-100 hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Em breve</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 text-sm mb-1">{m.title}</h3>
              <p className="text-xs text-gray-400 line-clamp-2">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Info modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-5 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <selected.icon className="w-6 h-6 text-gray-400" />
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{selected.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.desc}</p>
            <div className="bg-accent-50 border border-accent-100 rounded-xl p-4">
              <p className="text-sm text-accent-700">Este módulo está em desenvolvimento e será disponibilizado em uma próxima versão.</p>
            </div>
            <button onClick={() => setSelected(null)} className="btn-primary w-full mt-4">Entendi</button>
          </div>
        </div>
      )}
    </div>
  );
}
