'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppData } from '@/lib/data/app-data';
import { toPrice } from '@/lib/data/mappers';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { r2 } from '@/lib/finance/holdings';
import { priceKey } from '@/lib/prices/keys';
import { refreshPrices } from '@/lib/prices/refresh';
import { FETCH_TIMEOUT_MS } from '@/lib/prices/coingecko';
import type { AssetOption } from '@/lib/onboarding/catalog';
import { isEurSymbol, openingDate, validateOnboarding, type OnboardingAsset, type OnboardingInput } from '@/lib/onboarding/validate';
import type { ActionResult } from '@/lib/types';

const assetKey = (a: Pick<OnboardingAsset, 'kind' | 'coingeckoId' | 'priceSymbol'>) =>
  priceKey({ kind: a.kind, coingeckoId: a.coingeckoId, priceSymbol: a.priceSymbol })!;

export type OnboardingResult = ActionResult & { skipped?: string[] };

/**
 * Guarda la configuración inicial: bancos con su efectivo, inversiones, nómina, suscripciones, límites y objetivo.
 * Las posiciones se apuntan a fin del mes anterior y el saldo de efectivo después, para que las compras iniciales
 * no resten efectivo ni cuenten como invertido este mes. Los bancos que ya existen se reutilizan.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const invalid = validateOnboarding(input);
  if (invalid) return { ok: false, error: invalid };
  const { supabase } = await requireUser();
  const data = await getAppData();
  const today = data.today;
  const opening = openingDate(today);
  const cashNow = appPortfolio(data).items.filter((i) => i.holding.kind === 'cash');

  // Precios antes de escribir nada: sin precio no se puede saber cuántas participaciones son.
  const keys = [...new Set(input.assets.map(assetKey))];
  const prices = new Map<string, number>();
  if (keys.length) {
    try {
      await refreshPrices(createAdminClient(), keys);
    } catch (e) {
      console.error('No se pudieron refrescar los precios', e);
    }
    const { data: rows, error } = await supabase.from('price_cache').select('*').in('coingecko_id', keys);
    if (error) return { ok: false, error: error.message };
    for (const p of (rows ?? []).map(toPrice)) prices.set(p.coingeckoId, p.priceEur);
    const missing = input.assets.find((a) => !(prices.get(assetKey(a))! > 0));
    if (missing) return { ok: false, error: `No hay precio para ${missing.name} ahora mismo. Prueba más tarde o quítalo.` };
  }

  // Bancos: reutiliza los que ya existen (por nombre) y crea el resto con su posición de efectivo.
  const accountId = new Map(data.accounts.map((a) => [a.name.trim().toLowerCase(), a.id]));
  const cashHolding = new Map<string, string>();
  for (const h of data.holdings) if (h.kind === 'cash' && !h.archived && !cashHolding.has(h.accountId)) cashHolding.set(h.accountId, h.id);
  let order = data.accounts.length;
  for (const b of input.banks) {
    const key = b.name.trim().toLowerCase();
    if (accountId.has(key)) continue;
    const { data: acc, error } = await supabase.from('accounts')
      .insert({ name: b.name.trim(), institution: b.name.trim(), color: b.color, sort_order: order++ }).select('id').single();
    if (error) return { ok: false, error: error.message };
    accountId.set(key, acc.id);
  }
  const idOf = (bank: string) => accountId.get(bank.trim().toLowerCase())!;
  for (const b of input.banks) {
    const acc = idOf(b.name);
    if (cashHolding.has(acc) || b.cash === null) continue;
    const { data: h, error } = await supabase.from('holdings').insert({ account_id: acc, name: `Efectivo ${b.name.trim()}`, kind: 'cash' }).select('id').single();
    if (error) return { ok: false, error: error.message };
    cashHolding.set(acc, h.id);
  }

  // Inversiones (si ya tenías ese activo en ese banco, no se duplica).
  const skipped: string[] = [];
  const touched = new Set<string>();
  for (const a of input.assets) {
    const acc = idOf(a.bank);
    const key = assetKey(a);
    if (data.holdings.some((h) => !h.archived && h.accountId === acc && priceKey(h) === key)) {
      skipped.push(a.name);
      continue;
    }
    const { data: h, error } = await supabase.from('holdings').insert({
      account_id: acc, name: a.name.trim(), kind: a.kind, coingecko_id: a.coingeckoId, price_symbol: a.priceSymbol,
    }).select('id').single();
    if (error) return { ok: false, error: error.message };
    const quantity = a.valueEur / prices.get(key)!;
    const invested = r2(a.investedEur ?? a.valueEur);
    const { error: evError } = await supabase.from('holding_events').insert({
      holding_id: h.id, type: 'buy', date: opening, amount_eur: invested, quantity, unit_price_eur: invested > 0 ? invested / quantity : null,
    });
    if (evError) return { ok: false, error: evError.message };
    touched.add(acc);
  }

  // Saldos de efectivo de hoy, apuntados después de las compras: lo que dijiste o lo que ya había.
  const anchors: { holding_id: string; type: 'balance_adjust'; date: string; amount_eur: number }[] = [];
  for (const b of input.banks) {
    const acc = idOf(b.name);
    const holding = cashHolding.get(acc);
    if (!holding) continue;
    const current = cashNow.find((i) => i.holding.id === holding)?.value.value;
    const amount = b.cash ?? (touched.has(acc) ? current : undefined);
    if (amount !== undefined) anchors.push({ holding_id: holding, type: 'balance_adjust', date: today, amount_eur: r2(amount) });
  }
  if (anchors.length) {
    const { error } = await supabase.from('holding_events').insert(anchors);
    if (error) return { ok: false, error: error.message };
  }

  // Nómina y suscripciones como fijos.
  const category = (name: string) => data.categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;
  const recurring = [
    ...(input.salary ? [{ name: 'Nómina', amount: r2(input.salary.amount), day_of_month: input.salary.day, category_id: category('Nómina'), account_id: idOf(input.salary.bank), active: true }] : []),
    ...input.subscriptions.map((s) => ({
      name: s.name.trim(), amount: -r2(s.amount), day_of_month: s.day, category_id: category('Suscripciones'), account_id: idOf(input.spendingBank!), active: true,
    })),
  ].filter((r) => !data.recurring.some((x) => x.name.toLowerCase() === r.name.toLowerCase()));
  if (recurring.length) {
    const { error } = await supabase.from('recurring').insert(recurring);
    if (error) return { ok: false, error: error.message };
  }

  for (const l of input.limits) {
    if (!data.categories.some((c) => c.id === l.categoryId)) continue;
    const { error } = await supabase.from('categories').update({ monthly_limit: l.limit > 0 ? r2(l.limit) : null }).eq('id', l.categoryId);
    if (error) return { ok: false, error: error.message };
  }
  if (input.target !== null) {
    const { error } = await supabase.from('settings').update({ net_worth_target: r2(input.target) }).eq('user_id', data.userId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { ok: true, skipped };
}

const YAHOO_KINDS: Record<string, 'fund' | 'stock'> = { EQUITY: 'stock', ETF: 'fund', MUTUALFUND: 'fund' };

/** Busca fondos, ETF y acciones que cotizan en euros (Yahoo) y criptomonedas (CoinGecko). */
export async function searchAssets(query: string): Promise<AssetOption[]> {
  const q = typeof query === 'string' ? query.trim() : '';
  if (q.length < 2 || q.length > 40) return [];
  await requireUser();
  const opts = { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }, cache: 'no-store' as const, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) };
  const yahooSearch = (text: string) => fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(text)}&quotesCount=20&newsCount=0`, opts)
    .then((r) => r.json() as Promise<{ quotes?: YahooQuote[] }>).then((j) => j.quotes ?? []);
  // Yahoo da pocos resultados y casi todos en dólares: "<texto> UCITS" saca las versiones europeas de los ETF.
  const isIsin = /^[A-Z]{2}[A-Z0-9]{9}\d$/i.test(q);
  const [plain, ucits, coins] = await Promise.allSettled([
    yahooSearch(q),
    isIsin ? Promise.resolve([]) : yahooSearch(`${q} ucits`),
    fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, opts).then((r) => r.json()),
  ]);
  const out: AssetOption[] = [];
  const seen = new Set<string>();
  for (const r of [plain, ucits].flatMap((x) => (x.status === 'fulfilled' ? x.value : []))) {
    const kind = YAHOO_KINDS[r.quoteType ?? ''];
    if (!kind || !r.symbol || seen.has(r.symbol) || !isEurSymbol(r.symbol) || !/^[A-Z0-9.^=-]{1,20}$/.test(r.symbol)) continue;
    seen.add(r.symbol);
    out.push({ name: r.longname ?? r.shortname ?? r.symbol, kind, coingeckoId: null, priceSymbol: r.symbol, hint: `${r.symbol}${r.exchDisp ? ` · ${r.exchDisp}` : ''}` });
  }
  if (coins.status === 'fulfilled') {
    // Solo criptomonedas con cierta capitalización: fuera tokens que imitan acciones o ETF.
    const list = (coins.value as { coins?: { id: string; name: string; symbol: string; market_cap_rank: number | null }[] }).coins ?? [];
    for (const c of list.filter((c) => c.market_cap_rank !== null && c.market_cap_rank <= 500).slice(0, 4)) {
      if (/^[a-z0-9-]{1,80}$/.test(c.id)) out.push({ name: c.name, kind: 'crypto', coingeckoId: c.id, priceSymbol: null, hint: c.symbol?.toUpperCase() });
    }
  }
  return out.slice(0, 12);
}

interface YahooQuote { symbol?: string; quoteType?: string; shortname?: string; longname?: string; exchDisp?: string }
