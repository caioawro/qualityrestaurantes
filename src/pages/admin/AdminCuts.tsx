import { useState, useEffect } from 'react';
import { Plus, Trash2, Scissors, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Protein, Cut } from '../../lib/types';

export function AdminCuts() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGramatura, setNewGramatura] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [protRes, cutRes] = await Promise.all([
      supabase.from('proteins').select('*').order('name'),
      supabase.from('cuts').select('*').order('name'),
    ]);
    if (protRes.error) console.error('proteins error:', protRes.error);
    if (cutRes.error) console.error('cuts error:', cutRes.error);
    if (protRes.data) setProteins(protRes.data);
    if (cutRes.data) setCuts(cutRes.data);
    setLoading(false);
  };

  const handleAdd = async (proteinId: string) => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('cuts').insert({
      protein_id: proteinId,
      name: newName.trim(),
      gramatura: parseFloat(newGramatura.replace(',', '.')) || 0,
      active: true,
    });
    if (error) console.error('insert cut error:', error);
    setNewName('');
    setNewGramatura('');
    setAdding(null);
    fetchAll();
  };

  const handleDelete = async (cutId: string) => {
    const { error } = await supabase.from('cuts').delete().eq('id', cutId);
    if (error) console.error('delete cut error:', error);
    fetchAll();
  };

  const toggleActive = async (cut: Cut) => {
    const { error } = await supabase.from('cuts').update({ active: !cut.active }).eq('id', cut.id);
    if (error) console.error('toggle cut error:', error);
    fetchAll();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cortes</h1>
        <p className="text-sm text-gray-500">Gerencie os cortes por proteína</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {proteins.map((p) => {
            const proteinCuts = cuts.filter((c) => c.protein_id === p.id);
            const isOpen = expanded === p.id;
            return (
              <div key={p.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                    <Scissors className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-400">{proteinCuts.length} corte(s)</p>
                  </div>
                  {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-2 animate-fade-in">
                    {proteinCuts.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">Nenhum corte cadastrado</p>
                    )}
                    {proteinCuts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{c.name}</span>
                          <span className="text-xs text-gray-400">{c.gramatura}g</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActive(c)}
                            className={`text-xs px-2 py-0.5 rounded-full ${c.active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {c.active ? 'Ativo' : 'Inativo'}
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-error-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {adding === p.id ? (
                      <div className="bg-primary-50 rounded-lg p-3 space-y-2 animate-scale-in">
                        <div className="flex gap-2">
                          <input className="input-field flex-1" placeholder="Nome do corte" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                          <input className="input-field w-28" placeholder="Gramatura" inputMode="decimal" value={newGramatura} onChange={(e) => setNewGramatura(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAdd(p.id)} className="btn-primary flex-1 text-sm">Adicionar</button>
                          <button onClick={() => { setAdding(null); setNewName(''); setNewGramatura(''); }} className="btn-secondary flex-1 text-sm">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAdding(p.id)} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                        <Plus className="w-4 h-4" /> Adicionar corte
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
