'use client';

import { useState, useTransition } from 'react';
import { ArrowDown } from 'lucide-react';
import type { Account, Transfer } from '@/lib/types';
import { createTransfer, updateTransfer, type TransferInput } from '@/lib/actions/transactions';
import { parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';

/** Mover dinero entre dos cuentas tuyas: cambia los dos saldos y no cuenta como gasto. Con `initial` edita uno ya hecho. */
export function TransferForm({ accounts, today, initial, onDone, onOffline }: {
  accounts: Account[]; today: string; onDone: () => void;
  onOffline?: (input: TransferInput) => void; // sin conexión: se guarda en el móvil para subirlo luego
  initial?: Pick<Transfer, 'id' | 'fromAccountId' | 'toAccountId' | 'amount' | 'date' | 'note'>;
}) {
  const online = useOnline();
  const [amount, setAmount] = useState(initial ? String(Math.abs(initial.amount)).replace('.', ',') : '');
  const [from, setFrom] = useState(initial?.fromAccountId ?? accounts[0]?.id ?? '');
  const [to, setTo] = useState(initial?.toAccountId ?? accounts[1]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const value = parseAmount(amount);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    const input = { fromAccountId: from, toAccountId: to, amount: value, date, note: note || null };
    if (!online && onOffline && !initial) { onOffline(input); return; }
    setError(null);
    start(async () => {
      const r = initial ? await updateTransfer(initial.id, input) : await createTransfer(input);
      if (r.ok) onDone();
      else setError(r.error);
    });
  }

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <Field label={label}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} required>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex items-baseline justify-center gap-1">
        <input aria-label="Importe" autoFocus inputMode="decimal" placeholder="0" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="num w-full min-w-0 bg-transparent text-center text-hero outline-none placeholder:text-faint" />
        <span className="text-title font-light text-muted">€</span>
      </div>
      <div className="flex flex-col gap-2">
        {select(from, setFrom, 'Desde')}
        <ArrowDown size={18} className="mx-auto text-muted" aria-hidden />
        {select(to, setTo, 'Hacia')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Concepto">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>
      {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
      <PrimaryButton disabled={!value || pending || (!online && !(onOffline && !initial)) || from === to}>
        {!online ? (onOffline && !initial ? 'Guardar sin conexión' : 'Sin conexión') : pending ? 'Guardando…' : from === to ? 'Elige dos cuentas distintas' : initial ? 'Guardar cambios' : 'Traspasar'}
      </PrimaryButton>
    </form>
  );
}
