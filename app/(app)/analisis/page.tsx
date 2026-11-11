import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { addMonths, monthOf } from '@/lib/dates';
import { monthLabel } from '@/lib/format';
import { KIND_COLORS, KIND_LABELS } from '@/lib/labels';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { monthlySeries, spendByCategory } from '@/lib/finance/month';
import { requireUser } from '@/lib/supabase/user';
import { toAiSummary } from '@/lib/data/mappers';
import type { HoldingKind } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { AllocationTabs } from '@/components/charts/allocation-tabs';
import { CategoryBars } from '@/components/charts/category-bars';
import { IncomeExpenseChart } from '@/components/charts/income-expense-chart';
import { NetWorthChart } from '@/components/charts/net-worth-chart';
import { ProjectionCard } from '@/components/charts/projection-card';
import { averageSaving } from '@/lib/finance/projection';
import { CheckupHistory } from '@/components/analysis/checkup-history';

export default async function AnalisisPage() {
  const data = await getAppData('analysis');
  if (data.transactions.length === 0 && data.holdings.length === 0) {
    return (
      <>
        <PageHeader title="Análisis" />
        <EmptyState title="Aún no hay nada que analizar"
          body="Aquí verás cómo evoluciona tu patrimonio, en qué gastas cada mes frente al anterior y tus ingresos del año. Se llena solo a medida que apuntas."
          actions={[{ href: '/movimientos', label: 'Apuntar un gasto' }, { href: '/ajustes/importar', label: 'Importar movimientos' }]} />
      </>
    );
  }
  const month = monthOf(data.today);
  const pf = appPortfolio(data);
  const catById = new Map(data.categories.map((c) => [c.id, c]));

  const points = [
    ...data.snapshots.filter((s) => s.date < data.today).map((s) => ({ date: s.date, value: s.netWorth })),
    { date: data.today, value: pf.total },
  ];
  const prevSpend = spendByCategory(data.transactions, addMonths(month, -1));
  const bars = Object.entries(spendByCategory(data.transactions, month))
    .map(([id, value]) => ({ name: id === 'none' ? 'Sin categoría' : catById.get(id)?.name ?? 'Otra', value, previous: prevSpend[id] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const series = monthlySeries(data.transactions, month, 12).map((r) => ({ ...r, label: monthLabel(r.month, 'short') }));
  const byKind = (Object.entries(pf.byKind) as [HoldingKind, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: KIND_LABELS[k], value: v, color: KIND_COLORS[k] }));
  const byAccount = data.accounts
    .map((a) => ({ name: a.name, value: pf.byAccount[a.id] ?? 0, color: a.color }))
    .filter((x) => x.value > 0);

  const { supabase } = await requireUser();
  const { data: summaryRows, error: summaryError } = await supabase
    .from('ai_summaries').select('*').order('created_at', { ascending: false }).limit(6);
  if (summaryError) throw new Error(`No se pudieron cargar los resúmenes: ${summaryError.message}`);
  const summaries = (summaryRows ?? []).map(toAiSummary);

  const title = (t: string) => <h2 className="mb-4 text-heading">{t}</h2>;

  return (
    <>
      <PageHeader title="Análisis" action={
        <Link href={`/analisis/${data.today.slice(0, 4)}`} className="rounded-full bg-surface px-3.5 py-2 text-small font-medium">Tu {data.today.slice(0, 4)}</Link>
      } />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">{title('Evolución del patrimonio')}<NetWorthChart points={points} today={data.today} /></Card>
        <Card className="lg:col-span-2">{title('Proyección')}<ProjectionCard cash={pf.byKind.cash + pf.byKind.savings}
          invested={pf.byKind.fund + pf.byKind.stock + pf.byKind.crypto} saving={averageSaving(data.transactions, month)}
          currentYear={Number(data.today.slice(0, 4))} /></Card>
        <Card>{title(`Gasto de ${monthLabel(month).toLowerCase()} vs. el mes anterior`)}<CategoryBars items={bars} /></Card>
        <Card>{title('Ingresos y gastos · 12 meses')}<IncomeExpenseChart data={series} /></Card>
        <Card><AllocationTabs byKind={byKind} byAccount={byAccount} /></Card>
        <details className="group lg:col-span-2">
          <summary className="flex cursor-pointer list-none items-center justify-between px-1 py-2 text-small font-medium text-muted">
            Chequeos de Duro
            <ChevronDown size={16} className="transition-transform duration-300 ease-soft group-open:rotate-180" />
          </summary>
          <div className="mt-2"><CheckupHistory summaries={summaries} /></div>
        </details>
      </div>
    </>
  );
}
