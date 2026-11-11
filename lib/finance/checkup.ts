import type { AppData } from '@/lib/types';
import type { PortfolioSummary } from '@/lib/finance/holdings';
import { budgetStatus, monthTotals, projectedSpend } from '@/lib/finance/month';
import { recurringKind } from '@/lib/finance/recurring';
import { addMonths, monthOf } from '@/lib/dates';
import { eur } from '@/lib/format';

export type CheckupKey = 'saving' | 'budget' | 'cushion' | 'risk';
export interface CheckupPart { key: CheckupKey; label: string; score: number; detail: string }
export interface CheckupScore { month: string; partial: boolean; score: number | null; parts: CheckupPart[] }

const WEIGHT: Record<CheckupKey, number> = { saving: 0.35, budget: 0.25, cushion: 0.25, risk: 0.15 };
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const r1 = (n: number) => Math.round(n * 10) / 10;
const whole = (n: number) => `${Math.round(n * 100)} %`;

/**
 * Nota del mes, de 0 a 10, con reglas fijas: ahorro, presupuesto, colchón y riesgo. Lo que no se puede
 * medir (sin ingresos, sin límites, sin inversiones) no cuenta. En el mes en curso el gasto se proyecta a
 * fin de mes y los ingresos son, como mínimo, los fijos: la nómina puede no haber llegado todavía.
 */
export function checkupScore(data: AppData, pf: PortfolioSummary, month: string): CheckupScore {
  const partial = month === monthOf(data.today);
  const totals = monthTotals(data.transactions, data.events, data.holdings, month);
  const project = (n: number) => (partial ? projectedSpend(n, data.today) : n);
  const spent = project(totals.spent);
  const fixedIncome = data.recurring.filter((r) => r.active && recurringKind(r) === 'income').reduce((s, r) => s + r.amount, 0);
  const income = partial ? Math.max(totals.income, fixedIncome) : totals.income;
  const parts: CheckupPart[] = [];
  // Un mes cerrado sin un solo movimiento no se puede puntuar.
  if (!partial && totals.income === 0 && totals.spent === 0) return { month, partial, score: null, parts };

  if (income > 0) {
    const rate = (income - spent) / income;
    parts.push({
      key: 'saving', label: 'Ahorro', score: r1(clamp(rate / 0.3) * 10),
      detail: rate <= 0 ? `${partial ? 'Vas camino de gastar' : 'Has gastado'} más de lo que ingresas`
        : `${partial ? 'Vas camino de ahorrar' : 'Has ahorrado'} el ${whole(rate)} de lo que ingresas`,
    });
  }

  const budget = budgetStatus(data.categories, data.transactions, month);
  if (budget.limit > 0) {
    const used = project(budget.spent);
    const ratio = used / budget.limit;
    parts.push({
      key: 'budget', label: 'Presupuesto', score: r1(ratio <= 1 ? 10 : clamp((1.5 - ratio) / 0.5) * 10),
      detail: `${partial ? 'Vas camino de cerrar en' : 'Has gastado'} ${eur(used, { whole: true })} de ${eur(budget.limit, { whole: true })}`,
    });
  }

  const cash = (pf.byKind.cash ?? 0) + (pf.byKind.savings ?? 0);
  const before = [1, 2, 3].map((i) => monthTotals(data.transactions, data.events, data.holdings, addMonths(month, -i)).spent).filter((n) => n > 0);
  const monthly = before.length ? before.reduce((s, n) => s + n, 0) / before.length : spent;
  if (monthly > 0) {
    const months = cash / monthly;
    parts.push({
      key: 'cushion', label: 'Colchón', score: r1(clamp(months / 6) * 10),
      detail: `Tu efectivo cubre ${months >= 24 ? 'más de 24' : r1(months).toString().replace('.', ',')} meses de gastos`,
    });
  }

  const invested = pf.total - cash;
  if (invested > 0) {
    const risky = ((pf.byKind.crypto ?? 0) + (pf.byKind.stock ?? 0)) / invested;
    parts.push({
      key: 'risk', label: 'Riesgo', score: r1(risky <= 0.1 ? 10 : clamp((0.6 - risky) / 0.5) * 10),
      detail: `Cripto y acciones sueltas son el ${whole(risky)} de lo que tienes invertido`,
    });
  }

  const weight = parts.reduce((s, p) => s + WEIGHT[p.key], 0);
  const score = parts.length ? r1(parts.reduce((s, p) => s + p.score * WEIGHT[p.key], 0) / weight) : null;
  return { month, partial, score, parts };
}
