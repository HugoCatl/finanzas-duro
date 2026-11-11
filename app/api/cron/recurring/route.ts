import { isAuthorizedCron } from '@/lib/cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { listUserIds } from '@/lib/data/users';
import { loadUserData } from '@/lib/data/load';
import { dueRecurring, effectiveDate, planBuy, recurringKind } from '@/lib/finance/recurring';
import { priceKey } from '@/lib/prices/keys';
import { monthOf } from '@/lib/dates';
import { runAlertsForUser } from '@/lib/alerts/run';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { interestDue } from '@/lib/finance/interest';
import { sendPushToUser } from '@/lib/push/send';
import { eur, monthLabel } from '@/lib/format';
import { addMonths, dayOfMonth } from '@/lib/dates';
import { createCheckup, listCheckups } from '@/lib/checkup/run';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response('Unauthorized', { status: 401 });
  const admin = createAdminClient();
  let processed = 0;
  let created = 0;
  let failed = 0;
  let userIds: string[];
  try {
    userIds = await listUserIds(admin);
  } catch (e) {
    console.error('cron/recurring: no se pudo listar usuarios', e);
    return Response.json({ error: 'No se pudo listar usuarios' }, { status: 500 });
  }

  for (const userId of userIds) {
    try {
      const data = await loadUserData(admin, userId);
      // Idempotente: dueRecurring descarta los recurrentes que ya tienen un movimiento este mes
      // (leídos para este usuario), así que una segunda ejecución el mismo día devuelve 0.
      // Solo crea dentro de una ventana corta tras el día efectivo y lo fecha ese día.
      const due = dueRecurring(data.recurring, [...data.transactions, ...data.transfers, ...data.events], data.today)
        .sort((a, b) => Number(recurringKind(a) === 'plan') - Number(recurringKind(b) === 'plan')); // traspasos antes que compras
      // Efectivo de cada cuenta que tiene efectivo apuntado, al día, más lo que se mueva en esta ejecución.
      const pf = appPortfolio(data);
      const cash = new Map<string, number>();
      for (const i of pf.items) if (i.holding.kind === 'cash') cash.set(i.holding.accountId, (cash.get(i.holding.accountId) ?? 0) + i.value.value);
      const move = (accountId: string | null | undefined, amount: number) => {
        if (accountId && cash.has(accountId)) cash.set(accountId, cash.get(accountId)! + amount);
      };
      let n = 0;
      for (const r of due) {
        const date = effectiveDate(r, monthOf(data.today));
        const kind = recurringKind(r);
        let error: { code?: string; message: string } | null;
        if (kind === 'plan') {
          // Plan de inversión: compra al último precio. Sin precio se reintenta en la ventana de días siguiente.
          const holding = data.holdings.find((h) => h.id === r.holdingId && !h.archived);
          const key = holding ? priceKey(holding) : null;
          const buy = planBuy(-r.amount, key ? data.prices[key]?.priceEur : undefined);
          if (!holding || !buy) continue;
          const available = cash.get(holding.accountId);
          if (available !== undefined && available < -r.amount) {
            await warnNoCash(admin, userId, r.id, r.name, -r.amount, available, monthOf(data.today));
            continue;
          }
          ({ error } = await admin.from('holding_events').insert({
            user_id: userId, holding_id: holding.id, date, type: 'buy', amount_eur: -r.amount,
            quantity: buy.quantity, unit_price_eur: buy.unitPriceEur, recurring_id: r.id,
          }));
        } else {
          ({ error } = await admin.from('transactions').insert({
            user_id: userId, date, amount: r.amount, merchant: r.name, account_id: r.accountId, source: 'recurring', recurring_id: r.id,
            category_id: kind === 'transfer' ? null : r.categoryId,
            transfer_account_id: kind === 'transfer' ? r.transferAccountId : null,
          }));
        }
        if (error) {
          if (error.code === '23505') continue; // otra ejecución ya lo apuntó (índice único por recurrente y fecha)
          throw new Error(error.message);
        }
        if (kind === 'plan') move(data.holdings.find((h) => h.id === r.holdingId)?.accountId, r.amount);
        else {
          move(r.accountId, r.amount);
          if (kind === 'transfer') move(r.transferAccountId, -r.amount);
        }
        n++;
      }

      // Intereses de las cuentas remuneradas: el día 1 se apunta lo generado el mes anterior.
      const interest = interestDue(data);
      if (interest.length) {
        const category = data.categories.find((c) => c.kind === 'income' && /inter[eé]s/i.test(c.name))
          ?? data.categories.find((c) => c.kind === 'income' && /otros/i.test(c.name));
        for (const i of interest) {
          const name = data.accounts.find((a) => a.id === i.accountId)?.name ?? 'cuenta';
          const { error } = await admin.from('transactions').insert({
            user_id: userId, date: i.date, amount: i.amount, merchant: `Intereses ${name}`, account_id: i.accountId,
            source: 'interest', category_id: category?.id ?? null,
          });
          if (error) {
            if (error.code === '23505') continue; // ya apuntados este mes
            throw new Error(error.message);
          }
          n++;
        }
      }
      // Chequeo de Duro del mes que acaba de cerrar: los tres primeros días, por si un día falla.
      if (dayOfMonth(data.today) <= 3) {
        try {
          const closed = addMonths(monthOf(data.today), -1);
          const done = (await listCheckups(admin, userId)).some((k) => k.month === closed && !k.partial);
          const checkup = done ? null : await createCheckup(admin, data, closed);
          if (checkup) {
            await sendPushToUser(admin, userId, {
              title: `Tu chequeo de ${monthLabel(closed).toLowerCase().replace(/ \d{4}$/, '')}: ${String(checkup.score).replace('.', ',')}/10`,
              body: checkup.summary.slice(0, 160), url: '/',
            });
          }
        } catch (e) {
          console.error(`cron/recurring: chequeo fallido para ${userId}`, e);
        }
      }
      processed++;
      created += n;
      if (n > 0) {
        try {
          await runAlertsForUser(admin, userId);
        } catch (e) {
          // Los movimientos ya están guardados; el aviso se reintenta en el cron nocturno.
          console.error(`cron/recurring: avisos fallidos para ${userId}`, e);
        }
      }
    } catch (e) {
      console.error(`cron/recurring: fallo para ${userId}`, e);
      failed++;
    }
  }
  return Response.json({ processed, created, failed });
}

/** Plan sin saldo: no se compra (no deja la cuenta en negativo) y se avisa una vez al mes. */
async function warnNoCash(
  admin: ReturnType<typeof createAdminClient>, userId: string, recurringId: string, name: string, amount: number, available: number, month: string,
) {
  const title = `No hay saldo para «${name}»`;
  const body = `Necesita ${eur(amount)} y en la cuenta hay ${eur(Math.max(0, available))}. No se ha comprado: si pasas el dinero en los próximos 2 días se compra sola; si no, apúntala a mano.`;
  const { error } = await admin.from('alerts').insert({
    user_id: userId, month: `${month}-01`, kind: 'plan_no_cash', category_id: null, threshold: null, ref: recurringId, title, body,
  });
  if (error) {
    if (error.code === '23505') return; // ya avisado este mes
    throw new Error(error.message);
  }
  await sendPushToUser(admin, userId, { title, body, url: '/automatico' });
}
