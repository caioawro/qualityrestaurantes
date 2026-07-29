import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Search, Calendar, Clock, User, Package, X, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Processing } from '../lib/types';
import { formatWeight, formatPercent, formatDate, formatTime } from '../lib/format';

interface Props {
  onBack: () => void;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'custom';

export function ConsultProcessing({ onBack }: Props) {
  const [records, setRecords] = useState<Processing[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FilterPeriod>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [proteinFilter, setProteinFilter] = useState('');
  const [proteins, setProteins] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Processing | null>(null);

  useEffect(() => {
    supabase.from('proteins').select('id, name').eq('active', true).order('name')
      .then(({ data }) => { if (data) setProteins(data); });
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [period, customStart, customEnd]);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('processing')
      .select('*, protein:proteins(*), unit:units(*), items:processing_items(*), byproducts:processing_byproducts(*)')
      .order('processing_date', { ascending: false })
      .order('processing_time', { ascending: false });

    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (period === 'today') {
      startDate = now.toISOString().slice(0, 10);
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10);
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().slice(0, 10);
    } else if (period === 'custom') {
      startDate = customStart || null;
      endDate = customEnd || null;
    }

    if (startDate) query = query.gte('processing_date', startDate);
    if (endDate) query = query.lte('processing_date', endDate);

    const { data } = await query;
    if (data) setRecords(data as Processing[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (proteinFilter && r.protein_id !== proteinFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.responsible.toLowerCase().includes(q) && !(r.protein?.name?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [records, proteinFilter, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">Consultar Beneficiamentos</h1>
            <p className="text-xs text-gray-500">{filtered.length} registro(s)</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-5">
        {/* Filters */}
        <div className="space-y-3 mb-5">
          {/* Period tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['today', 'week', 'month', 'custom'] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  period === p ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Período'}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex gap-2 animate-fade-in">
              <input type="date" className="input-field flex-1" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <input type="date" className="input-field flex-1" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Pesquisar por responsável ou proteína..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Protein filter */}
          <select className="input-field" value={proteinFilter} onChange={(e) => setProteinFilter(e.target.value)}>
            <option value="">Todas as proteínas</option>
            {proteins.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum beneficiamento encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="card p-4 w-full text-left hover:shadow-md hover:border-primary-200 transition-all active:scale-95"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (r.protein?.color || '#0ea5e9') + '20' }}>
                      <Package className="w-5 h-5" style={{ color: r.protein?.color || '#0ea5e9' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{r.protein?.name || '—'}</h3>
                      <p className="text-xs text-gray-500">{r.responsible}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{formatDate(r.processing_date)}</p>
                    <p className="text-xs text-gray-400">{formatTime(r.processing_time)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <p className="text-xs text-gray-400">Inicial</p>
                    <p className="text-sm font-semibold text-gray-900">{formatWeight(r.gross_weight)}</p>
                  </div>
                  <div className="bg-success-50 rounded-lg py-2">
                    <p className="text-xs text-success-600">Produzido</p>
                    <p className="text-sm font-semibold text-success-700">{formatWeight(r.produced_weight)}</p>
                  </div>
                  <div className={`rounded-lg py-2 ${r.loss_percentage > 10 ? 'bg-error-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${r.loss_percentage > 10 ? 'text-error-600' : 'text-gray-400'}`}>Perda</p>
                    <p className={`text-sm font-semibold ${r.loss_percentage > 10 ? 'text-error-600' : 'text-gray-900'}`}>{formatPercent(r.loss_percentage)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selected && <DetailModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailModal({ record, onClose }: { record: Processing; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Detalhes do Beneficiamento</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* General info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (record.protein?.color || '#0ea5e9') + '20' }}>
                <Package className="w-4 h-4" style={{ color: record.protein?.color || '#0ea5e9' }} />
              </div>
              <span className="font-semibold text-gray-900">{record.protein?.name || '—'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-gray-400" /> {record.responsible}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" /> {formatDate(record.processing_date)}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" /> {formatTime(record.processing_time)}
              </div>
              {record.unit && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Package className="w-4 h-4 text-gray-400" /> {record.unit.name}
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="grid grid-cols-2 gap-3">
            {record.before_photo_url && (
              <div>
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Foto Inicial</p>
                <img src={record.before_photo_url} alt="Inicial" className="w-full rounded-xl object-cover h-32" />
              </div>
            )}
            {record.after_photo_url && (
              <div>
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> Foto Final</p>
                <img src={record.after_photo_url} alt="Final" className="w-full rounded-xl object-cover h-32" />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Peso Inicial</span>
              <span className="font-semibold text-gray-900">{formatWeight(record.gross_weight)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Peso Produzido</span>
              <span className="font-semibold text-success-600">{formatWeight(record.produced_weight)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subprodutos</span>
              <span className="font-semibold text-accent-600">{formatWeight(record.byproduct_weight)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Perda</span>
              <span className="font-semibold text-gray-900">{formatWeight(record.loss_weight)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-500">% Perda</span>
              <span className={`font-bold ${record.loss_percentage > 10 ? 'text-error-600' : 'text-gray-900'}`}>{formatPercent(record.loss_percentage)}</span>
            </div>
          </div>

          {/* Cuts */}
          {record.items && record.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Cortes</h3>
              <div className="space-y-2">
                {record.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-600">{item.cut_name} × {item.quantity} ({item.gramatura}g)</span>
                    <span className="font-medium text-gray-900">{formatWeight(item.total_weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Byproducts */}
          {record.byproducts && record.byproducts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Subprodutos</h3>
              <div className="space-y-2">
                {record.byproducts.map((bp) => (
                  <div key={bp.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-600">{bp.description}</span>
                    <span className="font-medium text-gray-900">{formatWeight(bp.weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
