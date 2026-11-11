'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Account, Category, Holding, Recurring } from '@/lib/types';
import { deleteRecurring, upsertRecurring } from '@/lib/actions/budget';
import { recurringKind, type RecurringKind } from '@/lib/finance/recurring';
import { eur, parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Card } from '@/components/ui/card';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';

const KIND_LABELS: Record<RecurringKind, string> = { expense: 'Gasto', income: 'Ingreso', transfer: 'Traspaso', plan: 'Inversión' };

type Draft = {
  id?: string; name: string; amount: string; kind: RecurringKind; categoryId: string; accountId: string;
  transferAccountId: string; holdingId: string; day: string; active: boolean;
};

const empty: Draft = { name: '', amount: '', kind: 'expense', categoryId: '', accountId: '', transferAccountId: '', holdingId: '', day: '1', active: true };
const fromRecurring = (r: Recurring): Draft => ({
  id: r.id, name: r.name, amount: String(Math.abs(r.amount)).replace('.', ','), kind: recurringKind(r),
  categoryId: r.categoryId ?? '', accountId: r.accountId ?? '', transferAccountId: r.transferAccountId ?? '',
  holdingId: r.holdingId ?? '', day: String(r.dayOfMonth), active: r.active,
});

const DAYS = Array.from({ length: 30 }, (_, i) => String(i + 1));

/**
 * Lista de fijos con su editor. `kinds` limita qué tipos se ven y se pueden crear; `notes` añade una línea bajo
 * cada fijo (próxima vez, avisos…) y `footer` va al final de la lista.
 */
export function RecurringEditor({ recurring, categories, accounts, holdings, kinds = ['expense', 'income', 'transfer', 'plan'], title = 'Fijos del mes', summary, defaultOpen = false, notes, footer }: {
  recurring: Recurring[]; categories: Category[]; accounts: Account[]; holdings: Holding[];
  kinds?: RecurringKind[]; title?: string; summary?: ReactNode; defaultOpen?: boolean; notes?: Record<string, ReactNode>; footer?: ReactNode;
}) {
  const online = useOnline();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const holdingName = new Map(holdings.map((h) => [h.id, h.name]));
  const investable = holdings.filter((h) => !h.archived && h.kind !== 'cash' && h.kind !== 'savings');

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const amount = parseAmount(draft.amount);
    if (amount === null) {
      setError('Importe no válido');
      return;
    }
    setError(null);
    start(async () => {
      const r = await upsertRecurring({
        id: draft.id, name: draft.name, amount, kind: draft.kind,
        categoryId: draft.categoryId || null, accountId: draft.accountId || null,
        transferAccountId: draft.transferAccountId || null, holdingId: draft.holdingId || null,
        dayOfMonth: Number(draft.day), active: draft.active,
      });
      if (r.ok) { setDraft(null); toast('Fijo guardado'); }
      else setError(r.error);
    });
  }

  function remove() {
    if (!draft?.id || !confirm('¿Borrar este fijo?')) return;
    const id = draft.id;
    setError(null);
    start(async () => {
      const r = await deleteRecurring(id);
      if (r.ok) { setDraft(null); toast('Fijo borrado'); }
      else setError(r.error);
    });
  }

  const detail = (r: Recurring) => {
    const kind = recurringKind(r);
    if (kind === 'transfer') return `${accountName.get(r.accountId ?? '') ?? '?'} → ${accountName.get(r.transferAccountId ?? '') ?? '?'}`;
    if (kind === 'plan') return `Compra de ${holdingName.get(r.holdingId ?? '') ?? '?'}`;
    return accountName.get(r.accountId ?? '') ?? 'Sin cuenta';
  };
  const shown = recurring.filter((r) => kinds.includes(recurringKind(r)));
  const fixedExpenses = shown.filter((r) => r.active && recurringKind(r) === 'expense').reduce((s, r) => s - r.amount, 0);
  const newDraft = (): Draft => ({ ...empty, kind: kinds[0] });

  return (
    <>
      <Card className="p-0">
        <details className="group" open={defaultOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-heading">{title}</h2>
              <p className="text-small text-muted">{summary ?? <>{shown.length === 1 ? '1 fijo' : `${shown.length} fijos`} · gastos <span className="num">{eur(fixedExpenses)}</span></>}</p>
            </div>
            <ChevronDown size={18} className="text-muted transition-transform duration-300 ease-soft group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {shown.length === 0 && <li className="px-5 py-4 text-small text-muted">
              {kinds.includes('plan') ? 'Añade tus traspasos a otras cuentas y tus planes de inversión: se hacen solos cada mes.' : 'Añade tu nómina y suscripciones: se apuntan solas cada mes.'}
            </li>}
            {shown.map((r) => {
              const kind = recurringKind(r);
              return (
                <li key={r.id}>
                  <button onClick={() => { setError(null); setDraft(fromRecurring(r)); }}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left ${r.active ? '' : 'opacity-50'}`}>
                    <span className="num w-7 text-center text-small text-muted">{r.dayOfMonth === 31 ? 'Fin' : r.dayOfMonth}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-small text-muted">{detail(r)}</span>
                      {notes?.[r.id]}
                    </span>
                    <span className={`num ${kind === 'income' ? 'text-gain' : kind === 'expense' ? '' : 'text-muted'}`}>
                      {kind === 'expense' || kind === 'income' ? eur(r.amount, { signed: true }) : eur(Math.abs(r.amount))}
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <button onClick={() => { setError(null); setDraft(newDraft()); }} className="flex w-full items-center gap-2 px-5 py-3 text-small font-medium">
                <Plus size={16} /> {kinds.includes('plan') && !kinds.includes('expense') ? 'Añadir traspaso o plan' : 'Añadir fijo'}
              </button>
            </li>
            {footer && <li className="px-5 py-3 text-small text-muted">{footer}</li>}
          </ul>
        </details>
      </Card>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? 'Editar fijo' : 'Nuevo fijo'}>
        {draft && (
          <form key={draft.id ?? 'nuevo'} onSubmit={save} className="flex flex-col gap-4">
            <div className="grid rounded-control bg-surface-2 p-1 text-small font-medium" style={{ gridTemplateColumns: `repeat(${kinds.length}, minmax(0, 1fr))` }}>
              {kinds.map((k) => (
                <button type="button" key={k} onClick={() => set({ kind: k, categoryId: '' })}
                  className={`rounded-xl py-2 ${draft.kind === k ? 'bg-accent font-medium text-accent-ink' : 'text-muted'}`}>{KIND_LABELS[k]}</button>
              ))}
            </div>
            <Field label="Nombre">
              <input className={inputClass} value={draft.name} onChange={(e) => set({ name: e.target.value })} required
                placeholder={draft.kind === 'transfer' ? 'A MyInvestor' : draft.kind === 'plan' ? 'Plan MSCI' : 'Suscripción'} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Importe (€)"><input className={`${inputClass} num`} inputMode="decimal" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} required /></Field>
              <Field label="Día del mes">
                <select className={`${inputClass} num`} value={draft.day} onChange={(e) => set({ day: e.target.value })}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  <option value="31">Último día</option>
                </select>
              </Field>
            </div>

            {(draft.kind === 'expense' || draft.kind === 'income') && (
              <Field label="Categoría">
                <select className={inputClass} value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories.filter((c) => c.kind === draft.kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            {draft.kind === 'plan' ? (
              <Field label="Qué compras (de su cuenta sale el dinero)">
                <select className={inputClass} value={draft.holdingId} onChange={(e) => set({ holdingId: e.target.value })} required>
                  <option value="">Elige</option>
                  {investable.map((h) => <option key={h.id} value={h.id}>{h.name} · {accountName.get(h.accountId)}</option>)}
                </select>
              </Field>
            ) : (
              <Field label={draft.kind === 'transfer' ? 'Desde' : draft.kind === 'income' ? 'Entra en' : 'Sale de'}>
                <select className={inputClass} value={draft.accountId} onChange={(e) => set({ accountId: e.target.value })} required={draft.kind === 'transfer'}>
                  <option value="">{draft.kind === 'transfer' ? 'Elige' : 'Sin cuenta'}</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            )}
            {draft.kind === 'transfer' && (
              <Field label="Hacia">
                <select className={inputClass} value={draft.transferAccountId} onChange={(e) => set({ transferAccountId: e.target.value })} required>
                  <option value="">Elige</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            )}
            {draft.kind === 'plan' && <p className="text-small text-muted">Cada mes se apunta la compra al precio del día. Si luego importas el extracto, se corrige con la compra real.</p>}

            <label className="flex items-center gap-3 text-small">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} />
              Activo
            </label>
            {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
            <PrimaryButton disabled={pending || !online}>{pending ? 'Guardando…' : 'Guardar'}</PrimaryButton>
            {draft.id && <button type="button" onClick={remove} disabled={pending || !online} className="text-small text-loss">Borrar fijo</button>}
          </form>
        )}
      </Sheet>
    </>
  );
}
