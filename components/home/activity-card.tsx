import Link from 'next/link';
import { ArrowRightLeft, CalendarClock } from 'lucide-react';
import type { Account, Category, Recurring, Transaction, Transfer } from '@/lib/types';
import { recurringKind } from '@/lib/finance/recurring';
import { dayLabel, eur } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';

type Recent = { kind: 'tx'; item: Transaction } | { kind: 'transfer'; item: Transfer };

/** Lo que viene (próximos fijos) y lo último que ha pasado. */
export function ActivityCard({ upcoming, transactions, transfers, categories, accounts, today }: {
  upcoming: { recurring: Recurring; date: string }[];
  transactions: Transaction[]; transfers: Transfer[]; categories: Category[]; accounts: Account[]; today: string;
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const recent: Recent[] = [
    ...transactions.map((t) => ({ kind: 'tx' as const, item: t })),
    ...transfers.map((t) => ({ kind: 'transfer' as const, item: t })),
  ]
    .sort((a, b) => b.item.date.localeCompare(a.item.date) || (b.item.createdAt ?? '').localeCompare(a.item.createdAt ?? ''))
    .slice(0, 5);

  if (upcoming.length === 0 && recent.length === 0) return null;

  return (
    <Card flush>
      {upcoming.length > 0 && (
        <>
          <h2 className="px-4 pb-1 pt-4 text-heading">Próximos fijos</h2>
          <ul className="pb-2">
            {upcoming.map(({ recurring: r, date }) => {
              const kind = recurringKind(r);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2"><CalendarClock size={15} className="text-muted" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{r.name}</span>
                    <span className="block truncate text-small text-muted">{dayLabel(date, today)}</span>
                  </span>
                  <span className={`num shrink-0 text-right ${kind === 'income' ? 'text-gain' : ''}`}>
                    {kind === 'expense' || kind === 'income' ? eur(r.amount, { signed: true }) : eur(Math.abs(r.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {recent.length > 0 && (
        <div className={upcoming.length > 0 ? 'border-t border-line' : ''}>
          <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
            <h2 className="text-heading">Últimos movimientos</h2>
            <Link href="/movimientos" className="text-small text-accent">Ver todos</Link>
          </div>
          <ul className="pb-2">
            {recent.map((r) => {
              if (r.kind === 'transfer') {
                const t = r.item;
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-muted">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2"><ArrowRightLeft size={15} /></span>
                    <span className="min-w-0 flex-1 truncate">{accountName.get(t.fromAccountId) ?? '?'} → {accountName.get(t.toAccountId) ?? '?'}</span>
                    <span className="num">{eur(t.amount)}</span>
                  </li>
                );
              }
              const t = r.item;
              const cat = catById.get(t.categoryId ?? '');
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2"><CategoryIcon icon={cat?.icon ?? 'circle'} size={15} className={cat ? 'text-muted' : 'text-warn'} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t.merchant ?? cat?.name ?? 'Sin categoría'}</span>
                    <span className="block truncate text-small text-muted">{dayLabel(t.date, today)}</span>
                  </span>
                  <span className={`num shrink-0 text-right ${t.amount > 0 ? 'text-gain' : ''}`}>{eur(t.amount, { signed: true })}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
