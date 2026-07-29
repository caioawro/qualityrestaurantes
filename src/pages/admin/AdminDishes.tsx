import { useState, useEffect, useMemo } from 'react';
import {
  ChefHat, Plus, Trash2, X, Search, UtensilsCrossed, Package, DollarSign, TrendingDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Dish, DishItem, Cut } from '../../lib/types';

type CutCostMap = Record<string, { avgPrice: number; sampleCount: number }>;

export function AdminDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Dish | null>(null);
  const [creating, setCreating] = useState(false);
  const [cutCosts, setCutCosts] = useState<CutCostMap>({});

  const fetchCutCosts = async (): Promise<CutCostMap> => {
    const { data, error } = await supabase
      .from('processing_items')
      .select('cut_name, quantity, total_weight, processing:processing_id(gross_weight, price_per_kg, produced_weight)');
    if (error || !data) return {};

    const byCut: Record<string, { totalCost: number; count: number }> = {};
    (data as any[]).forEach((row) => {
      const cutName: string = row.cut_name;
      const qty: number = row.quantity || 0;
      const totalWeight: number = parseFloat(row.total_weight) || 0;
      const proc = row.processing;
      if (!proc || !cutName || qty <= 0) return;

      const gross = parseFloat(proc.gross_weight) || 0;
      const pricePerKg = parseFloat(proc.price_per_kg) || 0;
      const produced = parseFloat(proc.produced_weight) || 0;
      if (produced <= 0 || pricePerKg <= 0) return;

      const costPerKgProduced = (gross * pricePerKg) / produced;
      const weightPerPortion = totalWeight / qty;
      const costPerPortion = weightPerPortion * costPerKgProduced;

      if (!byCut[cutName]) byCut[cutName] = { totalCost: 0, count: 0 };
      byCut[cutName].totalCost += costPerPortion;
      byCut[cutName].count += 1;
    });

    const result: CutCostMap = {};
    Object.entries(byCut).forEach(([name, v]) => {
      result[name] = { avgPrice: v.totalCost / v.count, sampleCount: v.count };
    });
    return result;
  };

  const fetchDishes = async () => {
    setLoading(true);
    const [dishRes, costs] = await Promise.all([
      supabase.from('dishes').select('*, items:dish_items(*)').order('created_at', { ascending: false }),
      fetchCutCosts(),
    ]);
    if (dishRes.error) console.error('fetch dishes error:', dishRes.error);
    if (dishRes.data) setDishes(dishRes.data as Dish[]);
    setCutCosts(costs);
    setLoading(false);
  };

  useEffect(() => { fetchDishes(); }, []);

  const filtered = useMemo(() => {
    if (!search) return dishes;
    const q = search.toLowerCase();
    return dishes.filter((d) => d.name.toLowerCase().includes(q));
  }, [dishes, search]);

  const handleDelete = async (id: string) => {
    await supabase.from('dish_items').delete().eq('dish_id', id);
    await supabase.from('dishes').delete().eq('id', id);
    fetchDishes();
  };

  const calcTotal = (items?: DishItem[]) => {
    if (!items) return 0;
    return items.reduce((sum, i) => {
      const price = i.item_type === 'cut' ? (cutCosts[i.name]?.avgPrice || 0) : i.unit_price;
      return sum + i.quantity * price;
    }, 0);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichas Técnicas</h1>
          <p className="text-sm text-gray-500">{filtered.length} prato(s) cadastrado(s)</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Prato
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input-field pl-10" placeholder="Pesquisar prato..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma ficha técnica cadastrada</p>
          <button type="button" onClick={() => setCreating(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Criar primeira ficha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dish) => (
            <div key={dish.id} className="card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEditing(dish)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-accent-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{dish.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(dish.id); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-error-50 hover:text-error-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 mb-3">
                {(dish.items || []).slice(0, 4).map((item) => {
                  const price = item.item_type === 'cut' ? (cutCosts[item.name]?.avgPrice || 0) : item.unit_price;
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="text-gray-400">{item.quantity}x R$ {price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  );
                })}
                {(dish.items || []).length > 4 && (
                  <p className="text-xs text-gray-400">+{(dish.items || []).length - 4} item(s)</p>
                )}
                {(dish.items || []).length === 0 && (
                  <p className="text-xs text-gray-400">Sem itens</p>
                )}
              </div>
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Custo</span>
                  <span className="font-medium text-gray-900">R$ {calcTotal(dish.items).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Venda</span>
                  <span className="font-medium text-primary-600">R$ {(dish.sale_price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Markup</span>
                  {(() => {
                    const cost = calcTotal(dish.items);
                    const markup = cost > 0 && dish.sale_price ? ((dish.sale_price - cost) / cost) * 100 : 0;
                    return (
                      <span className={`font-bold text-sm ${markup > 0 ? 'text-success-600' : 'text-gray-500'}`}>
                        {markup.toFixed(2).replace('.', ',')}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <DishEditor cutCosts={cutCosts} onClose={() => setCreating(false)} onSaved={fetchDishes} />}
      {editing && <DishEditor dish={editing} cutCosts={cutCosts} onClose={() => setEditing(null)} onSaved={fetchDishes} />}
    </div>
  );
}

function DishEditor({ dish, cutCosts, onClose, onSaved }: {
  dish?: Dish;
  cutCosts: CutCostMap;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(dish?.name || '');
  const [salePrice, setSalePrice] = useState(dish?.sale_price ? String(dish.sale_price) : '');
  const [items, setItems] = useState<DishItem[]>(dish?.items || []);
  const [saving, setSaving] = useState(false);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('cuts').select('*').eq('active', true).order('name');
      if (error) console.error('fetch cuts error:', error);
      if (data) setCuts(data as Cut[]);
    })();
  }, []);

  const getCutPrice = (cutName: string) => cutCosts[cutName]?.avgPrice || 0;

  const totalCost = useMemo(() => {
    return items.reduce((sum, i) => {
      const price = i.item_type === 'cut' ? getCutPrice(i.name) : i.unit_price;
      return sum + i.quantity * price;
    }, 0);
  }, [items, cutCosts]);

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) return;
    setSaving(true);
    let dishId = dish?.id;
    const price = parseFloat(salePrice.replace(',', '.')) || 0;

    if (dishId) {
      await supabase.from('dish_items').delete().eq('dish_id', dishId);
      await supabase.from('dishes').update({ name: name.trim(), sale_price: price }).eq('id', dishId);
    } else {
      const { data, error } = await supabase.from('dishes').insert({ name: name.trim(), sale_price: price }).select().single();
      if (error || !data) { setSaving(false); return; }
      dishId = data.id;
    }

    const rows = items.map((i) => ({
      dish_id: dishId,
      item_type: i.item_type,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.item_type === 'cut' ? getCutPrice(i.name) : i.unit_price,
      processing_id: null,
      cut_name: i.item_type === 'cut' ? i.name : null,
    }));
    if (rows.length > 0) {
      await supabase.from('dish_items').insert(rows);
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const addCutItem = (cutName: string, quantity: number) => {
    setItems((prev) => [...prev, {
      id: '',
      dish_id: dish?.id || '',
      item_type: 'cut',
      name: cutName,
      quantity,
      unit: 'porção',
      unit_price: getCutPrice(cutName),
      processing_id: null,
      cut_name: cutName,
      created_at: '',
    }]);
    setShowAddItem(false);
  };

  const addManualItem = (itemName: string, quantity: number, unit: string, unitPrice: number) => {
    setItems((prev) => [...prev, {
      id: '',
      dish_id: dish?.id || '',
      item_type: 'manual',
      name: itemName,
      quantity,
      unit,
      unit_price: unitPrice,
      processing_id: null,
      cut_name: null,
      created_at: '',
    }]);
    setShowAddItem(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-5 animate-fade-in" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-900">{dish ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nome do Prato *</label>
              <input className="input-field" placeholder="Ex: Camarão Provençal" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label-field">Preço de Venda (R$)</label>
              <input className="input-field" inputMode="decimal" placeholder="0,00" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Itens do Prato</h3>
              <button type="button" onClick={() => setShowAddItem(!showAddItem)} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Adicionar Item
              </button>
            </div>

            {showAddItem && (
              <AddItemPanel
                cuts={cuts}
                cutCosts={cutCosts}
                onAddCut={addCutItem}
                onAddManual={addManualItem}
                onCancel={() => setShowAddItem(false)}
              />
            )}

            {items.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum item adicionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const price = item.item_type === 'cut' ? getCutPrice(item.name) : item.unit_price;
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.item_type === 'cut' ? 'bg-primary-50 text-primary-600' : 'bg-accent-50 text-accent-600'}`}>
                        {item.item_type === 'cut' ? <Package className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} {item.unit} × R$ {price.toFixed(2).replace('.', ',')}
                          {item.item_type === 'cut' && (cutCosts[item.name]?.sampleCount > 0
                            ? ` (média de ${cutCosts[item.name].sampleCount} beneficiamento(s))`
                            : ' (sem beneficiamento ainda)')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">R$ {(item.quantity * price).toFixed(2).replace('.', ',')}</span>
                      <button type="button" onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-error-50 hover:text-error-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-primary-50 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-700">Custo Bruto do Prato</span>
              </div>
              <span className="text-xl font-bold text-primary-700">R$ {totalCost.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex items-center justify-between border-t border-primary-200 pt-3">
              <span className="text-sm font-medium text-primary-700">Markup</span>
              {(() => {
                const sp = parseFloat(salePrice.replace(',', '.')) || 0;
                const markup = totalCost > 0 && sp > 0 ? ((sp - totalCost) / totalCost) * 100 : 0;
                return (
                  <span className={`text-lg font-bold ${markup > 0 ? 'text-success-600' : 'text-gray-500'}`}>
                    {markup.toFixed(2).replace('.', ',')}%
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim() || items.length === 0} className="btn-primary flex-1">
            {saving ? 'Salvando...' : 'Salvar Ficha'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddItemPanel({
  cuts, cutCosts, onAddCut, onAddManual, onCancel,
}: {
  cuts: Cut[];
  cutCosts: CutCostMap;
  onAddCut: (cutName: string, quantity: number) => void;
  onAddManual: (name: string, quantity: number, unit: string, unitPrice: number) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<'cut' | 'manual'>('cut');
  const [selectedCut, setSelectedCut] = useState('');
  const [cutQty, setCutQty] = useState('1');
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualUnit, setManualUnit] = useState('porção');
  const [manualPrice, setManualPrice] = useState('');

  const handleAddCut = () => {
    if (!selectedCut) return;
    onAddCut(selectedCut, parseFloat(cutQty.replace(',', '.')) || 1);
    setSelectedCut('');
    setCutQty('1');
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return;
    onAddManual(
      manualName.trim(),
      parseFloat(manualQty.replace(',', '.')) || 1,
      manualUnit,
      parseFloat(manualPrice.replace(',', '.')) || 0,
    );
    setManualName('');
    setManualQty('1');
    setManualUnit('porção');
    setManualPrice('');
  };

  const selectedCutCost = selectedCut ? cutCosts[selectedCut] : null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3 animate-fade-in">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('cut')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'cut' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Corte / Porção
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Item Manual
        </button>
      </div>

      {mode === 'cut' ? (
        <div className="space-y-2">
          <select className="input-field" value={selectedCut} onChange={(e) => setSelectedCut(e.target.value)}>
            <option value="">Selecione um corte...</option>
            {cuts.map((c) => (
              <option key={c.id} value={c.name}>{c.name} ({c.gramatura}g)</option>
            ))}
          </select>
          <div>
            <label className="text-xs text-gray-400">Quantidade de porções</label>
            <input className="input-field" inputMode="decimal" placeholder="1" value={cutQty} onChange={(e) => setCutQty(e.target.value)} />
          </div>
          {selectedCut && (
            <div className="bg-white rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary-500" />
                <span className="text-xs text-gray-500">Custo médio por porção</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-900">R$ {(selectedCutCost?.avgPrice || 0).toFixed(2).replace('.', ',')}</span>
                {selectedCutCost && (
                  <p className="text-[10px] text-gray-400">{selectedCutCost.sampleCount} beneficiamento(s)</p>
                )}
              </div>
            </div>
          )}
          {selectedCut && !selectedCutCost && (
            <p className="text-xs text-warning-600">Este corte ainda não possui beneficiamento com preço cadastrado. O custo será zero até que haja beneficiamentos.</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handleAddCut} disabled={!selectedCut} className="btn-primary flex-1 flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Adicionar Corte
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input className="input-field" placeholder="Nome do item (ex: Fettuccine)" value={manualName} onChange={(e) => setManualName(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400">Quantidade</label>
              <input className="input-field" inputMode="decimal" placeholder="1" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Unidade</label>
              <input className="input-field" placeholder="porção" value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Preço (R$)</label>
              <input className="input-field" inputMode="decimal" placeholder="0,00" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAddManual} disabled={!manualName.trim()} className="btn-primary flex-1 flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Adicionar Item
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
