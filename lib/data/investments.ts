import 'server-only';
import { cache } from 'react';
import type { Holding } from '@/lib/types';
import { daysBetween } from '@/lib/dates';
import type { Closes } from '@/lib/finance/position-history';
import { toProfile, type HoldingProfile } from '@/lib/ai/holding-profile';
import { coingeckoCloses, spainHicp, WORLD_SYMBOL, yahooCloses } from '@/lib/prices/history';
import { requireUser } from '@/lib/supabase/user';

/** Fichas de Duro del usuario por posición. Sin la tabla (migración sin aplicar) no hay fichas. */
export const getHoldingProfiles = cache(async (): Promise<Record<string, HoldingProfile>> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('holding_profiles').select('*');
  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') console.error('No se pudieron leer las fichas', error);
    return {};
  }
  return Object.fromEntries((data ?? []).map((row) => [String(row.holding_id), toProfile(row)]));
});

/** Historial de cierres de una posición con precio automático; null si no tiene o falla. */
export async function closesFor(holding: Holding, firstDate: string | null, today: string): Promise<Closes | null> {
  if (holding.kind === 'crypto' && holding.coingeckoId) {
    return coingeckoCloses(holding.coingeckoId, !!firstDate && daysBetween(firstDate, today) > 360);
  }
  if ((holding.kind === 'fund' || holding.kind === 'stock') && holding.priceSymbol) return yahooCloses(holding.priceSymbol);
  return null;
}

/** Lo que hace falta para las comparaciones: el índice mundial y la inflación. */
export async function referenceData() {
  const [world, hicp] = await Promise.all([yahooCloses(WORLD_SYMBOL), spainHicp()]);
  return { world, hicp };
}
