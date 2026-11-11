import { AlertTriangle, ArrowDownLeft, ArrowRight, Percent, TrendingUp } from 'lucide-react';
import { getAppData } from '@/lib/data/app-data';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { automationSteps, type AutomationStep } from '@/lib/finance/automation';
import { accountInterests } from '@/lib/finance/interest';
import { addMonths, monthOf } from '@/lib/dates';
import { dayMonth, eur, tae } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Hero } from '@/components/ui/hero';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { RecurringEditor } from '@/components/budget/recurring-editor';

type Node = { key: string; date: string; icon: typeof ArrowRight; text: React.ReactNode; amount: string; warn?: string; muted?: boolean };

export default async function AutomaticoPage() {
  const data = await getAppData('budget');
  const pf = appPortfolio(data);
  const steps = automationSteps(data, pf);
  const interests = accountInterests(data).filter((i) => i.rate > 0);
  const name = (id: string | null) => data.accounts.find((a) => a.id === id)?.name ?? '?';
  const holdingName = (id: string | null | undefined) => data.holdings.find((h) => h.id === id)?.name ?? '?';
  const firstOfNext = `${addMonths(monthOf(data.today), 1)}-01`;

  const describe = (s: AutomationStep): Node | null => {
    const r = s.recurring;
    const base = { key: r.id, date: s.next, amount: eur(Math.abs(r.amount)), muted: !r.active, warn: s.shortfall > 0 ? `Faltarían ${eur(s.shortfall)} en ${name(s.fromAccountId)}` : undefined };
    if (s.kind === 'income') return { ...base, icon: ArrowDownLeft, text: <><b>{r.name}</b> entra en {r.accountId ? name(r.accountId) : 'tu cuenta'}</>, amount: eur(r.amount, { signed: true }) };
    if (s.kind === 'transfer') return { ...base, icon: ArrowRight, text: <><b>{name(s.fromAccountId)}</b> pasa a <b>{name(s.toAccountId)}</b></> };
    if (s.kind === 'plan') return { ...base, icon: TrendingUp, text: <><b>{name(s.fromAccountId)}</b> compra {holdingName(r.holdingId)}</> };
    return null;
  };
  const nodes: Node[] = [
    ...steps.map(describe).filter((n): n is Node => n !== null),
    ...interests.map((i) => ({
      key: `int-${i.accountId}`, date: firstOfNext, icon: Percent,
      text: <><b>{name(i.accountId)}</b> te paga intereses ({tae(i.rate)})</>, amount: `≈ ${eur(i.accrued)}`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const notes = Object.fromEntries(steps.filter((s) => s.kind === 'transfer' || s.kind === 'plan').map((s) => [s.recurring.id, (
    <span key={s.recurring.id} className="block text-small text-muted">
      {s.recurring.active ? <>Próxima: {dayMonth(s.next)}</> : 'En pausa'}
      {s.lastDone && <> · última {dayMonth(s.lastDone)}</>}
      {s.shortfall > 0 && <span className="mt-0.5 flex items-center gap-1 text-warn"><AlertTriangle size={12} /> Faltarían {eur(s.shortfall)}</span>}
    </span>
  )]));
  const moving = steps.filter((s) => s.recurring.active && (s.kind === 'transfer' || s.kind === 'plan')).reduce((sum, s) => sum + Math.abs(s.recurring.amount), 0);

  return (
    <>
      <PageHeader title="Automático" />
      <Hero label="Se mueve solo cada mes" value={moving} storageKey="automatico:mueves">
        <span className="text-muted">Traspasos y planes activos</span>
      </Hero>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 px-1 text-small font-medium text-muted">Lo próximo</h2>
          <Card>
            {nodes.length === 0 ? (
              <p className="text-small text-muted">
                Aquí verás tu mes encadenado: entra la nómina, pasas dinero a tus brókers, se compran tus planes y te pagan intereses.
                Empieza añadiendo un traspaso o un plan.
              </p>
            ) : (
              <ol className="relative">
                {nodes.map((n, i) => (
                  <li key={n.key} className={`relative flex gap-3 pb-5 last:pb-0 ${n.muted ? 'opacity-50' : ''}`}>
                    {i < nodes.length - 1 && <span aria-hidden className="absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-px bg-line" />}
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"><n.icon size={16} /></span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className="block text-small text-muted">{dayMonth(n.date)}</span>
                      <span className="block">{n.text}</span>
                      {n.warn && <span className="mt-0.5 flex items-center gap-1 text-small text-warn"><AlertTriangle size={12} /> {n.warn}</span>}
                    </span>
                    <span className="num shrink-0 pt-5 font-medium">{n.amount}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <p className="mt-2 px-1 text-small text-muted">
            Se apunta solo el día que toca. Una compra sin saldo suficiente no se hace: te avisamos para que pases el dinero.
          </p>
        </section>

        <div className="flex flex-col gap-4">
          <RecurringEditor recurring={data.recurring} categories={data.categories} accounts={data.accounts} holdings={data.holdings}
            kinds={['transfer', 'plan']} title="Traspasos y planes" defaultOpen notes={notes}
            summary={<>Mueves <span className="num">{eur(moving)}</span> al mes</>} />

          <Card flush>
            <div className="px-4 pb-3 pt-4">
              <h2 className="text-heading">Intereses</h2>
              <p className="text-small text-muted">Se apuntan el día 1 con lo generado el mes anterior.</p>
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {interests.length === 0 && <li className="px-4 py-3 text-small text-muted">Si una cuenta te paga intereses, entra en ella desde Cuentas y pon su TAE.</li>}
              {interests.map((i) => (
                <li key={i.accountId}>
                  <ListRow href={`/cuentas/${i.accountId}`} title={name(i.accountId)} subtitle={`${tae(i.rate)} TAE`} value={`≈ ${eur(i.accrued)}`} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
