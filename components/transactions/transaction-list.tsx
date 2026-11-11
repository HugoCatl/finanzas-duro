'use client';

import { useMemo, useState, useTransition } from 'react';
import { ArrowRightLeft, Search } from 'lucide-react';
import type { Account, Category, Transaction, Transfer } from '@/lib/types';
import { deleteTransaction, restoreTransaction, updateTransaction } from '@/lib/actions/transactions';
import { monthOf } from '@/lib/dates';
import { learnedCategories } from '@/lib/transactions/learn';
import { dayLabel, eur, monthLabel } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { EmptyNote } from '@/components/ui/empty-state';
import { inputClass } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { SwipeRow } from '@/components/ui/swipe-row';
import { toast } from '@/components/ui/toaster';
import { useOnline } from '@/lib/hooks/use-online';
import { TransactionForm } from './transaction-form';
import { TransferForm } from './transfer-form';
import { TransactionRow } from './transaction-row';

type KindFilter = 'all' | 'expense' | 'income' | 'transfer' | 'uncategorized';
const KIND_LABELS: Record<KindFilter, string> = {
  all: 'Todo', expense: 'Gastos', income: 'Ingresos', transfer: 'Traspasos', uncategorized: 'Sin categoría',
};
const PAGE = 80;

type Item = { kind: 'tx'; item: Transaction } | { kind: 'transfer'; item: Transfer };

/** Todos los movimientos seguidos, del más reciente al más antiguo, agrupados por mes y por día. */
export function TransactionList({ transactions, transfers, categories, accounts, today }: {
  transactions: Transaction[]; transfers: Transfer[]; categories: Category[]; accounts: Account[]; today: string;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const online = useOnline();

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const learned = useMemo(() => learnedCategories(transactions), [transactions]);

  const q = query.trim().toLowerCase();
  const txMatches = (t: Transaction) =>
    (kind === 'all' || (kind === 'expense' && t.amount < 0) || (kind === 'income' && t.amount > 0) || (kind === 'uncategorized' && t.categoryId === null)) &&
    (!categoryId || t.categoryId === categoryId) &&
    (!q || `${t.merchant ?? ''} ${t.note ?? ''} ${catById.get(t.categoryId ?? '')?.name ?? ''} ${accountName.get(t.accountId ?? '') ?? ''}`.toLowerCase().includes(q));
  const transferMatches = (t: Transfer) =>
    (kind === 'all' || kind === 'transfer') && !categoryId &&
    (!q || `${accountName.get(t.fromAccountId) ?? ''} ${accountName.get(t.toAccountId) ?? ''} ${t.note ?? ''}`.toLowerCase().includes(q));
  const items: Item[] = [
    ...(kind === 'transfer' ? [] : transactions.filter(txMatches).map((t) => ({ kind: 'tx' as const, item: t }))),
    ...transfers.filter(transferMatches).map((t) => ({ kind: 'transfer' as const, item: t })),
  ].sort((a, b) => b.item.date.localeCompare(a.item.date) || (b.item.createdAt ?? '').localeCompare(a.item.createdAt ?? ''));

  // Totales por mes de todo lo filtrado (no solo de lo que se ve), sin contar traspasos.
  const monthTotal = new Map<string, number>();
  for (const i of items) if (i.kind === 'tx') monthTotal.set(monthOf(i.item.date), (monthTotal.get(monthOf(i.item.date)) ?? 0) + i.item.amount);

  const months: { month: string; days: { date: string; items: Item[] }[] }[] = [];
  for (const i of items.slice(0, shown)) {
    const m = monthOf(i.item.date);
    let mg = months.at(-1);
    if (!mg || mg.month !== m) months.push(mg = { month: m, days: [] });
    let dg = mg.days.at(-1);
    if (!dg || dg.date !== i.item.date) mg.days.push(dg = { date: i.item.date, items: [] });
    dg.items.push(i);
  }

  /** Borra sin preguntar y ofrece Deshacer unos segundos. */
  async function removeNow(id: string, what: string) {
    const result = await deleteTransaction(id);
    if (result.ok && result.deleted) {
      const row = result.deleted;
      toast(`${what[0].toUpperCase()}${what.slice(1)} borrado`, {
        label: 'Deshacer',
        run: () => startTransition(async () => {
          const r = await restoreTransaction(row);
          if (r.ok) toast(`${what[0].toUpperCase()}${what.slice(1)} recuperado`);
          else setDeleteError(r.error);
        }),
      });
    }
    return result;
  }

  function remove(id: string, what: string) {
    if (!online) { setDeleteError('Sin conexión'); return; }
    setDeleteError(null);
    startTransition(async () => {
      const result = await removeNow(id, what);
      if (!result.ok) setDeleteError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className={`${inputClass} pl-11`} placeholder="Buscar" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Segmented label="Filtrar" value={kind} onChange={(k) => { setKind(k); setShown(PAGE); }} className="shrink-0"
          options={(Object.keys(KIND_LABELS) as KindFilter[]).map((k) => ({ value: k, label: KIND_LABELS[k] }))} />
        <select aria-label="Categoría" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setShown(PAGE); }}
          className={`shrink-0 rounded-full border-0 bg-surface-2 px-3.5 py-1.5 text-small ${categoryId ? 'text-text' : 'text-muted'}`}>
          <option value="">Categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {deleteError && <p role="alert" className="text-small text-loss">{deleteError}</p>}

      {items.length === 0 && (transactions.length + transfers.length === 0
        ? <EmptyNote>Aún no hay movimientos. Apunta el primero con el botón + o impórtalos desde Ajustes.</EmptyNote>
        : <p className="py-16 text-center text-muted">No hay movimientos con estos filtros.</p>)}

      {months.map(({ month, days }) => (
        <section key={month} className="flex flex-col gap-3">
          <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between bg-bg/90 px-5 py-2 backdrop-blur">
            <h2 className="text-heading">{monthLabel(month)}</h2>
            <span className="num text-small text-muted">{eur(monthTotal.get(month) ?? 0, { signed: true })}</span>
          </div>
          {days.map(({ date, items: dayItems }) => (
            <div key={date}>
              <h3 className="mb-2 px-1 text-small text-muted">{dayLabel(date, today)}</h3>
              <Card flush className="divide-y divide-line overflow-hidden">
                {dayItems.map((i) => i.kind === 'tx' ? (
                  <TransactionRow key={i.item.id} tx={i.item} category={catById.get(i.item.categoryId ?? '')}
                    account={accountName.get(i.item.accountId ?? '')}
                    onEdit={() => setEditing(i.item)} onDelete={() => remove(i.item.id, 'movimiento')} />
                ) : (
                  <TransferRow key={i.item.id} t={i.item} from={accountName.get(i.item.fromAccountId)} to={accountName.get(i.item.toAccountId)}
                    onEdit={() => setEditingTransfer(i.item)} onDelete={() => remove(i.item.id, 'traspaso')} />
                ))}
              </Card>
            </div>
          ))}
        </section>
      ))}

      {items.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="rounded-control bg-surface-2 py-3 text-small font-medium">
          Ver más
        </button>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Editar movimiento">
        {editing && (
          <TransactionForm key={editing.id} categories={categories} accounts={accounts} submitLabel="Guardar cambios" learned={learned}
            initial={{
              kind: editing.amount < 0 ? 'expense' : 'income', amount: Math.abs(editing.amount), categoryId: editing.categoryId,
              date: editing.date, merchant: editing.merchant, accountId: editing.accountId,
            }}
            onSubmit={(input) => updateTransaction(editing.id, input)}
            onDelete={async () => { const r = await removeNow(editing.id, 'movimiento'); if (r.ok) setEditing(null); return r; }}
            onDone={() => { setEditing(null); toast('Cambios guardados'); }} />
        )}
      </Sheet>

      <Sheet open={editingTransfer !== null} onClose={() => setEditingTransfer(null)} title="Editar traspaso">
        {editingTransfer && (
          <TransferForm key={editingTransfer.id} accounts={accounts} today={today} initial={editingTransfer}
            onDone={() => { setEditingTransfer(null); toast('Cambios guardados'); }} />
        )}
      </Sheet>
    </div>
  );
}

function TransferRow({ t, from, to, onEdit, onDelete }: { t: Transfer; from?: string; to?: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <SwipeRow onTap={onEdit} className="text-muted" actions={[
      { label: 'Editar', className: 'bg-surface-2 text-text', onClick: onEdit },
      { label: 'Borrar', className: 'bg-loss text-white', onClick: onDelete },
    ]}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2"><ArrowRightLeft size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{from ?? '?'} → {to ?? '?'}</span>
          <span className="block truncate text-small">Traspaso{t.recurringId ? ' · fijo' : ''}{t.note ? ` · ${t.note}` : ''}</span>
        </span>
      <span className="num font-medium">{eur(t.amount)}</span>
    </SwipeRow>
  );
}
