'use server';

import { requireUser } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { toHolding, toPrice } from '@/lib/data/mappers';
import { isStale } from '@/lib/prices/coingecko';
import { activePriceKeys } from '@/lib/prices/keys';
import { refreshPrices } from '@/lib/prices/refresh';

/**
 * Trae precios nuevos de tus posiciones si los guardados tienen más de 15 minutos. Más a menudo no
 * hace nada, así que llamarla desde el refresco automático no dispara peticiones a los proveedores.
 */
export async function refreshMyPrices(): Promise<{ updated: boolean }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('holdings').select('*').eq('archived', false);
  if (error) return { updated: false };
  const keys = activePriceKeys((data ?? []).map(toHolding));
  if (keys.length === 0) return { updated: false };
  const { data: rows } = await supabase.from('price_cache').select('*').in('coingecko_id', keys);
  const prices = new Map((rows ?? []).map(toPrice).map((p) => [p.coingeckoId, p]));
  const stale = keys.filter((k) => isStale(prices.get(k)));
  if (stale.length === 0) return { updated: false };
  try {
    await refreshPrices(createAdminClient(), stale);
    return { updated: true };
  } catch (e) {
    console.error('No se pudieron refrescar los precios', e);
    return { updated: false };
  }
}
