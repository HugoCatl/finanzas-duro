import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { PortfolioItem } from '@/lib/finance/holdings';
import type { Account, Price } from '@/lib/types';
import { eur, pct } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { AnimatedMoney } from '@/components/ui/animated-money';

/** Inversiones con precio: valor, cómo van hoy y cuánto ganan desde que entraste. */
export function InvestmentsCard({ items, accounts, priceOf }: {
  items: PortfolioItem[]; accounts: Account[]; priceOf: (item: PortfolioItem) => Price | undefined;
}) {
  const invested = items.filter((i) => i.holding.kind !== 'cash' && i.holding.kind !== 'savings');
  if (invested.length === 0) return null;
  const total = invested.reduce((s, i) => s + i.value.value, 0);
  const profit = invested.reduce((s, i) => s + i.value.profit, 0);
  const contributed = invested.reduce((s, i) => s + i.value.contributed, 0);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <Card flush>
      <div className="flex items-end justify-between gap-3 px-4 pb-3 pt-4">
        <div>
          <h2 className="text-small text-muted">Tus inversiones</h2>
          <p className="text-title font-light"><AnimatedMoney value={total} storageKey="inicio:inversiones" /></p>
        </div>
        <p className="text-right text-small">
          <Money value={profit} signed colored className="font-medium" />
          <span className="block text-muted">{contributed > 0 ? pct(profit / contributed, { signed: true }) : '—'} en total</span>
        </p>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {invested.map((item) => {
          const { holding: h, value: v } = item;
          const change = priceOf(item)?.change24h ?? null;
          return (
            <li key={h.id}>
              <Link href={`/inversiones/${h.id}`} className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.name}</span>
                  <span className="block truncate text-small text-muted">
                    {accountName.get(h.accountId)}
                    {v.stale && ' · sin precio'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="num block font-medium">{eur(v.value)}</span>
                  <span className="block text-small">
                    {change !== null && (
                      <span className={change >= 0 ? 'text-gain' : 'text-loss'}>{pct(change / 100, { signed: true })} hoy</span>
                    )}
                    {change !== null && <span className="text-muted"> · </span>}
                    <span className={v.profit > 0 ? 'text-gain' : v.profit < 0 ? 'text-loss' : 'text-muted'}>{pct(v.profitPct, { signed: true })}</span>
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
