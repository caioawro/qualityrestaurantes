import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Loader2, ShoppingCart, Beef, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Dish, Protein, Cut } from '../../lib/types';

interface BuyItem {
  name: string;
  quantity: number;
  isDish: boolean;
  matchedDish?: string;
  rawProteinNeeds?: {
    proteinName: string;
    proteinId: string;
    rawWeightRequired: number; // in grams
  }[];
}

interface ProteinRequirement {
  proteinName: string;
  proteinId: string;
  totalRawWeight: number; // in grams
  expectedLoss: number;
}

export function AdminPurchases() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  
  const [buyItems, setBuyItems] = useState<BuyItem[]>([]);
  const [proteinReqs, setProteinReqs] = useState<ProteinRequirement[]>([]);
  const [otherItems, setOtherItems] = useState<{name: string, quantity: number}[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_api_key').single();
      if (data?.value) setApiKey(data.value);
    })();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Por favor, envie apenas arquivos PDF.');
      return;
    }

    if (!apiKey) {
      setError('Chave de API do Gemini não configurada. Vá em Configurações > Parâmetros.');
      return;
    }

    setError('');
    setLoading(true);
    setBuyItems([]);
    setProteinReqs([]);
    setOtherItems([]);

    try {
      setStatusText('Carregando dados do sistema...');
      const [dishesRes, proteinsRes, cutsRes] = await Promise.all([
        supabase.from('dishes').select('*, items:dish_items(*)'),
        supabase.from('proteins').select('*').eq('active', true),
        supabase.from('cuts').select('*').eq('active', true)
      ]);

      const dishes = (dishesRes.data || []) as Dish[];
      const proteins = (proteinsRes.data || []) as Protein[];
      const cuts = (cutsRes.data || []) as Cut[];

      setStatusText('Lendo o arquivo PDF...');
      const base64Data = await fileToBase64(file);

      setStatusText('Enviando para a Inteligência Artificial...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const dishNames = dishes.map(d => d.name).join(', ');

      const prompt = `Você é um assistente de compras para um restaurante. 
Eu vou te enviar um relatório de Curva ABC (vendas) em PDF.
Extraia todos os itens vendidos e suas respectivas quantidades.
Aqui está a lista de pratos que temos cadastrados no sistema: [${dishNames}].

Para cada item encontrado no PDF, verifique se ele se parece com algum dos pratos cadastrados. Se sim, marque is_dish como true e retorne o nome exato do prato cadastrado em matched_dish_name.
Se não for um prato da lista (ex: Coca-cola, Água, massas extras, itens de revenda direta), marque is_dish como false.

Retorne APENAS um JSON válido no seguinte formato exato, sem marcações ou texto adicional:
{
  "items": [
    {
      "name_in_pdf": "nome original no pdf",
      "quantity": 10,
      "is_dish": true/false,
      "matched_dish_name": "nome exato da lista de pratos, caso is_dish seja true"
    }
  ]
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: 'application/pdf'
          }
        }
      ]);

      setStatusText('Calculando insumos necessários...');
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA não retornou um JSON válido.");
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.items || !Array.isArray(parsed.items)) throw new Error("Formato JSON incorreto retornado pela IA.");

      // Calculation Logic
      const finalItems: BuyItem[] = [];
      const proteinMap: Record<string, ProteinRequirement> = {};
      const others: {name: string, quantity: number}[] = [];

      for (const item of parsed.items) {
        const qty = parseFloat(item.quantity) || 0;
        if (qty <= 0) continue;

        const buyItem: BuyItem = {
          name: item.name_in_pdf,
          quantity: qty,
          isDish: item.is_dish,
          matchedDish: item.matched_dish_name,
        };

        if (item.is_dish && item.matched_dish_name) {
          const dish = dishes.find(d => d.name.toLowerCase() === item.matched_dish_name.toLowerCase());
          if (dish && dish.items) {
            buyItem.rawProteinNeeds = [];
            
            dish.items.forEach(di => {
              if (di.item_type === 'cut') {
                const cut = cuts.find(c => c.name === di.name);
                if (cut) {
                  const protein = proteins.find(p => p.id === cut.protein_id);
                  if (protein) {
                    const netWeightNeeded = cut.gramatura * di.quantity * qty;
                    // Example: if loss is 20 (0.2), to get 800g net we need 800 / (1 - 0.2) = 1000g raw
                    const lossFactor = protein.expected_loss / 100;
                    const rawWeightNeeded = lossFactor >= 1 ? netWeightNeeded : netWeightNeeded / (1 - lossFactor);

                    buyItem.rawProteinNeeds!.push({
                      proteinName: protein.name,
                      proteinId: protein.id,
                      rawWeightRequired: rawWeightNeeded
                    });

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
                // Manual items inside dishes (e.g., fettuccine)
                others.push({ name: `${di.name} (para ${qty}x ${dish.name})`, quantity: di.quantity * qty });
              }
            });
          } else {
            // Matched dish not found exactly, treat as other
            others.push({ name: item.name_in_pdf, quantity: qty });
          }
        } else {
          // Direct item
          others.push({ name: item.name_in_pdf, quantity: qty });
        }

        finalItems.push(buyItem);
      }

      setBuyItems(finalItems);
      setProteinReqs(Object.values(proteinMap).sort((a,b) => b.totalRawWeight - a.totalRawWeight));
      
      // Aggregate others with same name
      const aggregatedOthers: Record<string, number> = {};
      others.forEach(o => {
        const key = o.name.toLowerCase();
        aggregatedOthers[key] = (aggregatedOthers[key] || 0) + o.quantity;
      });
      setOtherItems(Object.entries(aggregatedOthers).map(([name, qty]) => ({
        name: others.find(o => o.name.toLowerCase() === name)?.name || name, 
        quantity: qty
      })).sort((a,b) => b.quantity - a.quantity));

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

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
            <h3 className="text-sm font-bold text-warning-800">Chave da API ausente</h3>
            <p className="text-sm text-warning-700 mt-1">Para utilizar essa inteligência artificial, você precisa configurar a Chave de API do Gemini nas Configurações.</p>
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

      {/* Results Area */}
      {buyItems.length > 0 && (
        <div className="space-y-6">
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
              {buyItems.map((item, idx) => (
                <div key={idx} className="flex gap-2">
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
