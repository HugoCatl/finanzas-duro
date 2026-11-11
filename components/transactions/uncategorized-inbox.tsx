'use client';

import { useState, useTransition } from 'react';
import type { Category, Transaction } from '@/lib/types';
import { categorizeTransaction } from '@/lib/actions/transactions';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Money } from '@/components/ui/money';
import { toast } from '@/components/ui/toaster';

export function UncategorizedInbox({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const items = transactions.filter((t) => !done.has(t.id));
  if (items.length === 0) return null;

  function assign(txId: string, categoryId: string) {
    setError(null);
    start(async () => {
      const result = await categorizeTransaction(txId, categoryId);
      if (result.ok) {
        setDone((s) => new Set(s).add(txId));
        if (result.also) toast(`Y ${result.also} más del mismo comercio`);
      }
      else setError(result.error);
    });
  }

  return (
    <Card flush>
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-heading">Por categorizar</h2>
        <span className="rounded-full bg-warn/15 px-2 py-0.5 text-small font-medium text-warn">{items.length}</span>
      </div>
      {error && <p role="alert" className="px-4 pt-2 text-small text-loss">{error}</p>}
      <ul className="divide-y divide-line">
        {items.slice(0, 5).map((t) => (
          <li key={t.id} className="py-3">
            <div className="flex items-center justify-between gap-3 px-4">
              <span className="truncate">{t.merchant ?? 'Gasto'} <span className="text-muted">· {t.date.slice(8)}/{t.date.slice(5, 7)}</span></span>
              <Money value={t.amount} className="font-medium" />
            </div>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
              {categories.map((c) => (
                <button key={c.id} disabled={pending} onClick={() => assign(t.id, c.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-small">
                  <CategoryIcon icon={c.icon} size={14} /> {c.name}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
