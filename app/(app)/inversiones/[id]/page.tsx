import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { EventType } from '@/lib/types';
import { getAppData } from '@/lib/data/app-data';
import { closesFor, getHoldingProfiles, referenceData } from '@/lib/data/investments';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { benchmarkReturn, contributionFlows, inflationReturn, ownReturn, savingsReturn, INVESTED_KINDS } from '@/lib/finance/compare';
import { positionSeries, valuationSeries } from '@/lib/finance/position-history';
import { flowAgeDays, positionFlows, xirr } from '@/lib/finance/xirr';
import { priceKey } from '@/lib/prices/keys';
import { dayMonth, eur, pct } from '@/lib/format';
import { KIND_LABELS } from '@/lib/labels';
import { Card } from '@/components/ui/card';
import { Hero } from '@/components/ui/hero';
import { HoldingActions } from '@/components/accounts/holding-actions';
import { AnnualReturn } from '@/components/investments/annual-return';
import { ComparisonCard } from '@/components/investments/comparison-card';
import { PositionChart } from '@/components/investments/position-chart';
import { ProfileCard } from '@/components/investments/profile-card';
import { AskDuroButton } from '@/components/advisor/ask-duro';
import { newsQuestion } from '@/lib/rules/big-moves';

const EVENT_LABELS: Record<EventType, string> = {
  deposit: 'Aportación', withdrawal: 'Retirada', balance_adjust: 'Ajuste de saldo', valuation: 'Valoración', buy: 'Compra', sell: 'Venta',
};

export default async function InversionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAppData('investments');
  const item = appPortfolio(data).items.find((i) => i.holding.id === id);
  if (!item || !INVESTED_KINDS.includes(item.holding.kind)) notFound();
  const { holding: h, value: v } = item;
  const events = data.events.filter((e) => e.holdingId === id);
  const first = events.map((e) => e.date).sort()[0] ?? null;

  const [closes, refs, profiles] = await Promise.all([
    priceKey(h) ? closesFor(h, first, data.today) : Promise.resolve(null), referenceData(), getHoldingProfiles(),
  ]);
  const series = priceKey(h) ? positionSeries(events, closes, data.today) : valuationSeries(events, data.today);
  // El último punto, con el mismo precio que el resto de la app.
  if (series.length) series[series.length - 1] = { ...series[series.length - 1], value: v.value };

  const flows = contributionFlows(events);
  const own = ownReturn(flows, v.value);
  const allFlows = positionFlows(events, v.value, data.today);
  const account = data.accounts.find((a) => a.id === h.accountId);
  const trades = events.filter((e) => e.type === 'buy' || e.type === 'sell').map((e) => e.date);
  const history = [...events].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  return (
    <>
      <div className="flex items-center justify-between pt-4 lg:pt-0">
        <Link href="/inversiones" className="inline-flex items-center gap-1 text-small text-muted"><ChevronLeft size={16} /> Inversiones</Link>
        <HoldingActions holding={h} today={data.today} />
      </div>
      <header className="pb-2 pt-4">
        <h1 className="text-title">{h.name}</h1>
        <p className="text-small text-muted">{KIND_LABELS[h.kind]} · {account?.name}</p>
      </header>

      <Hero label="Vale ahora" value={v.value} storageKey={`posicion:${h.id}`} className="pt-3">
        <span className={v.profit >= 0 ? 'text-gain' : 'text-loss'}>
          {v.profit >= 0 ? 'Has ganado' : 'Pierdes'} <span className="num">{eur(Math.abs(v.profit))}</span> ({pct(v.profitPct, { signed: true })})
        </span>
      </Hero>
      <div className="-mt-4 mb-4"><AnnualReturn rate={xirr(allFlows)} tooEarly={flowAgeDays(allFlows, data.today) < 90} /></div>
      <div className="mb-6"><AskDuroButton question={newsQuestion(h.name)} label="¿Qué ha pasado? Pregunta a Duro" /></div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <PositionChart points={series} trades={trades} today={data.today}
            note={priceKey(h) && !closes ? 'Sin historial de precios ahora mismo: el gráfico usa tus compras.' : !priceKey(h) ? 'Sin precio automático: el gráfico usa tus valoraciones.' : undefined} />
        </Card>

        <ComparisonCard own={own} world={benchmarkReturn(flows, refs.world)} inflation={inflationReturn(flows, data.today, refs.hicp)}
          savings={savingsReturn(flows, data.today)} />

        <ProfileCard holdingId={h.id} kind={h.kind} initial={profiles[h.id] ?? null} />

        <section className="lg:col-span-2">
          <h2 className="mb-2 px-1 text-small font-medium text-muted">Tus movimientos</h2>
          <Card flush className="divide-y divide-line">
            {history.length === 0 && <p className="px-4 py-3 text-small text-muted">Aún no hay movimientos.</p>}
            {history.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{EVENT_LABELS[e.type]}</span>
                  <span className="block text-small text-muted">
                    {dayMonth(e.date)} {e.date.slice(0, 4)}{e.quantity ? ` · ${e.quantity.toLocaleString('es-ES', { maximumFractionDigits: 6 })} part.` : ''}
                    {e.recurringId ? ' · plan' : ''}
                  </span>
                </span>
                <span className="num shrink-0 font-medium">{eur(e.amountEur)}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
