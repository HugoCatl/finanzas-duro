'use client';

import { eur } from '@/lib/format';

export function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name?: string; value?: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    // Flota sobre el gráfico: es el único sitio donde una sombra tiene sentido. taste-skill-ignore
    <div className="rounded-control border border-line bg-surface-2 px-3 py-2 text-small shadow-lg">
      {label && <p className="mb-1 text-muted">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="num">{p.name ? `${p.name}: ` : ''}{eur(Number(p.value))}</p>
      ))}
    </div>
  );
}
