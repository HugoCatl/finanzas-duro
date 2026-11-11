import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { learnedCategories } from '@/lib/transactions/learn';
import { addDays, monthOf } from '@/lib/dates';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { budgetStatus, monthTotals } from '@/lib/finance/month';
import { goalProgress, monthlyPace } from '@/lib/finance/goal';
import { netWorthChange } from '@/lib/finance/networth';
import { upcomingRecurring } from '@/lib/finance/recurring';
import { priceKey } from '@/lib/prices/keys';
import { buildSuggestions } from '@/lib/rules/suggestions';
import { Card } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { ActivityCard } from '@/components/home/activity-card';
import { AlertsCard } from '@/components/home/alerts-card';
import { GoalCard } from '@/components/home/goal-card';
import { PrivacyToggle } from '@/components/ui/privacy-toggle';
import { Hero } from '@/components/ui/hero';
import { InvestmentsCard } from '@/components/home/investments-card';
import { MonthCard } from '@/components/home/month-card';
import { Sparkline } from '@/components/home/sparkline';
import { HomeTour } from '@/components/onboarding/tour';
import { UncategorizedInbox } from '@/components/transactions/uncategorized-inbox';
import { AddTransaction } from '@/components/transactions/add-transaction';
import { CheckupCard } from '@/components/advisor/checkup-card';
import { requireUser } from '@/lib/supabase/user';
import { listCheckups } from '@/lib/checkup/run';

export default async function HomePage() {
  const data = await getAppData();
  if (data.accounts.length === 0) redirect('/bienvenida');
  const month = monthOf(data.today);
  const pf = appPortfolio(data);
  const totals = monthTotals(data.transactions, data.events, data.holdings, month);
  const budget = budgetStatus(data.categories, data.transactions, month);
  const change = netWorthChange(data.snapshots, pf.total, data.today);
  const since = addDays(data.today, -30);
  const trend = [...data.snapshots.filter((s) => s.date >= since && s.date < data.today).map((s) => s.netWorth), pf.total];
  const tips = buildSuggestions({
    today: data.today, categories: data.categories, transactions: data.transactions, recurring: data.recurring,
    portfolio: pf,
  }).slice(0, 3);
  const uncategorized = data.transactions.filter((t) => t.amount < 0 && t.categoryId === null);
  const unread = data.alerts.filter((a) => !a.readAt);
  const expenseCats = data.categories.filter((c) => c.kind === 'expense');
  const target = data.settings.netWorthTarget;
  const pace = monthlyPace(data.recurring, data.categories);
  // Si los chequeos no cargan, Inicio sigue: la tarjeta sale como si no hubiera ninguno.
  const { supabase } = await requireUser();
  const checkup = (await listCheckups(supabase, data.userId, 3).catch((e) => { console.error('No se pudieron cargar los chequeos', e); return []; }))[0] ?? null;

  return (
    <>
      <header className="flex items-center justify-between pb-1 pt-4 lg:pt-0">
        <h1 className="text-small font-medium text-muted">Hola de nuevo</h1>
        <div className="flex gap-2">
          <PrivacyToggle />
          <Link href="/ajustes" aria-label="Ajustes" className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted lg:hidden">
            <UserRound size={18} />
          </Link>
        </div>
      </header>

      <div data-tour="networth" className="flex items-end justify-between gap-4 pt-4">
        <Hero label="Tu patrimonio" value={pf.total} storageKey="inicio:patrimonio">
          <Delta label="Hoy" value={change.day} />
          <Delta label="Este mes" value={change.month} />
          <Delta label="Este año" value={change.year} />
        </Hero>
        <Sparkline values={trend} className="mb-7 shrink-0" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {unread.length > 0 && <AlertsCard alerts={unread} />}
        {uncategorized.length > 0 && <UncategorizedInbox transactions={uncategorized} categories={expenseCats} />}

        <div data-tour="investments" className="empty:hidden"><InvestmentsCard items={pf.items} accounts={data.accounts} priceOf={(i) => {
          const key = priceKey(i.holding);
          return key ? data.prices[key] : undefined;
        }} /></div>

        <div data-tour="month"><MonthCard month={month} budget={budget} totals={totals} /></div>

        <CheckupCard checkup={checkup} month={month} />

        <div data-tour="activity" className="empty:hidden"><ActivityCard upcoming={upcomingRecurring(data.recurring, data.today, 3)} transactions={data.transactions} transfers={data.transfers}
          categories={data.categories} accounts={data.accounts} today={data.today} /></div>

        {target !== null && <div data-tour="goal"><GoalCard target={target} pace={pace} progress={goalProgress(target, pf.total, pace, data.today)} /></div>}

        {tips.length > 0 && (
          <Card>
            <h2 className="mb-3 text-heading">Sugerencias</h2>
            <ul className="flex flex-col gap-3">
              {tips.map((s) => (
                <li key={s.id}>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-small text-muted">{s.body}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <AddTransaction categories={data.categories} accounts={data.accounts} today={data.today} learned={learnedCategories(data.transactions)} />
      <Suspense><HomeTour /></Suspense>
    </>
  );
}

function Delta({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="text-muted">
      {label} {value === null ? '—' : <Money value={value} signed colored />}
    </span>
  );
}
