'use client';

import { useState, useTransition } from 'react';
import type { Account, ActionResult, Category } from '@/lib/types';
import type { TransactionInput } from '@/lib/actions/transactions';
import { learnedCategory } from '@/lib/transactions/learn';
import { parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { ScanReceipt } from './scan-receipt';

export interface TransactionFormInitial {
  kind: 'expense' | 'income';
  amount: number | null;
  categoryId: string | null;
  date: string;
  merchant: string | null;
  accountId: string | null;
}

const LAST_ACCOUNT_KEY = 'finanzas:last-account';

/** Última cuenta usada en este dispositivo (solo para proponerla). */
export function lastAccount(): string | null {
  try { return localStorage.getItem(LAST_ACCOUNT_KEY); } catch { return null; }
}

export function TransactionForm({ categories, accounts, initial, submitLabel, onSubmit, onDelete, onDone, hideKind, learned, onOffline, scan }: {
  learned?: Record<string, string>; // comercio normalizado → categoría que usaste la última vez
  hideKind?: boolean; // el tipo lo elige el contenedor (pestañas Gasto/Ingreso/Traspaso)
  categories: Category[];
  accounts: Account[];
  initial: TransactionFormInitial;
  submitLabel: string;
  onSubmit: (input: TransactionInput) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>; // el contenedor cierra y avisa (con Deshacer)
  onDone: () => void;
  onOffline?: (input: TransactionInput) => void; // sin conexión: se guarda en el móvil para subirlo luego
  scan?: boolean; // botón para leer el ticket con la cámara
}) {
  const online = useOnline();
  const [kind, setKind] = useState(initial.kind);
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount).replace('.', ',') : '');
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [date, setDate] = useState(initial.date);
  const [merchant, setMerchant] = useState(initial.merchant ?? '');
  const [accountId, setAccountId] = useState(initial.accountId ?? '');
  // Si eliges la categoría a mano, el comercio ya no la cambia.
  const [categoryTouched, setCategoryTouched] = useState(initial.categoryId !== null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseAmount(amount);

  function run(action: () => Promise<ActionResult>, after: () => void = onDone) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        try { if (accountId) localStorage.setItem(LAST_ACCOUNT_KEY, accountId); } catch { /* sin almacenamiento */ }
        after();
      }
      else setError(result.error);
    });
  }

  // Cada categoría puede tener su cuenta habitual (p. ej. Comida fuera → Trade Republic).
  function applyCategory(c: Category) {
    setCategoryId(c.id);
    if (c.defaultAccountId && accounts.some((a) => a.id === c.defaultAccountId)) setAccountId(c.defaultAccountId);
  }
  function pickCategory(c: Category) {
    setCategoryTouched(true);
    if (categoryId === c.id) { setCategoryId(null); return; }
    applyCategory(c);
  }
  // Al escribir un comercio conocido se propone la categoría de la última vez.
  function changeMerchant(value: string) {
    setMerchant(value);
    if (categoryTouched || !learned) return;
    const id = learnedCategory(learned, value);
    const c = categories.find((x) => x.id === id && x.kind === kind);
    if (c) applyCategory(c);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    if (!accountId) { setError('Elige de qué cuenta sale'); return; }
    const input = { amount: value, kind, categoryId, date, merchant: merchant || null, accountId: accountId || null };
    if (!online && onOffline) { onOffline(input); return; }
    run(() => onSubmit(input));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {!hideKind && <Segmented label="Tipo" size="md" value={kind} onChange={(k) => { setKind(k); setCategoryId(null); }} className="w-full"
        options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]} />}

      <div className="flex items-baseline justify-center gap-1">
        <input aria-label="Importe" autoFocus inputMode="decimal" placeholder="0" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="num w-full min-w-0 bg-transparent text-center text-hero outline-none placeholder:text-faint" />
        <span className="text-title font-light text-muted">€</span>
      </div>
      {scan && kind === 'expense' && (
        <ScanReceipt disabled={!online} onRead={(r) => {
          if (r.amount !== null) setAmount(String(r.amount).replace('.', ','));
          if (r.date) setDate(r.date);
          if (r.merchant) changeMerchant(r.merchant);
        }} />
      )}

      <div className="grid grid-cols-4 gap-2">
        {categories.filter((c) => c.kind === kind).map((c) => (
          <button type="button" key={c.id} onClick={() => pickCategory(c)}
            className={`flex flex-col items-center gap-1 rounded-control px-1 py-2.5 text-[11px] transition ${categoryId === c.id ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>
            <CategoryIcon icon={c.icon} size={20} />
            <span className="line-clamp-1">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Concepto">
          <input className={inputClass} value={merchant} onChange={(e) => changeMerchant(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>
      <Field label={kind === 'expense' ? 'Sale de' : 'Entra en'}>
        <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {!accountId && <option value="">Elige cuenta</option>}
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>

      {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
      <PrimaryButton disabled={!value || pending || (!online && !onOffline)}>
        {!online ? (onOffline ? 'Guardar sin conexión' : 'Sin conexión') : pending ? 'Guardando…' : submitLabel}
      </PrimaryButton>
      {onDelete && (
        <button type="button" disabled={pending || !online} className="text-small text-loss"
          onClick={() => run(onDelete, () => {})}>
          Borrar movimiento
        </button>
      )}
    </form>
  );
}
