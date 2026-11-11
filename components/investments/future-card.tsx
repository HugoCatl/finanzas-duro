'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { projectScenarios, SCENARIOS } from '@/lib/finance/projection';
import { eur, eurAxis, niceTicks, pct } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';

const YEARS = ['5', '10', '20'] as const;

/** ¿Cuánto tendré? Lo invertido más tus planes, en tres escenarios: banda entre el malo y el bueno, línea en el normal. */
export function FutureCard({ invested, monthly }: { invested: number; monthly: number }) {
  const [years, setYears] = useState<(typeof YEARS)[number]>('10');
  const data = projectScenarios(invested, monthly, Number(years)).map((p) => ({ ...p, band: [p.low, p.high] as [number, number] }));
  const end = data[data.length - 1];
  const ticks = niceTicks(0, end.high, 3);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-heading">¿Cuánto tendré?</h2>
        <Segmented label="Años" value={years} onChange={setYears} options={YEARS.map((y) => ({ value: y, label: `${y} años` }))} />
      </div>
      <p className="text-small text-muted">En {years} años, lo normal</p>
      <p className="num text-hero">{eur(end.mid, { whole: true })}</p>
      <p className="text-small text-muted">de los que <span className="num text-text">{eur(end.contributed, { whole: true })}</span> los pones tú</p>
      <div className="mt-4 h-40">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="year" hide />
            <YAxis orientation="right" width={52} axisLine={false} tickLine={false} ticks={ticks} domain={[0, ticks[ticks.length - 1]]}
              tickFormatter={eurAxis} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
            <Area dataKey="band" stroke="none" fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} />
            <Line dataKey="contributed" stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            <Line dataKey="mid" stroke="var(--accent)" strokeWidth={2} dot={false} animationDuration={500} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-small">
        <p><span className="block text-muted">Si va mal ({pct(SCENARIOS.low)})</span><span className="num">{eur(end.low, { whole: true })}</span></p>
        <p className="text-right"><span className="block text-muted">Si va bien ({pct(SCENARIOS.high)})</span><span className="num">{eur(end.high, { whole: true })}</span></p>
      </div>
      <p className="mt-3 text-small text-faint">
        {monthly > 0
          ? <>Con lo invertido hoy y tus planes de <span className="num">{eur(monthly, { whole: true })}</span> al mes. Lo normal es un 6 % al año de media; ningún año es igual.</>
          : <>Solo con lo invertido hoy. <Link href="/automatico" className="text-accent">Crea un plan en Automático</Link> para ver cómo crece metiendo algo cada mes.</>}
      </p>
    </Card>
  );
}
