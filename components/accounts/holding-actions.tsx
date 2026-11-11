'use client';

import { useState, useTransition } from 'react';
import type { EventType, Holding } from '@/lib/types';
import { addHoldingEvent, archiveHolding } from '@/lib/actions/holdings';
import { EVENT_TYPES_BY_KIND, ZERO_ALLOWED_EVENTS } from '@/lib/holdings/validate';
import { parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';

const EVENT_LABELS: Record<EventType, string> = {
  deposit: 'Aportar', withdrawal: 'Retirar', balance_adjust: 'Ajustar saldo', valuation: 'Actualizar valor', buy: 'Comprar', sell: 'Vender',
};

const AMOUNT_LABELS: Partial<Record<EventType, string>> = {
  balance_adjust: 'Saldo real hoy (€)', valuation: 'Valor actual total (€)', buy: 'Total pagado (€)', sell: 'Total recibido (€)',
};

export function HoldingActions({ holding, today }: { holding: Holding; today: string }) {
  const online = useOnline();
  const types = EVENT_TYPES_BY_KIND[holding.kind];
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EventType>(types[0]);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needsQty = type === 'buy' || type === 'sell';
  const value = parseAmount(amount, { allowZero: ZERO_ALLOWED_EVENTS.includes(type) });
  const unreadable = amount.trim() !== '' && value === null;
  const qty = needsQty ? Number(quantity.replace(',', '.')) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === null) { setError('Importe no válido'); return; }
    setError(null);
    start(async () => {
      const r = await addHoldingEvent({ holdingId: holding.id, type, date, amountEur: value, quantity: qty });
      if (r.ok) {
        setOpen(false);
        toast('Guardado');
        setAmount('');
        setQuantity('');
      } else setError(r.error);
    });
  }

  function archive() {
    if (!confirm(`¿Archivar "${holding.name}"? Dejará de contar en tu patrimonio.`)) return;
    setError(null);
    start(async () => {
      const r = await archiveHolding(holding.id);
      if (r.ok) { setOpen(false); toast('Posición archivada'); }
      else setError(r.error);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full bg-surface-2 px-3 py-1.5 text-small font-medium">Movimiento</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={holding.name}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {types.map((t) => (
              <button type="button" key={t} onClick={() => setType(t)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-small ${type === t ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>
                {EVENT_LABELS[t]}
              </button>
            ))}
          </div>
          <Field label={AMOUNT_LABELS[type] ?? 'Importe (€)'}>
            <input className={`${inputClass} num`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          {needsQty && (
            <Field label="Cantidad (unidades de la cripto)">
              <input className={`${inputClass} num`} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
          )}
          <Field label="Fecha">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          {(error || unreadable) && <p role="alert" className="animate-fade-in text-small text-loss">{error ?? 'Importe no válido'}</p>}
          <PrimaryButton disabled={value === null || pending || !online}>{pending ? 'Guardando…' : EVENT_LABELS[type]}</PrimaryButton>
          <button type="button" onClick={archive} disabled={pending || !online} className="text-small text-muted">Archivar posición</button>
        </form>
      </Sheet>
    </>
  );
}
