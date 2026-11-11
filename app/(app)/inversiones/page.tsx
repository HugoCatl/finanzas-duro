import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronRight, Repeat } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { automationSteps } from '@/lib/finance/automation';
import { accountInterests } from '@/lib/finance/interest';
import { addMonths, daysBetween, monthOf } from '@/lib/dates';
import { eur, pct, tae } from '@/lib/format';
import { KIND_COLORS, KIND_LABELS } from '@/lib/labels';
import { priceKey } from '@/lib/prices/keys';
import { investmentAdvice } from '@/lib/finance/advice';
import { benchmarkReturn, inflationReturn, ownReturn, portfolioFlows, savingsReturn } from '@/lib/finance/compare';
import { monthlySeries } from '@/lib/finance/month';
import { getHoldingProfiles, referenceData } from '@/lib/data/investments';
import { AdviceCard } from '@/components/investments/advice-card';
import { ComparisonCard } from '@/components/investments/comparison-card';
import { FutureCard } from '@/components/investments/future-card';
import type { Holding, HoldingKind } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { AllocationTabs } from '@/components/charts/allocation-tabs';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { HoldingCard } from '@/components/accounts/holding-card';
import { AnimatedMoney } from '@/components/ui/animated-money';
import { LivePrices } from '@/components/pwa/live-prices';
import { Term } from '@/components/ui/term';
import { getLevel } from '@/lib/data/level';
import { flowAgeDays, positionFlows, xirr } from '@/lib/finance/xirr';

const INVEST: HoldingKind[] = ['fund', 'stock', 'crypto'];

export default async function InversionesPage() {
  const data = await getAppData('investments');
  const pf = appPortfolio(data);
  const invested = pf.items.filter((i) => INVEST.includes(i.holding.kind));
  const interests = accountInterests(data);
  const savings = pf.items.filter((i) => i.holding.kind === 'savings');

  if (invested.length === 0 && interests.length === 0 && savings.length === 0) {
    return (
      <>
        <PageHeader title="Inversiones" />
        <EmptyState title="Aún no tienes inversiones"
          body="Añade tus fondos, acciones o cripto dentro de su cuenta (MyInvestor, Trade Republic…) y verás aquí cuánto llevas, cuánto ganas y tus planes automáticos. Si tu banco te paga intereses, ponle la TAE en su cuenta."
          actions={[{ href: '/cuentas', label: 'Ir a Cuentas' }, { href: '/ajustes/importar', label: 'Importar Trade Republic' }]} />
      </>
    );
  }

  const total = invested.reduce((s, i) => s + i.value.value, 0);
  const profit = invested.reduce((s, i) => s + i.value.profit, 0);
  const contributed = invested.reduce((s, i) => s + i.value.contributed, 0);
  const accountOf = new Map(data.accounts.map((a) => [a.id, a]));
  const holdingOf = new Map(data.holdings.map((h) => [h.id, h]));

  const points = [
    ...data.snapshots.filter((s) => s.date < data.today).map((s) => ({ date: s.date, value: INVEST.reduce((sum, k) => sum + (s.byKind[k] ?? 0), 0) })),
    { date: data.today, value: total },
  ];
  const byKind = INVEST.filter((k) => pf.byKind[k] > 0).map((k) => ({ name: KIND_LABELS[k], value: pf.byKind[k], color: KIND_COLORS[k] }));
  const byAccount = data.accounts
    .map((a) => ({ name: a.name, value: invested.filter((i) => i.holding.accountId === a.id).reduce((s, i) => s + i.value.value, 0), color: a.color }))
    .filter((x) => x.value > 0);

  const plans = automationSteps(data, pf).filter((s) => s.kind === 'plan');
  const monthlyPlans = plans.filter((s) => s.recurring.active).reduce((s, p) => s + Math.abs(p.recurring.amount), 0);
  const [refs, profiles, level] = await Promise.all([referenceData(), getHoldingProfiles(), getLevel()]);
  // Avanzado: cuánto pesa cada posición y qué da al año (con 90 días o más de historia).
  const extraOf = (item: (typeof invested)[number]) => {
    if (level !== 'advanced') return undefined;
    const itemFlows = positionFlows(data.events.filter((e) => e.holdingId === item.holding.id), item.value.value, data.today);
    return { weight: total > 0 ? item.value.value / total : 0, annual: flowAgeDays(itemFlows, data.today) < 90 ? null : xirr(itemFlows) };
  };
  const flows = portfolioFlows(data.events, data.holdings);
  const closed = monthlySeries(data.transactions, addMonths(monthOf(data.today), -1), 3).filter((r) => r.spent > 0);
  const advice = investmentAdvice({
    items: pf.items, profiles, monthlySpend: closed.length ? closed.reduce((s, r) => s + r.spent, 0) / closed.length : null,
  });
  const brokers = data.accounts.filter((a) => invested.some((i) => i.holding.accountId === a.id));
  const priceOf = (h: Holding) => { const key = priceKey(h); return key ? data.prices[key] : undefined; };
  const lastValuation = (holdingId: string) =>
    data.events.filter((e) => e.holdingId === holdingId && e.type === 'valuation').map((e) => e.date).sort().at(-1) ?? null;
  // Lo que se ha movido hoy según la variación diaria de cada precio (los fondos cambian una vez al día).
  const withChange = invested.filter((i) => priceOf(i.holding)?.change24h != null);
  const today = withChange.reduce((s, i) => s + i.value.value - i.value.value / (1 + priceOf(i.holding)!.change24h! / 100), 0);
  const todayBase = withChange.reduce((s, i) => s + i.value.value, 0) - today;
  const updatedAt = invested.map((i) => priceOf(i.holding)?.updatedAt).filter((d): d is string => !!d).sort().at(-1) ?? null;
  const title = (t: string, link?: { href: string; label: string }) => (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="text-small font-medium text-muted">{t}</h2>
      {link && <Link href={link.href} className="text-small text-muted">{link.label}</Link>}
    </div>
  );

  return (
    <>
      <PageHeader title="Inversiones" subtitle={<><span className="num">{eur(total)}</span> invertidos</>} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {invested.length > 0 && (
          <Card className="lg:col-span-2">
            <p className="text-small text-muted">Valor de tus inversiones</p>
            <p className="text-hero"><AnimatedMoney value={total} storageKey="inversiones:total" /></p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small">
              {withChange.length > 0 && (
                <p><span className="text-muted">Hoy </span><AnimatedMoney value={today} signed colored storageKey="inversiones:hoy" />
                  <span className="text-muted"> ({todayBase > 0 ? pct(today / todayBase, { signed: true }) : '—'})</span></p>
              )}
              <p><span className="text-muted"><Term k="rentabilidad">Desde el principio</Term> </span><AnimatedMoney value={profit} signed colored storageKey="inversiones:ganancia" />
                <span className="text-muted"> ({contributed > 0 ? pct(profit / contributed, { signed: true }) : '—'} sobre <span className="num">{eur(contributed)}</span>)</span></p>
            </div>
            <div className="mb-4 mt-2"><LivePrices updatedAt={updatedAt} /></div>
            <NetWorthChart points={points} today={data.today} />
          </Card>
        )}

        <AdviceCard advice={advice} />

        {/* Al principiante, la comparación y la previsión le llegan plegadas: primero lo básico. */}
        {invested.length > 0 && level === 'beginner' ? (
          <details className="group lg:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-card border border-line bg-surface px-4 py-3.5 text-small font-medium">
              Comparar con el mercado y ver cuánto tendré
              <ChevronDown size={16} className="text-muted transition-transform duration-300 ease-soft group-open:rotate-180" />
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ComparisonCard title="Tu cartera, comparada" own={ownReturn(flows, total)} world={benchmarkReturn(flows, refs.world)}
                inflation={inflationReturn(flows, data.today, refs.hicp)} savings={savingsReturn(flows, data.today)} />
              <FutureCard invested={total} monthly={monthlyPlans} />
            </div>
          </details>
        ) : invested.length > 0 && (
          <>
            <ComparisonCard title="Tu cartera, comparada" own={ownReturn(flows, total)} world={benchmarkReturn(flows, refs.world)}
              inflation={inflationReturn(flows, data.today, refs.hicp)} savings={savingsReturn(flows, data.today)} />
            <FutureCard invested={total} monthly={monthlyPlans} />
          </>
        )}

        {plans.length > 0 && <section>
          {title('Planes automáticos', { href: '/automatico', label: 'Gestionar' })}
          <Card flush className="divide-y divide-line">
            {plans.map((s) => {
              const h = holdingOf.get(s.recurring.holdingId ?? '');
              const days = daysBetween(data.today, s.next);
              return (
                <Link key={s.recurring.id} href="/automatico" className={`flex items-center gap-3 px-5 py-3.5 ${s.recurring.active ? '' : 'opacity-50'}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"><Repeat size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{h?.name ?? s.recurring.name}</span>
                    <span className="block truncate text-small text-muted">
                      Día {s.recurring.dayOfMonth} desde {accountOf.get(s.fromAccountId ?? '')?.name ?? '?'} · {days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`}
                    </span>
                    {s.shortfall > 0 && (
                      <span className="mt-0.5 flex items-center gap-1 text-small text-warn"><AlertTriangle size={12} /> Faltarían <span className="num">{eur(s.shortfall)}</span></span>
                    )}
                  </span>
                  <span className="num font-medium">{eur(Math.abs(s.recurring.amount))}</span>
                </Link>
              );
            })}
          </Card>
        </section>}

        {byKind.length > 0 && <Card><AllocationTabs byKind={byKind} byAccount={byAccount} /></Card>}

        {(interests.length > 0 || savings.length > 0) && (
          <section>
            {title('Dinero remunerado')}
            <Card flush className="divide-y divide-line">
              {interests.map((i) => {
                const a = accountOf.get(i.accountId);
                const balance = pf.items.filter((x) => x.holding.accountId === i.accountId && x.holding.kind === 'cash').reduce((s, x) => s + x.value.value, 0);
                return (
                  <Link key={i.accountId} href={`/cuentas/${i.accountId}`} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: a?.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a?.name} · {i.rate > 0 ? tae(i.rate) : 'sin interés'}</span>
                      <span className="block truncate text-small text-muted">
                        Este mes <span className="num">{eur(i.accrued)}</span>
                        {i.paidThisYear > 0 && <> · en {data.today.slice(0, 4)} <span className="num">{eur(i.paidThisYear)}</span></>}
                      </span>
                    </span>
                    <span className="num font-medium">{eur(balance)}</span>
                    <ChevronRight size={16} className="shrink-0 text-muted" />
                  </Link>
                );
              })}
              {savings.map(({ holding: h, value: v }) => (
                <Link key={h.id} href={`/cuentas/${h.accountId}`} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: accountOf.get(h.accountId)?.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{h.name}{h.apy ? ` · ${tae(h.apy)}` : ''}</span>
                    <span className="block truncate text-small text-muted">{accountOf.get(h.accountId)?.name} · ganado <span className="num">{eur(v.profit)}</span></span>
                  </span>
                  <span className="num font-medium">{eur(v.value)}</span>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </Link>
              ))}
            </Card>
            <p className="mt-2 px-1 text-small text-muted">Los intereses se apuntan solos el día 1 de cada mes. La <Term k="tae">TAE</Term> se cambia en la cuenta.</p>
          </section>
        )}

        {brokers.map((a) => {
          const items = invested.filter((i) => i.holding.accountId === a.id);
          const sum = items.reduce((s, i) => s + i.value.value, 0);
          return (
            <section key={a.id} className="lg:col-span-2">
              <Link href={`/cuentas/${a.id}`} className="mb-2 flex items-center gap-2 px-1">
                <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                <h2 className="flex-1 text-small font-medium">{a.name}</h2>
                <span className="num text-small text-muted">{eur(sum)}</span>
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {items.map((item) => (
                  <HoldingCard key={item.holding.id} item={item} today={data.today} price={priceOf(item.holding)} lastValuation={lastValuation(item.holding.id)} extra={extraOf(item)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-6 px-1 text-small text-muted">Toca una inversión para ver su evolución, cómo va comparada y qué es. Las posiciones nuevas se añaden desde su cuenta.</p>
    </>
  );
}
