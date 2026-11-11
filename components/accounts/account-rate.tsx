'use client';

import { useState, useTransition } from 'react';
import { Percent, Trash2 } from 'lucide-react';
import type { AccountRate } from '@/lib/types';
import type { AccountInterest } from '@/lib/finance/interest';
import { deleteAccountRate, setAccountRate } from '@/lib/actions/rates';
import { eur, parseAmount, tae } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Card } from '@/components/ui/card';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';

const short = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;

/** Remuneración del efectivo de una cuenta: TAE de hoy, lo que lleva y su historial editable. */
export function AccountRateCard({ accountId, rates, interest, today, hasCash }: {
  accountId: string; rates: AccountRate[]; interest: AccountInterest | undefined; today: string; hasCash: boolean;
}) {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [from, setFrom] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const current = interest?.rate ?? 0;

  function openSheet() {
    setValue(current ? String(Math.round(current * 10_000) / 100).replace('.', ',') : '');
    setFrom(today);
    setError(null);
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = parseAmount(value, { allowZero: true });
    if (n === null) { setError('TAE no válida'); return; }
    setError(null);
    start(async () => {
      const r = await setAccountRate(accountId, n / 100, from);
      if (r.ok) { setOpen(false); toast(n === 0 ? 'Remuneración quitada' : 'TAE guardada'); }
      else setError(r.error);
    });
  }

  function remove(id: string) {
    if (!confirm('¿Quitar este cambio de TAE? Los intereses ya apuntados se quedan.')) return;
    start(async () => {
      const r = await deleteAccountRate(id);
      if (r.ok) toast('Cambio quitado');
      else setError(r.error);
    });
  }

  return (
    <>
      <Card className="mb-4 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"><Percent size={16} /></span>
        <div className="min-w-0 flex-1 text-small">
          {current > 0 ? (
            <>
              <p className="font-medium">Remunerada al {tae(current)} TAE</p>
              <p className="text-muted">
                Este mes llevas <span className="num">{eur(interest?.accrued ?? 0)}</span>
                {(interest?.paidThisYear ?? 0) > 0 && <> · este año <span className="num">{eur(interest!.paidThisYear)}</span></>}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">¿Te pagan intereses?</p>
              <p className="text-muted">Pon la TAE y se apuntan solos el día 1 de cada mes.</p>
            </>
          )}
        </div>
        <button type="button" onClick={openSheet} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-small font-medium">
          {current > 0 ? 'Cambiar' : 'Poner TAE'}
        </button>
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="Remuneración">
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="TAE (%)">
              <input className={`${inputClass} num`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="2,25" required />
            </Field>
            <Field label="Desde">
              <input type="date" className={inputClass} value={from} max={today} onChange={(e) => setFrom(e.target.value)} required />
            </Field>
          </div>
          <p className="text-small text-muted">
            Los días anteriores siguen con la TAE que tenían. Cada día 1 se apunta como ingreso lo generado el mes anterior, según el saldo de cada día.
            Pon 0 si deja de pagar.
          </p>
          {!hasCash && <p className="text-small text-warn">Esta cuenta no tiene efectivo apuntado: añade una posición de efectivo para que genere intereses.</p>}
          {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
          <PrimaryButton disabled={pending || !online}>{pending ? 'Guardando…' : 'Guardar'}</PrimaryButton>

          {rates.length > 0 && (
            <div>
              <h3 className="mb-1 text-small font-medium text-muted">Historial</h3>
              <ul className="divide-y divide-line">
                {[...rates].reverse().map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2 text-small">
                    <span className="flex-1">Desde el {short(r.fromDate)}</span>
                    <span className="num font-medium">{r.rate > 0 ? tae(r.rate) : 'Sin interés'}</span>
                    <button type="button" aria-label="Quitar" onClick={() => remove(r.id)} disabled={pending || !online} className="text-muted disabled:opacity-40">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Sheet>
    </>
  );
}
