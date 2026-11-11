'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { daysBetween } from '@/lib/dates';
import { dayLabel, eurAxis, niceTicks } from '@/lib/format';
import { Segmented } from '@/components/ui/segmented';
import { ChartTooltip } from './chart-tooltip';

const RANGES: [string, number][] = [['1M', 31], ['6M', 183], ['1A', 366], ['Todo', Number.POSITIVE_INFINITY]];

export function NetWorthChart({ points, today }: { points: { date: string; value: number }[]; today: string }) {
  const [range, setRange] = useState('6M');
  const days = RANGES.find(([k]) => k === range)![1];
  const data = points.filter((p) => daysBetween(p.date, today) <= days);
  const values = data.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 3);

  return (
    <div>
      <Segmented label="Periodo" value={range} onChange={setRange} options={RANGES.map(([k]) => ({ value: k, label: k }))} className="mb-4" />
      {data.length < 2 ? (
        <p className="py-16 text-center text-small text-muted">El gráfico aparecerá cuando haya unos días de historial.</p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="date" hide />
              <YAxis orientation="right" width={52} axisLine={false} tickLine={false} ticks={ticks}
                domain={[ticks[0], ticks[ticks.length - 1]]} tickFormatter={eurAxis}
                tick={{ fontSize: 11, fill: 'var(--faint)' }} />
              <Tooltip content={<ChartTooltip />} labelFormatter={(d) => dayLabel(String(d), today)} />
              <Area type="linear" dataKey="value" name="Patrimonio" animationDuration={700} animationEasing="ease-out" stroke="var(--accent)" strokeWidth={2}
                fill="url(#nw-fill)" activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
