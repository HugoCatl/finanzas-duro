import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { priceKey } from '@/lib/prices/keys';
import type { Holding } from '@/lib/types';
import { Hero } from '@/components/ui/hero';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { HoldingCard } from '@/components/accounts/holding-card';
import { NewHolding } from '@/components/accounts/new-holding';
import { AccountEditor } from '@/components/accounts/account-editor';
import { AccountRateCard } from '@/components/accounts/account-rate';
import { accountInterests } from '@/lib/finance/interest';

export default async function CuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAppData('portfolio');
  const account = data.accounts.find((a) => a.id === id);
  if (!account) notFound();

  const pf = appPortfolio(data, id);
  const transfers = data.transfers.filter((t) => t.fromAccountId === id || t.toAccountId === id).length;
  // Fecha de la valoración más reciente (no depende del orden en que lleguen los eventos).
  const prices = (h: Holding) => { const key = priceKey(h); return key ? data.prices[key] : undefined; };
  const lastValuation = (holdingId: string) =>
    data.events.filter((e) => e.holdingId === holdingId && e.type === 'valuation').map((e) => e.date).sort().at(-1) ?? null;

  return (
    <>
      <Link href="/cuentas" className="inline-flex items-center gap-1 pt-4 text-small text-muted lg:pt-0"><ChevronLeft size={16} /> Cuentas</Link>
      <PageHeader title={account.name} action={
        <div className="flex items-center gap-2">
          <AccountEditor account={account} summary={`${pf.items.length} posici${pf.items.length === 1 ? 'ón' : 'ones'} · ${transfers} traspaso${transfers === 1 ? '' : 's'}`} />
          <NewHolding accountId={id} today={data.today} />
        </div>
      } />
      <Hero label="En esta cuenta" value={pf.total} storageKey={`cuenta:${id}`}>
        {pf.items.some((i) => i.holding.kind !== 'cash') && <span className="text-muted">Beneficio <Money value={pf.profit} signed colored /></span>}
      </Hero>
      <AccountRateCard accountId={id} rates={data.rates.filter((r) => r.accountId === id)} today={data.today}
        interest={accountInterests(data).find((a) => a.accountId === id)}
        hasCash={pf.items.some((i) => i.holding.kind === 'cash')} />
      {pf.items.length === 0 ? (
        <p className="py-16 text-center text-muted">Añade tu primera posición: efectivo, remunerada, fondo, acción o cripto.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {pf.items.map((item) => (
            <HoldingCard key={item.holding.id} item={item} today={data.today}
              price={prices(item.holding)}
              lastValuation={lastValuation(item.holding.id)} />
          ))}
        </div>
      )}
    </>
  );
}
