export function formatWeight(kg: number): string {
  return `${kg.toFixed(3).replace('.', ',')} kg`;
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace('.', ',');
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(timeStr: string): string {
  return timeStr?.substring(0, 5) ?? '';
}

export function formatPercent(n: number): string {
  return `${n.toFixed(2).replace('.', ',')}%`;
}
