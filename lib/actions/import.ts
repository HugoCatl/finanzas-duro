'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { toCategory, toHolding } from '@/lib/data/mappers';
import { addDays } from '@/lib/dates';
import { IMPORT_SINCE, assetKey, coingeckoIdFor, holdingAssetKey, planImport } from '@/lib/import/plan';
import { parseTradeRepublic } from '@/lib/import/trade-republic';
import { learnedCategories } from '@/lib/transactions/learn';
import type { ActionResult } from '@/lib/types';

const MAX_CSV_CHARS = 2_000_000;

export type ImportResult = ActionResult & { added?: { transactions: number; trades: number; duplicates: number; skippedRecurring: number } };

/**
 * Importa el CSV de Trade Republic en la cuenta "Trade Republic". El texto se vuelve a analizar aquí
 * (no se confía en la vista previa) y cada fila lleva su id del extracto: reimportar no duplica.
 */
export async function importTradeRepublic(csv: string, ownCounterparties: string[]): Promise<ImportResult> {
  if (typeof csv !== 'string' || csv.length === 0 || csv.length > MAX_CSV_CHARS) return { ok: false, error: 'Fichero no válido' };
  if (!Array.isArray(ownCounterparties) || ownCounterparties.length > 200 || ownCounterparties.some((k) => typeof k !== 'string')) {
    return { ok: false, error: 'Datos no válidos' };
  }
  let parsed;
  try {
    parsed = parseTradeRepublic(csv, { since: IMPORT_SINCE, own: ownCounterparties });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo leer el fichero' };
  }

  const { supabase, user } = await requireUser();
  const { data: accounts, error: accError } = await supabase.from('accounts').select('id, institution, name');
  if (accError) return { ok: false, error: accError.message };
  const account = (accounts ?? []).find((a) => /trade\s*republic/i.test(`${a.institution} ${a.name}`));
  if (!account) return { ok: false, error: 'Crea antes una cuenta llamada Trade Republic' };

  const dates = [...parsed.transactions, ...parsed.trades].map((t) => t.date).sort();
  const [catRes, holdRes, recRes, planRes, learnRes] = await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('holdings').select('*').eq('account_id', account.id),
    dates.length
      ? supabase.from('transactions').select('date, amount').eq('source', 'recurring').is('transfer_account_id', null)
        .gte('date', addDays(dates[0], -3)).lte('date', addDays(dates.at(-1)!, 3))
      : Promise.resolve({ data: [], error: null }),
    supabase.from('holding_events').select('id, holding_id, date, amount_eur').not('recurring_id', 'is', null).is('import_ref', null),
    supabase.from('transactions').select('merchant, category_id, date, created_at').not('category_id', 'is', null).not('merchant', 'is', null),
  ]);
  const failed = catRes.error ?? holdRes.error ?? recRes.error ?? planRes.error ?? learnRes.error;
  if (failed) return { ok: false, error: failed.message };

  const holdings = (holdRes.data ?? []).map(toHolding);
  const keyOfHolding = new Map(holdings.map((h) => [h.id, holdingAssetKey(h)]));
  const plan = planImport(parsed, {
    planEvents: (planRes.data ?? []).filter((e) => keyOfHolding.get(String(e.holding_id))).map((e) => ({
      id: String(e.id), assetKey: keyOfHolding.get(String(e.holding_id))!, date: String(e.date), amountEur: Number(e.amount_eur),
    })),
    categories: (catRes.data ?? []).map(toCategory),
    holdings,
    recurringTxs: (recRes.data ?? []).map((r) => ({ date: String(r.date), amount: Number(r.amount) })),
    learned: learnedCategories((learnRes.data ?? []).map((r) => ({
      merchant: r.merchant as string, categoryId: r.category_id as string, date: String(r.date), createdAt: String(r.created_at),
    }))),
  });

  // Posiciones que faltan: cripto con su id de CoinGecko; acciones sin símbolo (se añade luego para el precio).
  const holdingByKey = new Map(holdings.filter((h) => !h.archived).map((h) => [holdingAssetKey(h), h.id]));
  for (const asset of plan.newAssets) {
    const { data, error } = await supabase.from('holdings').insert({
      account_id: account.id,
      name: asset.name,
      kind: asset.crypto ? 'crypto' : 'stock',
      coingecko_id: asset.crypto ? coingeckoIdFor(asset) : null,
      isin: asset.isin,
    }).select('id').single();
    if (error) return { ok: false, error: error.message };
    holdingByKey.set(assetKey(asset), data.id);
  }

  const txRows = plan.transactions.map((t) => ({
    user_id: user.id, date: t.date, amount: t.amount, merchant: t.merchant, category_id: t.categoryId,
    account_id: account.id, source: 'import', import_ref: t.ref,
  }));
  // Compras de un plan ya apuntadas: se corrigen con los datos reales del extracto.
  let replaced = 0;
  for (const t of plan.trades.filter((x) => x.replaceEventId)) {
    const { error } = await supabase.from('holding_events').update({
      date: t.date, amount_eur: t.amountEur, quantity: t.quantity, unit_price_eur: t.amountEur > 0 ? t.amountEur / t.quantity : null, import_ref: t.ref,
    }).eq('id', t.replaceEventId!);
    if (error && error.code !== '23505') return { ok: false, error: error.message }; // 23505: esa compra ya estaba importada
    if (!error) replaced++;
  }

  const evRows = plan.trades.filter((t) => !t.replaceEventId).map((t) => ({
    user_id: user.id, holding_id: holdingByKey.get(t.assetKey)!, date: t.date, type: t.type, amount_eur: t.amountEur,
    quantity: t.quantity, unit_price_eur: t.amountEur > 0 ? t.amountEur / t.quantity : null, import_ref: t.ref,
  }));

  const opts = { onConflict: 'user_id,import_ref', ignoreDuplicates: true };
  const [txIns, evIns] = await Promise.all([
    txRows.length ? supabase.from('transactions').upsert(txRows, opts).select('id') : Promise.resolve({ data: [], error: null }),
    evRows.length ? supabase.from('holding_events').upsert(evRows, opts).select('id') : Promise.resolve({ data: [], error: null }),
  ]);
  if (txIns.error ?? evIns.error) return { ok: false, error: (txIns.error ?? evIns.error)!.message };

  // Intereses estimados por la app en los meses en que el extracto trae los reales: se quitan para no contarlos dos veces.
  const interestDays = [...new Set(plan.transactions.filter((t) => t.merchant === 'Intereses Trade Republic').map((t) => `${t.date.slice(0, 7)}-01`))];
  if (interestDays.length) {
    const { error } = await supabase.from('transactions').delete().eq('source', 'interest').eq('account_id', account.id).in('date', interestDays);
    if (error) return { ok: false, error: error.message };
  }

  const transactions = txIns.data?.length ?? 0;
  const trades = (evIns.data?.length ?? 0) + replaced;
  revalidatePath('/', 'layout');
  return {
    ok: true,
    added: { transactions, trades, duplicates: txRows.length + evRows.length + replaced - transactions - trades, skippedRecurring: plan.skippedRecurring },
  };
}
