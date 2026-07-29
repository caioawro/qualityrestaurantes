import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Check, Camera, Plus, Trash2, AlertTriangle,
  Package, Scale, Scissors, FileText, ClipboardCheck, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadPhoto } from '../lib/storage';
import type { Protein, Cut, Unit, Employee } from '../lib/types';
import { formatWeight, formatPercent } from '../lib/format';

interface Props {
  onBack: () => void;
}

interface ItemRow {
  cut_name: string;
  quantity: string;
  gramatura: string;
  total_weight: number;
}

interface ByproductRow {
  description: string;
  weight: string;
}

const STEPS = [
  { label: 'Informações', icon: FileText },
  { label: 'Peso Inicial', icon: Scale },
  { label: 'Beneficiamento', icon: Scissors },
  { label: 'Subprodutos', icon: Package },
  { label: 'Foto Final', icon: Camera },
  { label: 'Resumo', icon: ClipboardCheck },
];

export function NewProcessing({ onBack }: Props) {
  const [step, setStep] = useState(0);
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [maxLoss, setMaxLoss] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Form state
  const [responsible, setResponsible] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [unitId, setUnitId] = useState('');
  const [proteinId, setProteinId] = useState('');

  const [grossWeight, setGrossWeight] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);

  const [items, setItems] = useState<ItemRow[]>([{ cut_name: '', quantity: '0', gramatura: '0', total_weight: 0 }]);
  const [byproducts, setByproducts] = useState<ByproductRow[]>([]);

  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [protRes, unitRes, empRes, settingsRes, catRes] = await Promise.all([
        supabase.from('proteins').select('*').eq('active', true).order('name'),
        supabase.from('units').select('*').eq('active', true).order('name'),
        supabase.from('employees').select('*').eq('active', true).order('name'),
        supabase.from('settings').select('*'),
        supabase.from('categories').select('*').order('name'),
      ]);
      if (protRes.error) console.error('proteins error:', protRes.error);
      if (catRes.error) console.error('categories error:', catRes.error);
      if (protRes.data && catRes.data) {
        const catMap: Record<string, { id: string; name: string }> = {};
        catRes.data.forEach((c) => { catMap[c.id] = c; });
        setProteins(protRes.data.map((p) => ({ ...p, category: p.category_id ? catMap[p.category_id] || null : null })));
      }
      if (unitRes.data) setUnits(unitRes.data.filter((u: Unit) => u.active));
      if (empRes.data) setEmployees(empRes.data);
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        settingsRes.data.forEach((item: { key: string; value: string }) => { map[item.key] = item.value; });
        setMaxLoss(parseFloat(map['max_loss_percentage'] || '10'));
      }
    })();
  }, []);

  const proteinCuts = cuts.filter((c) => c.protein_id === proteinId);

  useEffect(() => {
    if (proteinId) {
      supabase.from('cuts').select('*').eq('protein_id', proteinId).eq('active', true).order('name')
        .then(({ data }) => { if (data) setCuts(data); });
    } else {
      setCuts([]);
    }
  }, [proteinId]);

  // Calculate totals
  const producedWeight = items.reduce((sum, i) => sum + (i.total_weight || 0), 0);
  const byproductWeight = byproducts.reduce((sum, b) => sum + (b.weight || 0), 0);
  const grossNum = parseFloat(grossWeight.replace(',', '.')) || 0;
  const priceNum = parseFloat(pricePerKg.replace(',', '.')) || 0;
  const totalCost = grossNum * priceNum;
  const lossWeight = Math.max(0, grossNum - producedWeight - byproductWeight);
  const lossPercentage = grossNum > 0 ? (lossWeight / grossNum) * 100 : 0;
  const isLossExceeded = lossPercentage > maxLoss;

  const updateItem = (idx: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === 'cut_name') {
        row.cut_name = value as string;
        const cut = proteinCuts.find((c) => c.name === value);
        if (cut) row.gramatura = String(cut.gramatura);
      } else if (field === 'quantity') {
        row.quantity = String(value);
      } else if (field === 'gramatura') {
        row.gramatura = String(value);
      }
      
      const qNum = parseInt(row.quantity) || 0;
      const gNum = parseFloat(row.gramatura.replace(',', '.')) || 0;
      row.total_weight = (qNum * gNum) / 1000;
      
      next[idx] = row;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { cut_name: '', quantity: '1', gramatura: '0', total_weight: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const addByproduct = () => setByproducts((prev) => [...prev, { description: '', weight: '' }]);
  const removeByproduct = (idx: number) => setByproducts((prev) => prev.filter((_, i) => i !== idx));
  const updateByproduct = (idx: number, field: keyof ByproductRow, value: string | number) => {
    setByproducts((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === 'weight') row.weight = String(value);
      else row.description = value as string;
      next[idx] = row;
      return next;
    });
  };

  const handleBeforePhoto = useCallback(async (file: File) => {
    setPhotoUploading(true);
    const url = await uploadPhoto('processing-before', file);
    if (url) {
      setBeforePhoto(url);
    }
    setPhotoUploading(false);
  }, []);

  const handleAfterPhoto = useCallback(async (file: File) => {
    setPhotoUploading(true);
    const url = await uploadPhoto('processing-after', file);
    if (url) {
      setAfterPhoto(url);
    }
    setPhotoUploading(false);
  }, []);

  const canProceed = (): boolean => {
    if (step === 0) return responsible.trim() !== '' && proteinId !== '';
    if (step === 1) return grossNum > 0;
    if (step === 2) return items.some((i) => i.cut_name !== '' && (parseInt(i.quantity) || 0) > 0);
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('processing').insert({
      responsible: responsible.trim(),
      unit_id: unitId || null,
      protein_id: proteinId,
      processing_date: date,
      processing_time: time,
      gross_weight: grossNum,
      price_per_kg: priceNum,
      before_photo_url: beforePhoto,
      after_photo_url: afterPhoto,
      produced_weight: parseFloat(producedWeight.toFixed(3)),
      byproduct_weight: parseFloat(byproductWeight.toFixed(3)),
      loss_weight: parseFloat(lossWeight.toFixed(3)),
      loss_percentage: parseFloat(lossPercentage.toFixed(2)),
      notes: null,
    }).select().single();

    if (error || !data) {
      setSaving(false);
      alert('Erro ao salvar: ' + (error?.message || 'unknown'));
      return;
    }

    const processingId = data.id;

    // Insert items
    const validItems = items.filter((i) => i.cut_name !== '' && (parseInt(i.quantity) || 0) > 0);
    if (validItems.length > 0) {
      await supabase.from('processing_items').insert(
        validItems.map((i) => ({
          processing_id: processingId,
          cut_name: i.cut_name,
          quantity: parseInt(i.quantity) || 0,
          gramatura: parseFloat(i.gramatura.replace(',', '.')) || 0,
          total_weight: parseFloat(i.total_weight.toFixed(3)),
        })),
      );
    }

    // Insert byproducts
    const validByproducts = byproducts.filter((b) => b.description !== '' && (parseFloat(b.weight.replace(',', '.')) || 0) > 0);
    if (validByproducts.length > 0) {
      await supabase.from('processing_byproducts').insert(
        validByproducts.map((b) => ({
          processing_id: processingId,
          description: b.description,
          weight: parseFloat((parseFloat(b.weight.replace(',', '.')) || 0).toFixed(3)),
        })),
      );
    }

    setSaving(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success-50 via-white to-success-50 flex items-center justify-center px-5">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-success-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Beneficiamento registrado com sucesso!</h2>
          <p className="text-gray-500 mb-8">O registro foi salvo no sistema.</p>
          <div className="space-y-3 max-w-xs mx-auto">
            <button onClick={() => { setSaved(false); setStep(0); resetForm(); }} className="btn-primary w-full">
              Novo Beneficiamento
            </button>
            <button onClick={onBack} className="btn-secondary w-full">Voltar ao Início</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">Novo Beneficiamento</h1>
            <p className="text-xs text-gray-500">Etapa {step + 1} de {STEPS.length}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto px-5 pb-3">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Step icons */}
      <div className="max-w-2xl mx-auto px-5 pt-4">
        <div className="flex justify-between mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-1 transition-all ${i === step ? 'scale-110' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${i < step ? 'bg-success-500 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${i === step ? 'text-primary-600' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 pb-32">
        <div className="card p-6 animate-fade-in">
          {/* Step 0: General Info */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Informações Gerais</h2>
              <div>
                <label className="label-field">Responsável *</label>
                <select className="input-field" value={responsible} onChange={(e) => setResponsible(e.target.value)}>
                  <option value="">Selecione...</option>
                  {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                  <option value="__other">Outro...</option>
                </select>
                {responsible === '__other' && (
                  <input className="input-field mt-2" placeholder="Digite o nome" onChange={(e) => setResponsible(e.target.value)} />
                )}
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
                <label className="label-field">Unidade</label>
                <select className="input-field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Proteína *</label>
                <select className="input-field" value={proteinId} onChange={(e) => {
                  const id = e.target.value;
                  setProteinId(id);
                  const p = proteins.find(prot => prot.id === id);
                  if (p && p.purchase_price) {
                    setPricePerKg(p.purchase_price.toString().replace('.', ','));
                  }
                }}>
                  <option value="">Selecione...</option>
                  {proteins.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.category ? ` (${p.category.name})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Gross Weight + Before Photo */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Peso Inicial</h2>
              <div>
                <label className="label-field">Peso Bruto (kg) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-field text-2xl font-bold text-center"
                  placeholder="0,000"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1 text-center">Ex: 15,320</p>
              </div>

              <div>
                <label className="label-field">Foto Inicial</label>
                {beforePhoto ? (
                  <div className="relative">
                    <img src={beforePhoto} alt="Foto inicial" className="w-full rounded-xl object-cover max-h-64" />
                    <button
                      onClick={() => setBeforePhoto(null)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBeforePhoto(f); }}
                    />
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all">
                      {photoUploading ? (
                        <p className="text-sm text-gray-400">Enviando...</p>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Tirar Foto ou Selecionar imagem</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Processing Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Beneficiamento</h2>
                <p className="text-xs text-gray-400 mt-0.5">Clique nos cortes abaixo para adicioná-los</p>
              </div>

              {/* Quick-add chips */}
              {proteinCuts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {proteinCuts.map((c) => {
                    const alreadyAdded = items.filter((i) => i.cut_name === c.name).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setItems((prev) => [
                            ...prev.filter((i) => i.cut_name !== '' || i.quantity !== '0'),
                            { cut_name: c.name, quantity: '1', gramatura: String(c.gramatura), total_weight: (c.gramatura) / 1000 },
                          ]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {c.name}
                        {c.gramatura > 0 && <span className="opacity-60 text-xs">({c.gramatura}g)</span>}
                        {alreadyAdded > 0 && (
                          <span className="bg-primary-200 text-primary-800 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {alreadyAdded}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium hover:border-gray-400 hover:text-gray-700 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Outro
                  </button>
                </div>
              )}

              {proteinCuts.length === 0 && (
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-4 h-4" /> Adicionar corte manualmente
                </button>
              )}

              {/* Added items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cortes adicionados</p>
                  {items.map((item, idx) => {
                    return (
                      <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          {item.cut_name !== '' ? (
                            <span className="font-semibold text-gray-900 text-sm">{item.cut_name}</span>
                          ) : (
                            <select
                              className="input-field py-1.5 text-sm flex-1 mr-2"
                              value={item.cut_name}
                              onChange={(e) => updateItem(idx, 'cut_name', e.target.value)}
                            >
                              <option value="">Selecione o corte...</option>
                              {proteinCuts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                          )}
                          <button
                            onClick={() => removeItem(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-500 transition-colors ml-2 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Quantity stepper */}
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <button
                              onClick={() => updateItem(idx, 'quantity', Math.max(0, parseInt(item.quantity) - 1))}
                              className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 font-bold text-base transition-colors"
                            >−</button>
                            <input
                              type="number"
                              className="w-14 text-center py-1.5 text-sm font-bold text-gray-900 outline-none border-x border-gray-200"
                              value={item.quantity || ''}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            />
                            <button
                              onClick={() => updateItem(idx, 'quantity', (parseInt(item.quantity) || 0) + 1)}
                              className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 font-bold text-base transition-colors"
                            >+</button>
                          </div>
                          <span className="text-xs text-gray-400">un ×</span>
                          {/* Gramatura */}
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="input-field py-1.5 text-sm text-center w-20"
                              value={item.gramatura || ''}
                              onChange={(e) => updateItem(idx, 'gramatura', e.target.value)}
                            />
                            <span className="text-xs text-gray-400">g</span>
                          </div>
                          {/* Weight badge */}
                          <div className="bg-primary-50 px-2.5 py-1.5 rounded-lg flex-shrink-0">
                            <span className="text-xs font-bold text-primary-700">{formatWeight(item.total_weight)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {items.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Scissors className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum corte adicionado ainda</p>
                </div>
              )}

              {/* Total */}
              {producedWeight > 0 && (
                <div className="bg-primary-50 rounded-xl px-4 py-3 flex justify-between items-center border border-primary-100">
                  <span className="text-sm font-semibold text-primary-700">Total Produzido</span>
                  <span className="text-xl font-bold text-primary-700">{formatWeight(producedWeight)}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Byproducts */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Subprodutos</h2>
                  <p className="text-xs text-gray-400">Opcional</p>
                </div>
                <button onClick={addByproduct} className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              {byproducts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum subproduto adicionado</p>
                </div>
              )}

              <div className="space-y-3">
                {byproducts.map((bp, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4 flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="label-field">Descrição</label>
                      <input
                        className="input-field"
                        placeholder="Ex: Retalho, Osso, Gordura..."
                        value={bp.description}
                        onChange={(e) => updateByproduct(idx, 'description', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <label className="label-field">Peso (kg)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input-field"
                        placeholder="0,000"
                        value={bp.weight || ''}
                        onChange={(e) => updateByproduct(idx, 'weight', e.target.value)}
                      />
                    </div>
                    <button onClick={() => removeByproduct(idx)} className="text-error-500 hover:text-error-600 pb-3">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {byproducts.length > 0 && (
                <div className="bg-accent-50 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-accent-600">Total Subprodutos</span>
                  <span className="text-lg font-bold text-accent-600">{formatWeight(byproductWeight)}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: After Photo */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Foto Final</h2>
              <p className="text-sm text-gray-500">Anexe uma foto mostrando o beneficiamento pronto.</p>

              {afterPhoto ? (
                <div className="relative">
                  <img src={afterPhoto} alt="Foto final" className="w-full rounded-xl object-cover max-h-64" />
                  <button
                    onClick={() => setAfterPhoto(null)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAfterPhoto(f); }}
                  />
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all">
                    {photoUploading ? (
                      <p className="text-sm text-gray-400">Enviando...</p>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Tirar Foto ou Selecionar imagem</p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900">Resumo</h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Peso Inicial</span>
                  <span className="font-semibold text-gray-900">{formatWeight(grossNum)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Peso Produzido</span>
                  <span className="font-semibold text-success-600">{formatWeight(producedWeight)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Subprodutos</span>
                  <span className="font-semibold text-accent-600">{formatWeight(byproductWeight)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Perda</span>
                  <span className={`font-semibold ${isLossExceeded ? 'text-error-600' : 'text-gray-900'}`}>{formatWeight(lossWeight)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-500">Percentual de Perda</span>
                  <span className={`font-bold text-lg ${isLossExceeded ? 'text-error-600' : 'text-gray-900'}`}>{formatPercent(lossPercentage)}</span>
                </div>
              </div>

              {isLossExceeded && (
                <div className="bg-error-50 border border-error-200 rounded-xl p-4 flex gap-3 animate-scale-in">
                  <AlertTriangle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-error-700">Perda acima do esperado!</p>
                    <p className="text-xs text-error-600 mt-0.5">
                      A perda de {formatPercent(lossPercentage)} ultrapassa o limite de {formatPercent(maxLoss)}.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cortes</p>
                {items.filter((i) => i.cut_name).map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{i.cut_name} × {i.quantity}</span>
                    <span className="text-gray-900 font-medium">{formatWeight(i.total_weight)}</span>
                  </div>
                ))}
                {byproducts.filter((b) => b.description).length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Subprodutos</p>
                    {byproducts.filter((b) => b.description).map((b, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600">{b.description}</span>
                        <span className="text-gray-900 font-medium">{formatWeight(b.weight)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-5 py-4 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1 flex items-center justify-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary flex-1 flex items-center justify-center gap-1"
            >
              Avançar <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-1">
              {saving ? 'Salvando...' : <><Check className="w-4 h-4" /> Salvar Beneficiamento</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function resetForm() {
    setResponsible('');
    setProteinId('');
    setUnitId('');
    setGrossWeight('');
    setBeforePhoto(null);
    setAfterPhoto(null);
    setItems([{ cut_name: '', quantity: '0', gramatura: '0', total_weight: 0 }]);
    setByproducts([]);
  }
}
