import type { AppData } from '@/lib/types';
import { accountFlows, portfolio, type PortfolioSummary } from './holdings';

/** Cartera con los saldos de efectivo movidos por gastos, ingresos, traspasos y compras. */
export function appPortfolio(
  data: Pick<AppData, 'holdings' | 'events' | 'prices' | 'today' | 'transactions' | 'transfers'>,
  accountId?: string,
): PortfolioSummary {
  const holdings = accountId ? data.holdings.filter((h) => h.accountId === accountId) : data.holdings;
  const flows = accountFlows(data.transactions, data.transfers, data.events, data.holdings);
  return portfolio(holdings, data.events, data.prices, data.today, flows);
}
