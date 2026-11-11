export type HoldingKind = 'cash' | 'savings' | 'fund' | 'crypto' | 'stock';
export type EventType = 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'valuation' | 'balance_adjust';
export type TransactionSource = 'manual' | 'recurring' | 'apple_pay' | 'import' | 'interest';
export type CategoryKind = 'expense' | 'income';

export interface Account { id: string; name: string; institution: string; color: string; sortOrder: number }

/** TAE del efectivo de una cuenta desde `fromDate` (hasta la siguiente). */
export interface AccountRate { id: string; accountId: string; rate: number; fromDate: string }

export interface Holding {
  id: string;
  accountId: string;
  name: string;
  kind: HoldingKind;
  apy: number | null; // 0.0225 = 2,25 %
  coingeckoId: string | null;
  isin: string | null;
  priceSymbol: string | null; // símbolo de Yahoo Finance (fondos y acciones)
  archived: boolean;
}

export interface HoldingEvent {
  id: string;
  holdingId: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  amountEur: number; // siempre >= 0
  quantity: number | null;
  unitPriceEur: number | null;
  recurringId?: string | null; // compra creada por un plan de inversión
  createdAt?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number; // + ingreso, - gasto
  merchant: string | null;
  note: string | null;
  categoryId: string | null;
  accountId: string | null;
  source: TransactionSource;
  recurringId: string | null;
  createdAt?: string;
}

/** Dinero que pasa de una cuenta tuya a otra. No cuenta como gasto ni ingreso. */
export interface Transfer {
  id: string;
  date: string;
  amount: number; // siempre > 0
  fromAccountId: string;
  toAccountId: string;
  note: string | null;
  recurringId: string | null;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  kind: CategoryKind;
  isFixed: boolean;
  monthlyLimit: number | null;
  sortOrder: number;
  defaultAccountId?: string | null; // cuenta que se propone al apuntar un movimiento de esta categoría
}

export interface Recurring {
  id: string;
  name: string;
  amount: number; // + ingreso, - gasto
  categoryId: string | null;
  accountId: string | null;
  dayOfMonth: number;
  active: boolean;
  transferAccountId?: string | null; // fijo de traspaso: cuenta de destino
  holdingId?: string | null; // plan de inversión: posición que se compra
}


export interface Snapshot {
  date: string;
  netWorth: number;
  byAccount: Record<string, number>;
  byKind: Partial<Record<HoldingKind, number>>;
}

/** `coingeckoId` es la clave de precio: id de CoinGecko o `yf:<símbolo>` (ver priceKey). */
export interface Price { coingeckoId: string; priceEur: number; change24h: number | null; updatedAt: string }

export interface Settings { bigExpenseThreshold: number; timezone: string; netWorthTarget: number | null }

export interface Alert {
  id: string;
  month: string;
  kind: string;
  categoryId: string | null;
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

export interface AiSummary { id: string; month: string; content: string; createdAt: string }

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface AppData {
  userId: string;
  today: string;
  settings: Settings;
  accounts: Account[];
  rates: AccountRate[]; // ascendente por fecha
  holdings: Holding[];
  events: HoldingEvent[];
  transactions: Transaction[]; // gastos e ingresos de los últimos 13 meses, del más reciente al más antiguo
  transfers: Transfer[]; // traspasos de los últimos 13 meses, mismo orden
  categories: Category[];
  recurring: Recurring[];
  prices: Record<string, Price>;
  snapshots: Snapshot[]; // orden ascendente por fecha
  alerts: Alert[]; // del mes actual
}
