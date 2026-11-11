import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { all, must } from '@/lib/data/load';
import { toSnapshot, toTransaction } from '@/lib/data/mappers';
import { requireUser } from '@/lib/supabase/user';
import { yearSummary } from '@/lib/finance/year';
import { eur, monthLabel, pct } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CategoryBars } from '@/components/charts/category-bars';
import { IncomeExpenseChart } from '@/components/charts/income-expense-chart';

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: raw } = await params;
  const year = Number(raw);
  const data = await getAppData('settings');
  const thisYear = Number(data.today.slice(0, 4));
  if (!/^\d{4}$/.test(raw) || year < 2000 || year > thisYear) notFound();

  // El año entero, aunque quede fuera de la ventana de 13 meses de las demás pantallas.
  const { supabase } = await requireUser();
  const [rows, snapRows, firstRows] = await Promise.all([
    all((f, t) => supabase.from('transactions').select('*').is('transfer_account_id', null)
      .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`).order('date').order('id').range(f, t)),
    all((f, t) => supabase.from('snapshots').select('*').gte('date', `${year - 1}-12-01`).lte('date', `${year}-12-31`).order('date').range(f, t)),
    supabase.from('transactions').select('date').order('date').limit(1).then(must),
  ]);
  const s = yearSummary(rows.map(toTransaction), snapRows.map(toSnapshot), year);
  const firstYear = firstRows[0] ? Number(String(firstRows[0].date).slice(0, 4)) : thisYear;
  const years = Array.from({ length: thisYear - Math.min(firstYear, year) + 1 }, (_, i) => thisYear - i);

  const catName = new Map(data.categories.map((c) => [c.id, c.name]));
  const bars = s.byCategory.slice(0, 8).map((c) => ({ name: c.categoryId ? catName.get(c.categoryId) ?? 'Otra' : 'Sin categoría', value: c.spent }));
  const series = s.months.map((m) => ({ ...m, label: monthLabel(m.month, 'short') }));
  const nwChange = s.netWorthStart !== null && s.netWorthEnd !== null ? s.netWorthEnd - s.netWorthStart : null;
  const ongoing = year === thisYear;
  const month = (m: string) => monthLabel(m).replace(/ \d{4}$/, '').toLowerCase();

  const stat = (label: string, value: React.ReactNode, hint?: React.ReactNode) => (
    <div>
      <p className="text-small text-muted">{label}</p>
      <p className="num text-title font-light">{value}</p>
      {hint && <p className="num text-small text-muted">{hint}</p>}
    </div>
  );

  return (
    <>
      <Link href="/analisis" className="inline-flex items-center gap-1 pt-4 text-small text-muted lg:pt-0"><ChevronLeft size={16} /> Análisis</Link>
      <PageHeader title={`Tu ${year}`} subtitle={ongoing ? `Hasta hoy, ${data.today.slice(8)} de ${month(data.today.slice(0, 7))}` : 'El año completo'} />
      {years.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {years.map((y) => (
            <Link key={y} href={`/analisis/${y}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-small ${y === year ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{y}</Link>
          ))}
        </div>
      )}

      {s.income === 0 && s.spent === 0 ? (
        <EmptyState title={`No hay movimientos en ${year}`} body="Si los tienes en el banco, puedes importarlos." actions={[{ href: '/ajustes/importar', label: 'Importar movimientos' }]} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="grid grid-cols-2 gap-5 lg:col-span-2 lg:grid-cols-4">
            {stat('Ingresaste', eur(s.income, { whole: true }))}
            {stat('Gastaste', eur(s.spent, { whole: true }))}
            {stat('Ahorraste', <span className={s.saved < 0 ? 'text-loss' : ''}>{eur(s.saved, { whole: true })}</span>,
              s.savingRate !== null ? `${pct(s.savingRate)} de lo que entró` : undefined)}
            {stat('Patrimonio', nwChange === null ? '—' : <span className={nwChange < 0 ? 'text-loss' : 'text-gain'}>{eur(nwChange, { signed: true, whole: true })}</span>,
              s.netWorthEnd !== null ? `${eur(s.netWorthStart ?? 0, { whole: true })} → ${eur(s.netWorthEnd, { whole: true })}` : 'Sin fotos diarias de ese año')}
          </Card>

          <Card className="lg:col-span-2"><h2 className="mb-4 text-heading">Mes a mes</h2><IncomeExpenseChart data={series} /></Card>

          <Card><h2 className="mb-4 text-heading">En qué se fue</h2><CategoryBars items={bars} /></Card>

          <Card className="flex flex-col gap-4">
            <h2 className="text-heading">Lo destacado</h2>
            {s.bestMonth && (
              <p className="text-small">Tu mejor mes fue <b>{month(s.bestMonth.month)}</b>: ahorraste <span className="num">{eur(s.bestMonth.saved, { whole: true })}</span>.</p>
            )}
            {s.worstMonth && (
              <p className="text-small">Donde más gastaste fue en <b>{month(s.worstMonth.month)}</b>: <span className="num">{eur(s.worstMonth.spent, { whole: true })}</span>.</p>
            )}
            {s.topMerchant && (
              <p className="text-small">
                El sitio donde más dejaste: <b>{s.topMerchant.name}</b>, <span className="num">{eur(s.topMerchant.spent, { whole: true })}</span> en {s.topMerchant.count} {s.topMerchant.count === 1 ? 'compra' : 'compras'}.
              </p>
            )}
            {s.spent > 0 && (
              <p className="text-small text-muted">De media, <span className="num">{eur(s.spent / Math.max(1, s.months.filter((m) => m.income > 0 || m.spent > 0).length), { whole: true })}</span> de gasto al mes.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
