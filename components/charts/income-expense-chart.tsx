'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eurAxis, niceTicks } from '@/lib/format';
import { ChartTooltip } from './chart-tooltip';

export function IncomeExpenseChart({ data }: { data: { label: string; income: number; spent: number }[] }) {
  if (data.every((d) => d.income === 0 && d.spent === 0)) {
    return <p className="py-8 text-center text-small text-muted">Aún no hay movimientos en los últimos 12 meses.</p>;
  }
  const ticks = niceTicks(0, Math.max(...data.flatMap((d) => [d.income, d.spent])), 3);
  return (
    <div>
      <div className="mb-3 flex gap-4 text-small text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-gain" /> Ingresos</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-faint" /> Gastos</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer>
          <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: 'var(--faint)' }} />
            <YAxis orientation="right" width={52} axisLine={false} tickLine={false} ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]} tickFormatter={eurAxis} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
            <Tooltip cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} content={<ChartTooltip />} />
            <Bar dataKey="income" name="Ingresos" animationDuration={600} animationEasing="ease-out" fill="var(--gain)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="spent" name="Gastos" animationDuration={600} animationEasing="ease-out" fill="var(--faint)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
