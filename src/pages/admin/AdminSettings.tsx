import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Users, Tag, Settings as SettingsIcon, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Unit, Employee, Category } from '../../lib/types';

type Tab = 'units' | 'employees' | 'categories' | 'parameters';

export function AdminSettings() {
  const [tab, setTab] = useState<Tab>('units');

  const tabs = [
    { key: 'units' as Tab, label: 'Unidades', icon: Building2 },
    { key: 'employees' as Tab, label: 'Responsáveis', icon: Users },
    { key: 'categories' as Tab, label: 'Categorias', icon: Tag },
    { key: 'parameters' as Tab, label: 'Parâmetros', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Gerencie unidades, responsáveis, categorias e parâmetros</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'units' && <UnitsTab />}
      {tab === 'employees' && <EmployeesTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'parameters' && <ParametersTab />}
    </div>
  );
}

function UnitsTab() {
  const [items, setItems] = useState<Unit[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { fetch(); }, []);
  const fetch = async () => {
    const { data } = await supabase.from('units').select('*').order('name');
    if (data) setItems(data);
  };

  const add = async () => {
    if (!name.trim()) return;
    await supabase.from('units').insert({ name: name.trim() });
    setName('');
    fetch();
  };

  const toggle = async (u: Unit) => {
    await supabase.from('units').update({ active: !u.active }).eq('id', u.id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('units').delete().eq('id', id);
    fetch();
  };

  return (
    <div className="card p-5">
      <div className="flex gap-2 mb-4">
        <input className="input-field flex-1" placeholder="Nova unidade..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-primary flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar</button>
      </div>
      <div className="space-y-2">
        {items.map((u) => (
          <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{u.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(u)} className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                {u.active ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => remove(u.id)} className="text-gray-400 hover:text-error-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhuma unidade cadastrada</p>}
      </div>
    </div>
  );
}

function EmployeesTab() {
  const [items, setItems] = useState<Employee[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { fetch(); }, []);
  const fetch = async () => {
    const { data } = await supabase.from('employees').select('*').order('name');
    if (data) setItems(data);
  };

  const add = async () => {
    if (!name.trim()) return;
    await supabase.from('employees').insert({ name: name.trim() });
    setName('');
    fetch();
  };

  const toggle = async (e: Employee) => {
    await supabase.from('employees').update({ active: !e.active }).eq('id', e.id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    fetch();
  };

  return (
    <div className="card p-5">
      <div className="flex gap-2 mb-4">
        <input className="input-field flex-1" placeholder="Novo responsável..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-primary flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar</button>
      </div>
      <div className="space-y-2">
        {items.map((e) => (
          <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{e.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(e)} className={`text-xs px-2 py-0.5 rounded-full ${e.active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                {e.active ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => remove(e.id)} className="text-gray-400 hover:text-error-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum responsável cadastrado</p>}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { fetch(); }, []);
  const fetch = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setItems(data);
  };

  const add = async () => {
    if (!name.trim()) return;
    await supabase.from('categories').insert({ name: name.trim() });
    setName('');
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    fetch();
  };

  return (
    <div className="card p-5">
      <div className="flex gap-2 mb-4">
        <input className="input-field flex-1" placeholder="Nova categoria..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-primary flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar</button>
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{c.name}</span>
            </div>
            <button onClick={() => remove(c.id)} className="text-gray-400 hover:text-error-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhuma categoria cadastrada</p>}
      </div>
    </div>
  );
}

function ParametersTab() {
  const [maxLoss, setMaxLoss] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('*');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
        setMaxLoss(map['max_loss_percentage'] || '10');
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('settings').upsert({ key: 'max_loss_percentage', value: maxLoss });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card p-5 space-y-5 max-w-md">
      <div>
        <label className="label-field">Percentual Máximo de Perda (%)</label>
        <input className="input-field" inputMode="decimal" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} placeholder="Ex: 10" />
        <p className="text-xs text-gray-400 mt-1">Acima deste valor, alertas de perda serão exibidos</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Parâmetros'}
        </button>
        {saved && <span className="text-sm text-success-600 animate-fade-in">Salvo!</span>}
      </div>
    </div>
  );
}
