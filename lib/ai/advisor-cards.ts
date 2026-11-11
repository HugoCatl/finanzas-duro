import type { AppData } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';
import type { CardTag, ChatCard } from '@/lib/ai/advisor';
import { budgetStatus, monthTotals } from '@/lib/finance/month';
import { addMonths, monthOf } from '@/lib/dates';
import { eur, monthLabel, pct } from '@/lib/format';

const INVESTED = new Set(['fund', 'stock', 'crypto']);

/** Tarjetas del chat con las cifras de la app (no las del modelo). Una etiqueta sin datos no da tarjeta. */
export function buildChatCards(tags: CardTag[], data: AppData, pf: PortfolioSummary): ChatCard[] {
  const month = monthOf(data.today);
  const cash = (pf.byKind.cash ?? 0) + (pf.byKind.savings ?? 0);
  const out: ChatCard[] = [];
  for (const tag of tags) {
    if (tag === 'presupuesto') {
      const b = budgetStatus(data.categories, data.transactions, month);
      if (b.limit <= 0) continue;
      out.push({
        title: `Presupuesto de ${monthLabel(month).toLowerCase().replace(/ \d{4}$/, '')}`,
        value: `${b.remaining >= 0 ? 'Te quedan' : 'Te has pasado'} ${eur(Math.abs(b.remaining))}`,
        detail: `Gastado ${eur(b.spent)} de ${eur(b.limit)}`, href: '/presupuesto', pct: Math.min(1, b.pct ?? 0),
      });
    } else if (tag === 'colchon') {
      const spent = [1, 2, 3].map((i) => monthTotals(data.transactions, data.events, data.holdings, addMonths(month, -i)).spent).filter((n) => n > 0);
      const monthly = spent.length ? spent.reduce((s, n) => s + n, 0) / spent.length : 0;
      const months = monthly > 0 ? cash / monthly : null;
      out.push({
        title: 'Tu colchón', value: `${eur(cash)} en efectivo`,
        detail: months === null ? 'Aún no hay meses cerrados para saber cuántos meses cubre'
          : `Cubre ${months >= 24 ? 'más de 24' : (Math.round(months * 10) / 10).toString().replace('.', ',')} meses de gastos`,
        href: '/cuentas', ...(months === null ? {} : { pct: Math.min(1, months / 6) }),
      });
    } else if (tag === 'inversiones') {
      const items = pf.items.filter((i) => INVESTED.has(i.holding.kind) && !i.holding.archived && i.value.value > 0);
      if (!items.length) continue;
      const value = items.reduce((s, i) => s + i.value.value, 0);
      const put = items.reduce((s, i) => s + i.value.contributed, 0);
      out.push({
        title: 'Tus inversiones', value: eur(value),
        detail: `${eur(value - put, { signed: true })}${put > 0 ? ` (${pct((value - put) / put, { signed: true })})` : ''} desde el principio`, href: '/inversiones',
      });
    } else if (tag === 'objetivo') {
      const target = data.settings.netWorthTarget;
      if (!target || target <= 0) continue;
      out.push({
        title: `Objetivo ${eur(target, { whole: true })}`, value: pct(Math.min(1, pf.total / target)),
        detail: pf.total >= target ? 'Objetivo conseguido' : `Te faltan ${eur(target - pf.total)}`, href: '/', pct: Math.min(1, pf.total / target),
      });
    }
  }
  return out;
}
