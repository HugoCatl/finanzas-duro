'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { priceKey } from '@/lib/prices/keys';
import { refreshPrices } from '@/lib/prices/refresh';
import { validateEvent, validateNewHolding } from '@/lib/holdings/validate';
import type { ActionResult, EventType, HoldingKind } from '@/lib/types';

export interface NewHoldingInput {
  accountId: string;
  name: string;
  kind: HoldingKind;
  apyPct: number | null; // 2.25 = 2,25 %
  coingeckoId: string | null;
  isin: string | null;
  priceSymbol: string | null; // símbolo de Yahoo (fondo o acción)
  date: string;
  amountEur: number; // importe inicial (aportación o compra)
  quantity: number | null; // cripto, acción y fondo con símbolo
}

export interface HoldingEventInput {
  holdingId: string;
  type: EventType;
  date: string;
  amountEur: number;
  quantity: number | null;
}

const HOLDING_NOT_FOUND = 'No se encontró la posición';

function eventRow(holdingId: string, type: EventType, date: string, amountEur: number, quantity: number | null) {
  return {
    holding_id: holdingId,
    type,
    date,
    amount_eur: amountEur,
    quantity,
    unit_price_eur: quantity && quantity > 0 ? amountEur / quantity : null,
  };
}

export async function createHolding(input: NewHoldingInput): Promise<ActionResult> {
  const invalid = validateNewHolding(input);
  if (invalid) return { ok: false, error: invalid };
  const { supabase } = await requireUser();

  // Las FK no pasan por RLS: comprobamos con el cliente del usuario que la cuenta es suya.
  const { data: account, error: accError } = await supabase.from('accounts').select('id').eq('id', input.accountId).maybeSingle();
  if (accError) return { ok: false, error: accError.message };
  if (!account) return { ok: false, error: 'Cuenta no válida' };

  const coingeckoId = input.kind === 'crypto' ? input.coingeckoId!.trim().toLowerCase() : null;
  const listed = input.kind === 'fund' || input.kind === 'stock';
  const priceSymbol = listed ? input.priceSymbol?.trim().toUpperCase() || null : null;
  // Con precio automático la posición se lleva por participaciones (compras), como la cripto.
  const byUnits = input.kind === 'crypto' || input.kind === 'stock' || priceSymbol !== null;
  const { data, error } = await supabase.from('holdings').insert({
    account_id: input.accountId,
    name: input.name.trim(),
    kind: input.kind,
    apy: input.kind === 'savings' && input.apyPct !== null ? input.apyPct / 100 : null,
    coingecko_id: coingeckoId,
    isin: listed ? input.isin?.trim() || null : null,
    price_symbol: priceSymbol,
  }).select('id').single();
  if (error) return { ok: false, error: error.message };

  // Por participaciones el evento se crea siempre (aunque el importe sea 0) para no perder la cantidad.
  if (input.amountEur > 0 || byUnits) {
    const type: EventType = byUnits ? 'buy' : 'deposit';
    const { error: evError } = await supabase.from('holding_events')
      .insert(eventRow(data.id, type, input.date, input.amountEur, byUnits ? input.quantity : null));
    if (evError) {
      // Evita dejar una posición huérfana sin su importe inicial.
      const { error: rbError } = await supabase.from('holdings').delete().eq('id', data.id);
      if (rbError) console.error('No se pudo deshacer la posición huérfana', data.id, rbError.message);
      return { ok: false, error: evError.message };
    }
  }

  const key = priceKey({ kind: input.kind, coingeckoId, priceSymbol });
  if (key) {
    try {
      await refreshPrices(createAdminClient(), [key]);
    } catch (e) {
      console.error('No se pudo obtener el precio', e);
    }
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function addHoldingEvent(input: HoldingEventInput): Promise<ActionResult> {
  const { supabase } = await requireUser();
  // Comprobación de propiedad (las FK no pasan por RLS) y de coherencia tipo/posición.
  const { data: holding, error: hError } = await supabase.from('holdings')
    .select('id, kind, price_symbol, archived').eq('id', input.holdingId).maybeSingle();
  if (hError) return { ok: false, error: hError.message };
  if (!holding || holding.archived) return { ok: false, error: HOLDING_NOT_FOUND };
  const invalid = validateEvent(holding.kind as HoldingKind, holding.price_symbol, input);
  if (invalid) return { ok: false, error: invalid };

  const { error } = await supabase.from('holding_events')
    .insert(eventRow(input.holdingId, input.type, input.date, input.amountEur, input.type === 'buy' || input.type === 'sell' ? input.quantity : null));
  if (error) return { ok: false, error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function archiveHolding(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('holdings').update({ archived: true }).eq('id', id).select('id');
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: HOLDING_NOT_FOUND };
  revalidatePath('/', 'layout');
  return { ok: true };
}
