'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { projectNetWorth } from '@/lib/finance/projection';
import { eur, eurAxis, niceTicks } from '@/lib/format';
import { Segmented } from '@/components/ui/segmented';
import { ChartTooltip } from './chart-tooltip';

const YEARS = [1, 5, 10, 20];

/** "A este ritmo, en N años tendrás X" y cuánto cambia ahorrando un poco más. */
export function ProjectionCard({ cash, invested, saving, currentYear }: {
  cash: number; invested: number; saving: number | null; currentYear: number;
}) {
  const [years, setYears] = useState(5);
  const [extra, setExtra] = useState(100);
  const [rate, setRate] = useState(5);
  const base = Math.max(0, saving ?? 0);
  const opts = { cash, invested, annualReturn: rate / 100, years };
  const now = projectNetWorth({ ...opts, monthly: base });
  const more = projectNetWorth({ ...opts, monthly: base + extra });
  const data = now.map((v, i) => ({ label: String(currentYear + i), value: v, extra: more[i] }));
  const ticks = niceTicks(Math.min(...now), Math.max(...more), 3);
  const end = now.at(-1)!;
  const endMore = more.at(-1)!;

  const slider = (label: string, value: string, input: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-small">
      <span className="flex justify-between text-muted"><span>{label}</span><span className="num text-text">{value}</span></span>
      {input}
    </label>
  );

  return (
    <div>
      <Segmented label="Años" value={String(years)} onChange={(v) => setYears(Number(v))} className="mb-4"
        options={YEARS.map((y) => ({ value: String(y), label: y === 1 ? '1 año' : `${y} años` }))} />
      <p className="text-small text-muted">
        {saving === null
          ? 'Aún no hay meses cerrados para saber cuánto ahorras; la línea base no suma ahorro.'
          : <>Ahorrando como hasta ahora (<span className="num">{eur(base, { whole: true })}</span>/mes), en {years === 1 ? '1 año' : `${years} años`} tendrías</>}
      </p>
      <p className="num text-hero">{eur(end, { whole: true })}</p>
      <p className="mt-1 text-small text-muted">
        Con <span className="num">{eur(extra, { whole: true })}</span> más al mes: <span className="num font-medium text-gain">{eur(endMore, { whole: true })}</span>
        {' '}(<span className="num">{eur(endMore - end, { signed: true, whole: true })}</span>)
      </p>

      <div className="mt-4 h-48">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--faint)' }} interval="preserveStartEnd" />
            <YAxis orientation="right" width={52} axisLine={false} tickLine={false} ticks={ticks}
              domain={[ticks[0], ticks[ticks.length - 1]]} tickFormatter={eurAxis} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="value" name="Como ahora" stroke="var(--accent)" strokeWidth={2} fill="var(--accent)" fillOpacity={0.08} animationDuration={500} />
            <Line type="monotone" dataKey="extra" name={`+${extra} €/mes`} stroke="var(--gain)" strokeWidth={2} strokeDasharray="4 4" dot={false} animationDuration={500} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {slider('Ahorro extra al mes', eur(extra, { whole: true }),
          <input type="range" min={0} max={1000} step={25} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="accent-[var(--accent)]" />)}
        {slider('Rentabilidad anual de lo invertido', `${rate} %`,
          <input type="range" min={0} max={10} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-[var(--accent)]" />)}
      </div>
      <p className="mt-3 text-small text-faint">Estimación simple: supone que inviertes lo que ahorras y no cuenta inflación ni impuestos.</p>
    </div>
  );
}
