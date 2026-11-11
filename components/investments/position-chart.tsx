'use client';

import { useState } from 'react';
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { PositionPoint } from '@/lib/finance/position-history';
import { lastDays } from '@/lib/finance/position-history';
import { dayLabel, eurAxis, niceTicks } from '@/lib/format';
import { Segmented } from '@/components/ui/segmented';
import { ChartTooltip } from '@/components/charts/chart-tooltip';

const RANGES: [string, number | null][] = [['1M', 31], ['6M', 183], ['1A', 366], ['Todo', null]];

/** Valor de lo tuyo día a día (dorado), lo aportado (línea fina) y un punto en cada compra o venta. */
export function PositionChart({ points, trades, today, note }: {
  points: PositionPoint[]; trades: string[]; today: string; note?: string;
}) {
  const [range, setRange] = useState('Todo');
  const data = lastDays(points, RANGES.find(([k]) => k === range)![1]);
  const tradeDays = new Set(trades);
  const values = data.flatMap((p) => [p.value, p.contributed]);
  const ticks = values.length ? niceTicks(Math.min(...values), Math.max(...values), 3) : [0, 1];

  return (
    <div>
      <Segmented label="Periodo" value={range} onChange={setRange} options={RANGES.map(([k]) => ({ value: k, label: k }))} className="mb-4" />
      {data.length < 2 ? (
        <p className="py-16 text-center text-small text-muted">El gráfico aparecerá a partir de mañana.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pos-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="date" hide />
              <YAxis orientation="right" width={52} axisLine={false} tickLine={false} ticks={ticks}
                domain={[ticks[0], ticks[ticks.length - 1]]} tickFormatter={eurAxis} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
              <Tooltip content={<ChartTooltip />} labelFormatter={(d) => dayLabel(String(d), today)} />
              <Line type="stepAfter" dataKey="contributed" name="Aportado" stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3"
                dot={false} activeDot={false} isAnimationActive={false} />
              <Area type="linear" dataKey="value" name="Valor" stroke="var(--accent)" strokeWidth={2} fill="url(#pos-fill)" animationDuration={600}
                activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg)' }}
                dot={(p: { cx?: number; cy?: number; payload?: PositionPoint; index?: number }) => (
                  p.payload && tradeDays.has(p.payload.date) && p.cx !== undefined && p.cy !== undefined
                    ? <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2} />
                    : <g key={p.index} />
                )} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-accent" /> Valor</span>
        <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-muted" /> Lo que has puesto</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border-2 border-accent" /> Compras y ventas</span>
      </div>
      {note && <p className="mt-2 text-small text-faint">{note}</p>}
    </div>
  );
}
