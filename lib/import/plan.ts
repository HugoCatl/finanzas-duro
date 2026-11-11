import { learnedCategory } from '@/lib/transactions/learn';
import type { Category, Holding } from '@/lib/types';
import { daysBetween } from '@/lib/dates';
import type { ImportAsset, ImportTrade, ImportTransaction, TradeRepublicImport } from './trade-republic';

/** Fecha de corte de la primera migración: solo se importa 2026 en adelante. */
export const IMPORT_SINCE = '2026-01-01';

const COINGECKO_IDS: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', XRP: 'ripple' };
export const coingeckoIdFor = (a: ImportAsset) => COINGECKO_IDS[a.symbol] ?? a.name.trim().toLowerCase();

/** Clave del valor dentro de la cuenta: cripto por id de CoinGecko, el resto por ISIN. */
export const assetKey = (a: ImportAsset) => (a.crypto ? `cg:${coingeckoIdFor(a)}` : `isin:${a.isin}`);

export function holdingAssetKey(h: Pick<Holding, 'kind' | 'coingeckoId' | 'isin'>): string | null {
  if (h.kind === 'crypto' && h.coingeckoId) return `cg:${h.coingeckoId}`;
  if (h.isin) return `isin:${h.isin}`;
  return null;
}

export interface ImportPlan {
  transactions: (ImportTransaction & { categoryId: string | null })[];
  /** `replaceEventId`: compra de un plan ya apuntada que esta compra real sustituye (cantidad e importe exactos). */
  trades: (ImportTrade & { assetKey: string; replaceEventId?: string })[];
  /** Valores que aún no tienen posición en la cuenta y hay que crear. */
  newAssets: ImportAsset[];
  /** Gastos con tarjeta que ya estaban apuntados por un fijo (mismo importe ±0,50 € y ±3 días). */
  skippedRecurring: number;
}

export function planImport(parsed: TradeRepublicImport, ctx: {
  categories: Pick<Category, 'id' | 'name'>[];
  holdings: Pick<Holding, 'kind' | 'coingeckoId' | 'isin' | 'archived'>[];
  recurringTxs: { date: string; amount: number }[];
  /** Compras creadas por planes de inversión y aún sin extracto, con la clave del valor de su posición. */
  planEvents?: { id: string; assetKey: string; date: string; amountEur: number }[];
  /** Categoría que usaste la última vez con cada comercio: manda sobre la que deduce el extracto. */
  learned?: Record<string, string>;
}): ImportPlan {
  const catByName = new Map(ctx.categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const used = [...ctx.recurringTxs];
  let skippedRecurring = 0;
  const transactions: ImportPlan['transactions'] = [];
  for (const t of parsed.transactions) {
    // Un fijo ya apuntado (p. ej. la suscripción) cuenta solo una vez; cada fijo absorbe un único cargo.
    const dup = t.amount < 0 ? used.findIndex((r) => Math.abs(r.amount - t.amount) <= 0.5 && Math.abs(daysBetween(r.date, t.date)) <= 3) : -1;
    if (dup >= 0) {
      used.splice(dup, 1);
      skippedRecurring++;
      continue;
    }
    const learned = t.amount < 0 && ctx.learned ? learnedCategory(ctx.learned, t.merchant) : null;
    transactions.push({ ...t, categoryId: learned ?? (t.category ? catByName.get(t.category.toLowerCase()) ?? null : null) });
  }

  const existing = new Set(ctx.holdings.filter((h) => !h.archived).map(holdingAssetKey).filter(Boolean));
  const newAssets = new Map<string, ImportAsset>();
  const planEvents = [...(ctx.planEvents ?? [])];
  const trades = parsed.trades.map((t) => {
    const key = assetKey(t.asset);
    if (!existing.has(key) && !newAssets.has(key)) newAssets.set(key, t.asset);
    const i = t.type === 'buy' ? planEvents.findIndex((e) =>
      e.assetKey === key && Math.abs(e.amountEur - t.amountEur) <= 1.5 && Math.abs(daysBetween(e.date, t.date)) <= 3) : -1;
    if (i < 0) return { ...t, assetKey: key };
    const [match] = planEvents.splice(i, 1);
    return { ...t, assetKey: key, replaceEventId: match.id };
  });

  return { transactions, trades, newAssets: [...newAssets.values()], skippedRecurring };
}
