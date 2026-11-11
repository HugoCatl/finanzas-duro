import type {
  Account, AccountRate, AiSummary, Alert, Category, Holding, HoldingEvent, Price, Recurring, Settings, Snapshot, Transaction, Transfer,
  HoldingKind, EventType, TransactionSource, CategoryKind,
} from '@/lib/types';

export type Row = Record<string, unknown>;

const str = (v: unknown) => String(v);
const num = (v: unknown) => Number(v);
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const strOrNull = (v: unknown) => (v === null || v === undefined ? null : String(v));
const month = (v: unknown) => String(v).slice(0, 7);

export const toAccount = (r: Row): Account => ({
  id: str(r.id), name: str(r.name), institution: str(r.institution), color: str(r.color), sortOrder: num(r.sort_order),
});

export const toRate = (r: Row): AccountRate => ({
  id: str(r.id), accountId: str(r.account_id), rate: num(r.rate), fromDate: str(r.from_date),
});

export const toHolding = (r: Row): Holding => ({
  id: str(r.id), accountId: str(r.account_id), name: str(r.name), kind: r.kind as HoldingKind,
  apy: numOrNull(r.apy), coingeckoId: strOrNull(r.coingecko_id), isin: strOrNull(r.isin),
  priceSymbol: strOrNull(r.price_symbol), archived: Boolean(r.archived),
});

export const toEvent = (r: Row): HoldingEvent => ({
  id: str(r.id), holdingId: str(r.holding_id), date: str(r.date), type: r.type as EventType,
  amountEur: num(r.amount_eur), quantity: numOrNull(r.quantity), unitPriceEur: numOrNull(r.unit_price_eur),
  recurringId: strOrNull(r.recurring_id), createdAt: strOrNull(r.created_at) ?? undefined,
});

export const toTransaction = (r: Row): Transaction => ({
  id: str(r.id), date: str(r.date), amount: num(r.amount), merchant: strOrNull(r.merchant), note: strOrNull(r.note),
  categoryId: strOrNull(r.category_id), accountId: strOrNull(r.account_id), source: r.source as TransactionSource,
  recurringId: strOrNull(r.recurring_id), createdAt: strOrNull(r.created_at) ?? undefined,
});

export const isTransferRow = (r: Row) => r.transfer_account_id !== null && r.transfer_account_id !== undefined;

export const toTransfer = (r: Row): Transfer => ({
  id: str(r.id), date: str(r.date), amount: Math.abs(num(r.amount)), fromAccountId: str(r.account_id),
  toAccountId: str(r.transfer_account_id), note: strOrNull(r.note ?? r.merchant), recurringId: strOrNull(r.recurring_id),
  createdAt: strOrNull(r.created_at) ?? undefined,
});

export const toCategory = (r: Row): Category => ({
  id: str(r.id), name: str(r.name), icon: str(r.icon), kind: r.kind as CategoryKind, isFixed: Boolean(r.is_fixed),
  monthlyLimit: numOrNull(r.monthly_limit), sortOrder: num(r.sort_order), defaultAccountId: strOrNull(r.default_account_id),
});

export const toRecurring = (r: Row): Recurring => ({
  id: str(r.id), name: str(r.name), amount: num(r.amount), categoryId: strOrNull(r.category_id),
  accountId: strOrNull(r.account_id), dayOfMonth: num(r.day_of_month), active: Boolean(r.active),
  transferAccountId: strOrNull(r.transfer_account_id), holdingId: strOrNull(r.holding_id),
});

export const toSnapshot = (r: Row): Snapshot => ({
  date: str(r.date), netWorth: num(r.net_worth),
  byAccount: (r.by_account ?? {}) as Record<string, number>,
  byKind: (r.by_kind ?? {}) as Snapshot['byKind'],
});

export const toPrice = (r: Row): Price => ({
  coingeckoId: str(r.coingecko_id), priceEur: num(r.price_eur), change24h: numOrNull(r.change_24h), updatedAt: str(r.updated_at),
});

export const toSettings = (r: Row): Settings => ({
  bigExpenseThreshold: num(r.big_expense_threshold), timezone: str(r.timezone), netWorthTarget: numOrNull(r.net_worth_target),
});

export const toAlert = (r: Row): Alert => ({
  id: str(r.id), month: month(r.month), kind: str(r.kind), categoryId: strOrNull(r.category_id),
  title: str(r.title), body: str(r.body), sentAt: str(r.sent_at), readAt: strOrNull(r.read_at),
});

export const toAiSummary = (r: Row): AiSummary => ({
  id: str(r.id), month: month(r.month), content: str(r.content), createdAt: str(r.created_at),
});
