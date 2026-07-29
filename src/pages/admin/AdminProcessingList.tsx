import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Search, Edit, Trash2, X, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Processing, Protein, Unit } from '../../lib/types';
import { formatWeight, formatPercent, formatDate, formatTime } from '../../lib/format';

export function AdminProcessingList() {
  const [records, setRecords] = useState<Processing[]>([]);
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [proteinFilter, setProteinFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [editing, setEditing] = useState<Processing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Processing | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  useEffect(() => {
    (async () => {
      const [protRes, unitRes] = await Promise.all([
        supabase.from('proteins').select('*').order('name'),
        supabase.from('units').select('*').order('name'),
      ]);
      if (protRes.data) setProteins(protRes.data);
      if (unitRes.data) setUnits(unitRes.data);
      fetchRecords();
    })();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('processing')
      .select('*, protein:proteins(*), unit:units(*), items:processing_items(*), byproducts:processing_byproducts(*)')
      .order('processing_date', { ascending: false })
      .order('processing_time', { ascending: false });

    if (proteinFilter) query = query.eq('protein_id', proteinFilter);
    if (unitFilter) query = query.eq('unit_id', unitFilter);
    if (periodStart) query = query.gte('processing_date', periodStart);
    if (periodEnd) query = query.lte('processing_date', periodEnd);

    const { data } = await query;
    if (data) setRecords(data as Processing[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [proteinFilter, unitFilter, periodStart, periodEnd]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) =>
      r.responsible.toLowerCase().includes(q) ||
      r.protein?.name?.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await supabase.from('processing_items').delete().eq('processing_id', confirmDelete.id);
    await supabase.from('processing_byproducts').delete().eq('processing_id', confirmDelete.id);
    await supabase.from('processing').delete().eq('id', confirmDelete.id);
    setConfirmDelete(null);
    fetchRecords();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Beneficiamentos</h1>
        <p className="text-sm text-gray-500">{filtered.length} registro(s)</p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input-field pl-10" placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-field" value={proteinFilter} onChange={(e) => setProteinFilter(e.target.value)}>
            <option value="">Todas as proteínas</option>
            {proteins.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input-field" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">Todas as unidades</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" className="input-field" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <input type="date" className="input-field" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        {(proteinFilter || unitFilter || periodStart || periodEnd) && (
          <button onClick={() => { setProteinFilter(''); setUnitFilter(''); setPeriodStart(''); setPeriodEnd(''); }} className="text-sm text-primary-600 hover:text-primary-700">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium w-10"></th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Proteína</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium">Unidade</th>
                <th className="px-4 py-3 font-medium text-right">Inicial</th>
                <th className="px-4 py-3 font-medium text-right">Produzido</th>
                <th className="px-4 py-3 font-medium text-right">Perda</th>
                <th className="px-4 py-3 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum registro</td></tr>
              ) : filtered.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 cursor-pointer" onClick={() => toggleExpand(r.id)}>
                      <button className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors">
                        {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.processing_date)} {formatTime(r.processing_time)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: r.protein?.color || '#ccc' }} />
                        <span className="font-medium text-gray-900">{r.protein?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.responsible}</td>
                    <td className="px-4 py-3 text-gray-600">{r.unit?.name || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatWeight(r.gross_weight)}</td>
                    <td className="px-4 py-3 text-right text-success-600 font-medium">{formatWeight(r.produced_weight)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.loss_percentage > 10 ? 'text-error-600' : 'text-gray-700'}`}>{formatPercent(r.loss_percentage)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditing(r)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(r)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-error-50 hover:text-error-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="bg-gray-50/50 border-t-0">
                      <td colSpan={9} className="px-4 py-4">
                        {r.items && r.items.length > 0 ? (
                          <div className="pl-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {r.items.map((item) => (
                              <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                  <span className="font-medium text-gray-900 text-sm block">{item.cut_name}</span>
                                  <span className="text-xs text-gray-500">{item.gramatura}g por un.</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-primary-600 block">{item.quantity} un</span>
                                  <span className="text-xs text-gray-500 font-medium">{formatWeight(item.total_weight)} total</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                           <div className="pl-10 text-sm text-gray-500 italic">Nenhuma porção ou corte registrado para este beneficiamento.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && <EditModal record={editing} proteins={proteins} units={units} onClose={() => setEditing(null)} onSaved={fetchRecords} />}

      {/* Delete confirm */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-5 animate-fade-in" 
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-error-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Excluir beneficiamento?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Esta ação não pode ser desfeita. Todos os dados do registro serão removidos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-error-600 text-white font-semibold rounded-xl px-6 py-3 hover:bg-error-700 active:scale-95 transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({ record, proteins, units, onClose, onSaved }: {
  record: Processing; proteins: Protein[]; units: Unit[]; onClose: () => void; onSaved: () => void;
}) {
  const [responsible, setResponsible] = useState(record.responsible);
  const [proteinId, setProteinId] = useState(record.protein_id);
  const [unitId, setUnitId] = useState(record.unit_id || '');
  const [date, setDate] = useState(record.processing_date);
  const [time, setTime] = useState(record.processing_time);
  const [grossWeight, setGrossWeight] = useState(String(record.gross_weight));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const gross = parseFloat(grossWeight.replace(',', '.')) || 0;
    await supabase.from('processing').update({
      responsible: responsible.trim(),
      protein_id: proteinId,
      unit_id: unitId || null,
      processing_date: date,
      processing_time: time,
      gross_weight: gross,
    }).eq('id', record.id);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-5 animate-fade-in" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Editar Beneficiamento</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-field">Responsável</label>
            <input className="input-field" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Data</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Hora</label>
              <input type="time" className="input-field" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Proteína</label>
            <select className="input-field" value={proteinId} onChange={(e) => setProteinId(e.target.value)}>
              {proteins.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Unidade</label>
            <select className="input-field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">—</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Peso Bruto (kg)</label>
            <input className="input-field" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} />
          </div>

          {/* Read-only summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Peso Produzido</span><span className="font-medium text-success-600">{formatWeight(record.produced_weight)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Subprodutos</span><span className="font-medium text-accent-600">{formatWeight(record.byproduct_weight)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Perda</span><span className="font-medium text-gray-900">{formatWeight(record.loss_weight)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">% Perda</span><span className={`font-bold ${record.loss_percentage > 10 ? 'text-error-600' : 'text-gray-900'}`}>{formatPercent(record.loss_percentage)}</span></div>
          </div>

          {/* Photos */}
          <div className="grid grid-cols-2 gap-3">
            {record.before_photo_url && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Foto Inicial</p>
                <img src={record.before_photo_url} alt="Inicial" className="w-full rounded-xl object-cover h-32" />
              </div>
            )}
            {record.after_photo_url && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Foto Final</p>
                <img src={record.after_photo_url} alt="Final" className="w-full rounded-xl object-cover h-32" />
              </div>
            )}
          </div>

          {/* Items */}
          {record.items && record.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Cortes</h3>
              <div className="space-y-2">
                {record.items.map((item) => (
                  <div key={item.id} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-600">{item.cut_name} × {item.quantity} ({item.gramatura}g)</span>
                    <span className="font-medium">{formatWeight(item.total_weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
