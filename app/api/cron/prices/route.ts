import { isAuthorizedCron } from '@/lib/cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { allActivePriceKeys, refreshPrices } from '@/lib/prices/refresh';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response('Unauthorized', { status: 401 });
  const admin = createAdminClient();
  let keys: string[];
  try {
    keys = await allActivePriceKeys(admin);
  } catch (e) {
    console.error('cron/prices: no se pudieron leer las posiciones', e);
    return Response.json({ error: 'No se pudieron leer las posiciones' }, { status: 500 });
  }
  try {
    await refreshPrices(admin, keys);
  } catch (e) {
    console.error('cron/prices: fallo al refrescar precios', e);
    return Response.json({ error: 'No se pudieron refrescar los precios' }, { status: 502 });
  }
  return Response.json({ updated: keys.length });
}
