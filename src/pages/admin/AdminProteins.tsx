import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertTriangle, Beef } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Protein, Category } from '../../lib/types';
import { formatPercent } from '../../lib/format';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#3b82f6', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'];

export function AdminProteins() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Protein | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Protein | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [protRes, catRes] = await Promise.all([
      supabase.from('proteins').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    if (protRes.error) { console.error('proteins error:', protRes.error); }
    if (catRes.error) { console.error('categories error:', catRes.error); }
    const catMap: Record<string, Category> = {};
    (catRes.data || []).forEach((c) => { catMap[c.id] = c; });
    setCategories(catRes.data || []);
    if (protRes.data) {
      setProteins(protRes.data.map((p) => ({ ...p, category: p.category_id ? catMap[p.category_id] || null : null })));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteError('');

    // Check if there are processing records
    const { count } = await supabase.from('processing').select('*', { count: 'exact', head: true }).eq('protein_id', confirmDelete.id);
    if (count && count > 0) {
      setDeleteError('Esta proteína não pode ser excluída pois possui beneficiamentos registrados. Recomendamos apenas inativá-la.');
      return;
    }

    const cutErr = await supabase.from('cuts').delete().eq('protein_id', confirmDelete.id);
    if (cutErr.error) {
      setDeleteError(cutErr.error.message);
      return;
    }
    const protErr = await supabase.from('proteins').delete().eq('id', confirmDelete.id);
    if (protErr.error) {
      setDeleteError(protErr.error.message);
      return;
    }
    setConfirmDelete(null);
    fetchAll();
  };

  // Group and sort proteins
  const groupedProteins = proteins.reduce((acc, p) => {
    const cat = p.category?.name || 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Protein[]>);

  const sortedCategories = Object.keys(groupedProteins).sort();

  sortedCategories.forEach(cat => {
    groupedProteins[cat].sort((a, b) => {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.name.localeCompare(b.name);
    });
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proteínas</h1>
          <p className="text-sm text-gray-500">{proteins.length} cadastrada(s)</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Proteína
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((cat) => (
            <div key={cat} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                {cat}
                <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {groupedProteins[cat].length}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedProteins[cat].map((p) => (
                  <div key={p.id} className="card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                          <Beef className="w-5 h-5" style={{ color: p.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{p.name}</h3>
                          <p className="text-xs text-gray-400">{cat}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Preço Compra</p>
                        <p className="font-semibold text-primary-600">R$ {(p.purchase_price || 0).toFixed(2).replace('.', ',')}/kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Perda</p>
                        <p className="font-semibold text-gray-900">{formatPercent(p.expected_loss)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => { setConfirmDelete(p); setDeleteError(''); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-error-50 hover:text-error-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(creating || editing) && (
        <ProteinModal
          protein={editing}
          categories={categories}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={fetchAll}
        />
      )}

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
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Excluir proteína?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Todos os cortes relacionados também serão removidos.</p>
            
            {deleteError && (
              <div className="mb-6 p-3 bg-error-50 text-error-700 text-sm rounded-lg border border-error-100">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button type="button" onClick={handleDelete} className="flex-1 bg-error-600 text-white font-semibold rounded-xl px-6 py-3 hover:bg-error-700 active:scale-95 transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProteinModal({ protein, categories, onClose, onSaved }: {
  protein: Protein | null; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(protein?.name || '');
  const [categoryId, setCategoryId] = useState(protein?.category_id || '');
  const [expectedLoss, setExpectedLoss] = useState(String(protein?.expected_loss || '0'));
  const [purchasePrice, setPurchasePrice] = useState(protein?.purchase_price ? String(protein.purchase_price) : '');
  const [color, setColor] = useState(protein?.color || COLORS[0]);
  const [active, setActive] = useState(protein?.active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: name.trim(),
      category_id: categoryId || null,
      expected_loss: parseFloat(expectedLoss.replace(',', '.')) || 0,
      purchase_price: parseFloat(purchasePrice.replace(',', '.')) || 0,
      color,
      active,
    };
    if (protein) {
      await supabase.from('proteins').update(payload).eq('id', protein.id);
    } else {
      await supabase.from('proteins').insert(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-5 animate-fade-in" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{protein ? 'Editar Proteína' : 'Nova Proteína'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-field">Nome *</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contra Filé" />
          </div>
          <div>
            <label className="label-field">Categoria</label>
            <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Perda Esperada (%)</label>
              <input className="input-field" inputMode="decimal" value={expectedLoss} onChange={(e) => setExpectedLoss(e.target.value)} placeholder="Ex: 8,00" />
            </div>
            <div>
              <label className="label-field">Preço Compra/KG (R$)</label>
              <input className="input-field" inputMode="decimal" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Ex: 45,90" />
            </div>
          </div>
          <div>
            <label className="label-field">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Ativo</span>
            </label>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
