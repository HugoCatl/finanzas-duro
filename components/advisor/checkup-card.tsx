'use client';

import { useEffect, useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Checkup } from '@/lib/ai/checkup';
import { requestCheckup } from '@/lib/actions/checkup';
import { monthLabel } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Card } from '@/components/ui/card';
import { duro } from '@/lib/duro/store';
import { Mascot } from './mascot';

const scoreText = (n: number) => n.toFixed(1).replace('.', ',').replace(',0', '');
const tone = (n: number) => (n >= 7 ? 'text-gain' : n >= 5 ? 'text-warn' : 'text-loss');
const bar = (n: number) => (n >= 7 ? 'bg-gain' : n >= 5 ? 'bg-warn' : 'bg-loss');

/** La nota, sus partes, el texto de Duro y las dos cosas que hacer. */
export function CheckupBody({ checkup }: { checkup: Checkup }) {
  return (
    <>
      <p className="text-small">{checkup.summary}</p>
      <dl className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
        {checkup.parts.map((p) => (
          <div key={p.key} title={p.detail}>
            <div className="flex items-baseline justify-between gap-3 text-small">
              <dt className="text-muted">{p.label}</dt>
              <dd className="num">{scoreText(p.score)}</dd>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className={`h-full origin-left animate-grow rounded-full ${bar(p.score)}`} style={{ width: `${p.score * 10}%` }} />
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-small text-muted">Para este mes</p>
        <ul className="flex flex-col gap-2 text-small">
          {checkup.actions.map((a) => (
            <li key={a} className="flex gap-2.5"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />{a}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** Chequeo de Duro en Inicio: el último que haya, y un botón para pedir el del mes en curso. */
export function CheckupCard({ checkup, month }: { checkup: Checkup | null; month: string }) {
  const online = useOnline();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // El del mes en curso se puede rehacer; si el último es de un mes cerrado, se puede pedir el de este.
  const label = checkup ? `${monthLabel(checkup.month).replace(/ \d{4}$/, '')}${checkup.partial ? ', hasta hoy' : ''}` : null;

  // Una vez al día, Duro comenta la nota: lo celebra si va bien y avisa si va flojo.
  useEffect(() => {
    if (!checkup || checkup.month !== month) return;
    const key = `finanzas:duro-nota:${new Date().toISOString().slice(0, 10)}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch { return; }
    const t = setTimeout(() => {
      if (checkup.score >= 8) duro.react('celebrating', `¡Un ${scoreText(checkup.score)} este mes! Sigue así.`);
      else if (checkup.score < 5) duro.react('worried', 'Este mes vas flojo. Mira el chequeo: hay dos cosas que puedes hacer.');
    }, 1200);
    return () => clearTimeout(t);
  }, [checkup, month]);

  function request() {
    setError(null);
    start(async () => {
      try {
        const r = await requestCheckup();
        if (!r.ok) setError(r.error);
      } catch {
        setError('No se pudo hacer el chequeo. Inténtalo más tarde.');
      }
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-3">
        <Mascot size={44} alive thinking={pending} />
        <div className="min-w-0 flex-1">
          <h2 className="text-heading">Chequeo de Duro</h2>
          <p className="truncate text-small text-muted">{pending ? 'Repasando tus cuentas…' : label ?? 'Tu mes, con nota y dos cosas que hacer'}</p>
        </div>
        {checkup && (
          <p className={`num shrink-0 text-title ${tone(checkup.score)}`} aria-label={`Nota ${scoreText(checkup.score)} de 10`}>
            {scoreText(checkup.score)}<span className="text-small font-normal text-muted"> /10</span>
          </p>
        )}
      </div>
      {checkup ? <CheckupBody checkup={checkup} /> : (
        <p className="text-small text-muted">Duro repasa cuánto ahorras, si cumples el presupuesto, tu colchón y el riesgo de lo que tienes invertido.</p>
      )}
      {error && <p role="alert" className="mt-3 text-small text-loss">{error}</p>}
      {(!checkup || checkup.partial || checkup.month !== month) && (
        <button type="button" onClick={request} disabled={pending || !online}
          className={checkup
            ? 'mt-4 flex items-center gap-1.5 text-small text-muted disabled:opacity-40'
            : 'mt-4 w-full rounded-control bg-accent py-3 text-small font-medium text-accent-ink disabled:opacity-40'}>
          {checkup ? <><RefreshCw size={12} className={pending ? 'animate-spin' : ''} /> {checkup.month === month ? 'Actualizar' : 'Ver cómo voy este mes'}</> : pending ? 'Haciendo el chequeo…' : 'Hacerme el chequeo'}
        </button>
      )}
    </Card>
  );
}
