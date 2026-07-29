import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Loader2, ShoppingCart, Beef, AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Dish, Protein, Cut } from '../../lib/types';

interface BuyItem {
  id: string; // unique internal id
  name: string;
  quantity: number;
  isDish: boolean;
  matchedDish?: string;
  needsReview?: boolean;
}

interface ProteinRequirement {
  proteinName: string;
  proteinId: string;
  totalRawWeight: number; // in grams
  expectedLoss: number;
}

export function AdminPurchases() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  
  const [dbDishes, setDbDishes] = useState<Dish[]>([]);
  const [dbProteins, setDbProteins] = useState<Protein[]>([]);
  const [dbCuts, setDbCuts] = useState<Cut[]>([]);

  const [rawItems, setRawItems] = useState<BuyItem[]>([]);
  const [buyItems, setBuyItems] = useState<BuyItem[]>([]);
  
  const [proteinReqs, setProteinReqs] = useState<ProteinRequirement[]>([]);
  const [otherItems, setOtherItems] = useState<{name: string, quantity: number}[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Load data once
  useEffect(() => {
    (async () => {
      const [dishesRes, proteinsRes, cutsRes] = await Promise.all([
        supabase.from('dishes').select('*, items:dish_items(*)'),
        supabase.from('proteins').select('*').eq('active', true),
        supabase.from('cuts').select('*').eq('active', true)
      ]);
      if (dishesRes.data) setDbDishes(dishesRes.data as Dish[]);
      if (proteinsRes.data) setDbProteins(proteinsRes.data as Protein[]);
      if (cutsRes.data) setDbCuts(cutsRes.data as Cut[]);
    })();
  }, []);

  // Run calculation whenever rawItems changes
  useEffect(() => {
    calculateNeeds(rawItems);
  }, [rawItems, dbDishes, dbProteins, dbCuts]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Por favor, envie apenas arquivos PDF.');
      return;
    }

    if (!apiKey) {
      setError('Chave de API do Gemini não configurada nas Variáveis de Ambiente.');
      return;
    }

    setError('');
    setLoading(true);
    setRawItems([]);

    try {
      setStatusText('Lendo o arquivo PDF...');
      const base64Data = await fileToBase64(file);

      setStatusText('Enviando para a Inteligência Artificial...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const dishNames = dbDishes.map(d => d.name).join(', ');

      const prompt = `Você é um assistente de compras para um restaurante. 
Eu vou te enviar um relatório de Curva ABC (vendas) em PDF.
Extraia todos os itens vendidos e suas respectivas quantidades.
Aqui está a lista de pratos que temos cadastrados no sistema: [${dishNames}].

Para cada item no PDF:
1. Verifique se ele corresponde exatamente a um prato da lista. Se sim: is_dish=true, matched_dish_name="nome exato", needs_review=false.
2. Verifique se ele PARECE ser um prato da lista, mas está escrito diferente (ex: "Filet Al Formaggio" vs "Filé ao Formaggio"). Se sim: is_dish=true, matched_dish_name="nome mais provável da lista", needs_review=true.
3. Se o nome contiver palavras como "Prato", "Filé", "Salmão", "Camarão" e você achar que deveria ser um prato mas não tem certeza de qual: is_dish=true, matched_dish_name=null, needs_review=true.
4. Se for bebida (ex: Coca, Água) ou item direto, ou se você tiver certeza absoluta que não é um prato da lista: is_dish=false, matched_dish_name=null, needs_review=false.

Retorne APENAS um JSON válido no formato exato:
{
  "items": [
    {
      "name_in_pdf": "string",
      "quantity": number,
      "is_dish": boolean,
      "matched_dish_name": "string ou null",
      "needs_review": boolean
    }
  ]
}`;

      let result;
      try {
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data.split(',')[1],
              mimeType: 'application/pdf'
            }
          }
        ]);
      } catch (genErr: any) {
        if (genErr.message?.includes('404')) {
          setStatusText('Buscando modelos compatíveis com a sua chave...');
          const modelsReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const modelsData = await modelsReq.json();
          const availableModels = (modelsData.models || []).map((m: any) => m.name).join(', ');
          throw new Error(`O modelo de IA selecionado não está disponível para a sua conta/chave. Modelos disponíveis: ${availableModels}`);
        }
        throw genErr;
      }

      setStatusText('Processando resposta...');
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA não retornou um JSON válido.");
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.items || !Array.isArray(parsed.items)) throw new Error("Formato JSON incorreto.");

      const newRawItems: BuyItem[] = parsed.items.map((item: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: item.name_in_pdf,
        quantity: parseFloat(item.quantity) || 0,
        isDish: item.is_dish,
        matchedDish: item.matched_dish_name,
        needsReview: item.needs_review
      })).filter((i: BuyItem) => i.quantity > 0);

      setRawItems(newRawItems);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const calculateNeeds = (items: BuyItem[]) => {
    if (!items || items.length === 0) {
      setBuyItems([]);
      setProteinReqs([]);
      setOtherItems([]);
      return;
    }

    const proteinMap: Record<string, ProteinRequirement> = {};
    const others: {name: string, quantity: number}[] = [];
    const finalBuyItems: BuyItem[] = [];

    for (const item of items) {
      const finalItem = { ...item };

      if (item.isDish && !item.needsReview && item.matchedDish) {
        const dish = dbDishes.find(d => d.name.toLowerCase() === item.matchedDish?.toLowerCase());
        if (dish && dish.items) {
          dish.items.forEach(di => {
            if (di.item_type === 'cut') {
              const cut = dbCuts.find(c => c.name === di.name);
              if (cut) {
                const protein = dbProteins.find(p => p.id === cut.protein_id);
                if (protein) {
                  const netWeightNeeded = cut.gramatura * di.quantity * item.quantity;
                  const lossFactor = protein.expected_loss / 100;
                  const rawWeightNeeded = lossFactor >= 1 ? netWeightNeeded : netWeightNeeded / (1 - lossFactor);

                  if (!proteinMap[protein.id]) {
                    proteinMap[protein.id] = {
                      proteinName: protein.name,
                      proteinId: protein.id,
                      totalRawWeight: 0,
                      expectedLoss: protein.expected_loss
                    };
                  }
                  proteinMap[protein.id].totalRawWeight += rawWeightNeeded;
                }
              }
            } else {
              others.push({ name: `${di.name} (para ${item.quantity}x ${dish.name})`, quantity: di.quantity * item.quantity });
            }
          });
        } else {
          // Fallback if dish not found in DB
          others.push({ name: item.name, quantity: item.quantity });
        }
      } else if (!item.needsReview) {
        others.push({ name: item.name, quantity: item.quantity });
      }

      finalBuyItems.push(finalItem);
    }

    setBuyItems(finalBuyItems);
    setProteinReqs(Object.values(proteinMap).sort((a,b) => b.totalRawWeight - a.totalRawWeight));
    
    const aggregatedOthers: Record<string, number> = {};
    others.forEach(o => {
      const key = o.name.toLowerCase();
      aggregatedOthers[key] = (aggregatedOthers[key] || 0) + o.quantity;
    });
    setOtherItems(Object.entries(aggregatedOthers).map(([name, qty]) => ({
      name: others.find(o => o.name.toLowerCase() === name)?.name || name, 
      quantity: qty
    })).sort((a,b) => b.quantity - a.quantity));
  };

  const handleResolveMatch = (itemId: string, selectedDishName: string) => {
    setRawItems(prev => prev.map(i => {
      if (i.id === itemId) {
        if (selectedDishName === 'NAO_E_PRATO') {
          return { ...i, isDish: false, matchedDish: undefined, needsReview: false };
        }
        return { ...i, isDish: true, matchedDish: selectedDishName, needsReview: false };
      }
      return i;
    }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const itemsToReview = rawItems.filter(i => i.needsReview);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sugestão de Compras (IA)</h1>
        <p className="text-sm text-gray-500">Envie o relatório da Curva ABC e a IA calculará suas compras automaticamente.</p>
      </div>

      {!apiKey && (
        <div className="bg-warning-50 border border-warning-200 p-4 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-warning-800">Variável de Ambiente Ausente</h3>
            <p className="text-sm text-warning-700 mt-1">A chave <code className="bg-warning-100 px-1 rounded">VITE_GEMINI_API_KEY</code> não foi encontrada nas variáveis de ambiente. Configure no seu arquivo .env local ou no painel da Vercel.</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="card p-8">
        <input 
          type="file" 
          accept="application/pdf" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload}
        />
        
        {loading ? (
          <div className="text-center py-12 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-4" />
            <p className="font-semibold text-gray-900">{statusText}</p>
            <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos dependendo do tamanho do relatório...</p>
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-200 hover:border-primary-400 bg-gray-50 hover:bg-primary-50 transition-colors rounded-2xl p-12 text-center cursor-pointer flex flex-col items-center justify-center"
            onClick={() => apiKey && fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Enviar Relatório Curva ABC</h3>
            <p className="text-sm text-gray-500 mt-1">Clique para selecionar o PDF (até 10MB)</p>
          </div>
        )}
        
        {error && <p className="text-sm text-error-600 mt-4 text-center">{error}</p>}
      </div>

      {/* Interactive Review Box */}
      {itemsToReview.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-2xl p-5 space-y-4 shadow-sm animate-slide-up">
          <div className="flex items-center gap-3 border-b border-warning-200 pb-3">
            <HelpCircle className="w-6 h-6 text-warning-600" />
            <div>
              <h2 className="font-bold text-warning-900">⚠️ Itens que precisam da sua atenção</h2>
              <p className="text-sm text-warning-800">A Inteligência Artificial encontrou nomes parecidos com os seus pratos, mas não tem certeza. Confirme as associações abaixo para prosseguir com o cálculo exato:</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {itemsToReview.map((item) => (
              <div key={item.id} className="bg-white border border-warning-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Item no PDF:</p>
                  <p className="font-bold text-gray-900">{item.name} <span className="font-normal text-gray-500 text-sm">({item.quantity} un)</span></p>
                </div>
                
                <div className="flex-1 max-w-sm flex gap-2">
                  <select 
                    className="input-field bg-gray-50 text-sm"
                    defaultValue={item.matchedDish || ""}
                    id={`select-${item.id}`}
                  >
                    <option value="" disabled>Selecione o prato real...</option>
                    <option value="NAO_E_PRATO">-- Não é um prato (Venda Direta) --</option>
                    {dbDishes.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const select = document.getElementById(`select-${item.id}`) as HTMLSelectElement;
                      if (select && select.value) handleResolveMatch(item.id, select.value);
                    }}
                    className="btn-primary whitespace-nowrap px-3 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> OK
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Area */}
      {buyItems.length > 0 && itemsToReview.length === 0 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Proteínas */}
            <div className="card overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <Beef className="w-5 h-5 text-primary-600" />
                <h2 className="font-bold text-gray-900">Proteínas para Comprar (Peso Bruto)</h2>
              </div>
              <div className="p-0 flex-1">
                {proteinReqs.length === 0 ? (
                  <p className="p-6 text-center text-gray-400 text-sm">Nenhuma proteína encontrada nas vendas.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {proteinReqs.map((p, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <h3 className="font-bold text-gray-900">{p.proteinName}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Considerando perda de {p.expectedLoss}%</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-primary-700">{(p.totalRawWeight / 1000).toFixed(2).replace('.', ',')} Kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Outros */}
            <div className="card overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-accent-600" />
                <h2 className="font-bold text-gray-900">Outros Itens e Insumos</h2>
              </div>
              <div className="p-0 flex-1 overflow-y-auto max-h-[400px]">
                {otherItems.length === 0 ? (
                  <p className="p-6 text-center text-gray-400 text-sm">Nenhum outro item encontrado.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {otherItems.map((o, idx) => (
                      <div key={idx} className="p-3 px-4 flex items-center justify-between hover:bg-gray-50">
                        <span className="text-sm font-medium text-gray-700">{o.name}</span>
                        <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{o.quantity} un</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Breakdown / Log */}
          <div className="card">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900 text-sm">Registro Detalhado da Leitura</h2>
            </div>
            <div className="p-4 text-xs text-gray-600 max-h-60 overflow-y-auto space-y-2">
              {buyItems.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <span className="font-bold min-w-[20px]">{item.quantity}x</span>
                  <span>{item.name}</span>
                  {item.isDish && item.matchedDish ? (
                    <span className="text-success-600 font-medium">→ Reconhecido como Prato: {item.matchedDish}</span>
                  ) : (
                    <span className="text-gray-400 italic">→ Venda direta</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
