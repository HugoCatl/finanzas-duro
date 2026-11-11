'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { pct } from '@/lib/format';
import { ChartTooltip } from './chart-tooltip';

export function AllocationDonut({ items }: { items: { name: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return <p className="py-8 text-center text-small text-muted">Aún no hay posiciones.</p>;
  return (
    <div className="flex items-center gap-5">
      <div className="size-32 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="name" animationDuration={700} animationEasing="ease-out" innerRadius="84%" outerRadius="100%" stroke="none" paddingAngle={2}>
              {items.map((i, idx) => <Cell key={`${i.name}-${idx}`} fill={i.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {items.map((i, idx) => (
          <li key={`${i.name}-${idx}`} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
            <span className="flex-1 truncate">{i.name}</span>
            <span className="num text-muted">{pct(i.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
