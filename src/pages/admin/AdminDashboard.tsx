import { useState, useEffect, useMemo } from 'react';
import {
  Package, Scale, TrendingDown, TrendingUp, Award, AlertTriangle,

} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Processing } from '../../lib/types';
import { formatWeight, formatPercent, formatDate } from '../../lib/format';

export function AdminDashboard() {
  const [records, setRecords] = useState<Processing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('processing')
        .select('*, protein:proteins(*), unit:units(*), items:processing_items(*)')
        .order('processing_date', { ascending: false })
        .limit(500);
      if (data) setRecords(data as Processing[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = records.length;
    const totalGross = records.reduce((s, r) => s + r.gross_weight, 0);
    const totalProduced = records.reduce((s, r) => s + r.produced_weight, 0);
    const totalLoss = records.reduce((s, r) => s + r.loss_weight, 0);
    const avgLoss = total > 0 ? records.reduce((s, r) => s + r.loss_percentage, 0) / total : 0;

    const sorted = [...records].sort((a, b) => a.loss_percentage - b.loss_percentage);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return { total, totalGross, totalProduced, totalLoss, avgLoss, best, worst };
  }, [records]);

  // Chart: processing per day (last 14 days)
  const perDay = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      const d = r.processing_date;
      map[d] = (map[d] || 0) + 1;
    });
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      days.push({ date: ds, count: map[ds] || 0 });
    }
    return days;
  }, [records]);

  // Chart: loss per protein
  const lossPerProtein = useMemo(() => {
    const map: Record<string, { name: string; color: string; totalLoss: number; count: number }> = {};
    records.forEach((r) => {
      if (!r.protein) return;
      const key = r.protein_id;
      if (!map[key]) map[key] = { name: r.protein.name, color: r.protein.color, totalLoss: 0, count: 0 };
      map[key].totalLoss += r.loss_percentage;
      map[key].count += 1;
    });
    return Object.values(map).map((v) => ({ name: v.name, color: v.color, avgLoss: v.count > 0 ? v.totalLoss / v.count : 0 }))
      .sort((a, b) => b.avgLoss - a.avgLoss);
  }, [records]);

  // Chart: loss evolution (last 14 days, avg loss per day)
  const lossEvolution = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    records.forEach((r) => {
      const d = r.processing_date;
      if (!map[d]) map[d] = { total: 0, count: 0 };
      map[d].total += r.loss_percentage;
      map[d].count += 1;
    });
    const days: { date: string; avg: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const entry = map[ds];
      days.push({ date: ds, avg: entry ? entry.total / entry.count : 0 });
    }
    return days;
  }, [records]);

  // Top operators
  const topOperators = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalLoss: number }> = {};
    records.forEach((r) => {
      if (!map[r.responsible]) map[r.responsible] = { name: r.responsible, count: 0, totalLoss: 0 };
      map[r.responsible].count += 1;
      map[r.responsible].totalLoss += r.loss_percentage;
    });
    return Object.values(map)
      .map((v) => ({ name: v.name, count: v.count, avgLoss: v.count > 0 ? v.totalLoss / v.count : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [records]);

  // Proteins with highest loss
  const proteinLossTable = useMemo(() => {
    return lossPerProtein.slice(0, 5);
  }, [lossPerProtein]);

  // Recent records
  const recent = useMemo(() => records.slice(0, 10), [records]);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral dos beneficiamentos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Package} label="Beneficiamentos" value={String(stats.total)} color="primary" />
        <KPICard icon={Scale} label="Peso Beneficiado" value={formatWeight(stats.totalGross)} color="accent" />
        <KPICard icon={TrendingUp} label="Peso Produzido" value={formatWeight(stats.totalProduced)} color="success" />
        <KPICard icon={TrendingDown} label="Peso Perdido" value={formatWeight(stats.totalLoss)} color="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard icon={AlertTriangle} label="Perda Média" value={formatPercent(stats.avgLoss)} color="warning" />
        <KPICard icon={Award} label="Melhor Rendimento" value={stats.best ? `${stats.best.protein?.name} (${formatPercent(stats.best.loss_percentage)})` : '—'} color="success" />
        <KPICard icon={AlertTriangle} label="Maior Perda" value={stats.worst ? `${stats.worst.protein?.name} (${formatPercent(stats.worst.loss_percentage)})` : '—'} color="error" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Processing per day */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Beneficiamentos por dia</h3>
          <BarChart data={perDay.map((d) => ({ label: d.date.slice(8), value: d.count }))} color="#0ea5e9" />
        </div>

        {/* Loss per protein */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Perda por proteína (%)</h3>
          {lossPerProtein.length > 0 ? (
            <div className="space-y-3">
              {lossPerProtein.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{p.name}</span>
                    <span className="font-medium text-gray-900">{formatPercent(p.avgLoss)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(p.avgLoss * 5, 100)}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Sem dados</p>}
        </div>

        {/* Loss evolution */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Evolução das perdas (%)</h3>
          <LineChart data={lossEvolution.map((d) => ({ label: d.date.slice(8), value: d.avg }))} />
        </div>

        {/* Top operators */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top operadores</h3>
          {topOperators.length > 0 ? (
            <div className="space-y-3">
              {topOperators.map((op, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-accent-100 text-accent-600' : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{op.name}</p>
                    <p className="text-xs text-gray-400">{op.count} beneficiamento(s)</p>
                  </div>
                  <span className={`text-sm font-semibold ${op.avgLoss > 10 ? 'text-error-600' : 'text-gray-700'}`}>{formatPercent(op.avgLoss)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Sem dados</p>}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent records */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Últimos beneficiamentos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Proteína</th>
                  <th className="pb-2 font-medium">Resp.</th>
                  <th className="pb-2 font-medium text-right">Perda</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">{formatDate(r.processing_date)}</td>
                    <td className="py-2 text-gray-900 font-medium">{r.protein?.name || '—'}</td>
                    <td className="py-2 text-gray-600">{r.responsible}</td>
                    <td className={`py-2 text-right font-medium ${r.loss_percentage > 10 ? 'text-error-600' : 'text-gray-700'}`}>{formatPercent(r.loss_percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Proteins with highest loss */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Proteínas com maior perda</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Proteína</th>
                  <th className="pb-2 font-medium text-right">Perda Média</th>
                </tr>
              </thead>
              <tbody>
                {proteinLossTable.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
                        <span className="text-gray-900 font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className={`py-2 text-right font-medium ${p.avgLoss > 10 ? 'text-error-600' : 'text-gray-700'}`}>{formatPercent(p.avgLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
    accent: 'bg-accent-50 text-accent-600',
  };
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
    </div>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
            <div
              className="w-full rounded-t-md transition-all hover:opacity-80"
              style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, minHeight: d.value > 0 ? '4px' : '0' }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[9px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative h-32">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - (d.value / max) * 100;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#ef4444" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-400">{data[0]?.label}</span>
        <span className="text-[9px] text-gray-400">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
