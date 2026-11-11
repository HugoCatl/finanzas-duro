import { isAuthorizedCron } from '@/lib/cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { listUserIds } from '@/lib/data/users';
import { loadUserData } from '@/lib/data/load';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { allActivePriceKeys, refreshPrices } from '@/lib/prices/refresh';
import { runAlertsForUser } from '@/lib/alerts/run';
import { bigMovePush, bigMoves } from '@/lib/rules/big-moves';
import { sendPushToUser } from '@/lib/push/send';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response('Unauthorized', { status: 401 });
  const admin = createAdminClient();
  let processed = 0;
  let failed = 0;
  let userIds: string[];
  try {
    userIds = await listUserIds(admin);
  } catch (e) {
    console.error('cron/nightly: no se pudo listar usuarios', e);
    return Response.json({ error: 'No se pudo listar usuarios' }, { status: 500 });
  }

  // Una sola ronda de precios para todos; asi loadUserData no refresca por usuario.
  try {
    await refreshPrices(admin, await allActivePriceKeys(admin));
  } catch (e) {
    console.error('cron/nightly: no se pudieron refrescar los precios', e); // se usan los ultimos guardados
  }

  for (const userId of userIds) {
    try {
      const data = await loadUserData(admin, userId);
      const pf = appPortfolio(data);
      // Idempotente: snapshots tiene unique (user_id, date) y el upsert actualiza la fila de hoy.
      const { error } = await admin.from('snapshots').upsert(
        { user_id: userId, date: data.today, net_worth: pf.total, by_account: pf.byAccount, by_kind: pf.byKind },
        { onConflict: 'user_id,date' },
      );
      if (error) throw new Error(error.message);
      const created = await runAlertsForUser(admin, userId);
      // Sin guardar en la base: este cron corre una vez al día, así que hay como mucho un aviso por inversión y día.
      for (const m of bigMoves(pf.items, data.prices, data.today)) await sendPushToUser(admin, userId, bigMovePush(m));
      processed++;
      console.log(`cron/nightly: ${userId} snapshot guardado, ${created.length} avisos`);
    } catch (e) {
      console.error(`cron/nightly: fallo para ${userId}`, e);
      failed++;
    }
  }
  return Response.json({ processed, failed });
}
