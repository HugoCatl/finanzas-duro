import type { AppData, Recurring } from '@/lib/types';
import type { PortfolioSummary } from './holdings';
import { r2 } from './holdings';
import { recurringKind, upcomingRecurring, type RecurringKind } from './recurring';

export interface AutomationStep {
  recurring: Recurring;
  kind: RecurringKind;
  next: string; // próxima fecha
  lastDone: string | null; // última vez que se apuntó solo
  fromAccountId: string | null; // de dónde sale el dinero (o adónde entra, si es ingreso)
  toAccountId: string | null; // traspaso: destino
  shortfall: number; // lo que faltaría en la cuenta de origen ese día (0 = hay de sobra)
}

/** Cuenta de la que sale el dinero de un fijo (en un plan, la de la posición que compra). */
function sourceAccount(r: Recurring, holdingAccount: Map<string, string>): string | null {
  return r.holdingId ? holdingAccount.get(r.holdingId) ?? null : r.accountId;
}

/**
 * Fijos activos en orden de fecha, con lo que hace falta para verlos como una cadena: próxima vez, última vez y si
 * podría faltar saldo. El saldo se proyecta con el efectivo de hoy y los fijos que pasen antes (sin gastos sueltos),
 * así que solo avisa cuando ni con eso llega. Las cuentas sin efectivo apuntado no se comprueban.
 */
export function automationSteps(
  data: Pick<AppData, 'recurring' | 'holdings' | 'transactions' | 'transfers' | 'events' | 'today'>, pf: PortfolioSummary,
): AutomationStep[] {
  const holdingAccount = new Map(data.holdings.map((h) => [h.id, h.accountId]));
  const cash = new Map<string, number>();
  for (const i of pf.items) if (i.holding.kind === 'cash') cash.set(i.holding.accountId, (cash.get(i.holding.accountId) ?? 0) + i.value.value);

  const last = new Map<string, string>();
  for (const x of [...data.transactions, ...data.transfers, ...data.events]) {
    if (x.recurringId && x.date > (last.get(x.recurringId) ?? '')) last.set(x.recurringId, x.date);
  }

  const upcoming = upcomingRecurring(data.recurring, data.today, data.recurring.length);
  const effect = (r: Recurring, accountId: string): number => {
    const kind = recurringKind(r);
    const amount = Math.abs(r.amount);
    if (kind === 'transfer') return r.accountId === accountId ? -amount : r.transferAccountId === accountId ? amount : 0;
    if (kind === 'plan') return sourceAccount(r, holdingAccount) === accountId ? -amount : 0;
    return r.accountId === accountId ? r.amount : 0;
  };

  return upcoming.map(({ recurring: r, date }) => {
    const kind = recurringKind(r);
    const from = sourceAccount(r, holdingAccount);
    let shortfall = 0;
    if ((kind === 'transfer' || kind === 'plan') && from && cash.has(from)) {
      const projected = cash.get(from)! + upcoming.filter((u) => u.date <= date).reduce((s, u) => s + effect(u.recurring, from), 0);
      if (projected < 0) shortfall = r2(-projected);
    }
    return {
      recurring: r, kind, next: date, lastDone: last.get(r.id) ?? null,
      fromAccountId: from, toAccountId: kind === 'transfer' ? r.transferAccountId ?? null : null, shortfall,
    };
  });
}
