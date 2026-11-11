import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateAlerts, type AlertCandidate } from '@/lib/rules/alerts';
import { loadUserData } from '@/lib/data/load';
import { monthOf } from '@/lib/dates';
import { sendPushToUser } from '@/lib/push/send';
import { monthlySummary } from '@/lib/rules/monthly-summary';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { netWorthChange } from '@/lib/finance/networth';

/** Evalúa las reglas, guarda los avisos nuevos (la restricción única evita repetidos) y envía push. */
export async function runAlertsForUser(db: SupabaseClient, userId: string, now: Date = new Date()): Promise<AlertCandidate[]> {
  const data = await loadUserData(db, userId, now);
  const candidates = evaluateAlerts({
    today: data.today, categories: data.categories, transactions: data.transactions, settings: data.settings,
  });
  const summary = monthlySummary({
    today: data.today, categories: data.categories, transactions: data.transactions,
    netWorthMonth: netWorthChange(data.snapshots, appPortfolio(data).total, data.today).month,
  });
  if (summary) candidates.push(summary);
  const month = `${monthOf(data.today)}-01`;
  const created: AlertCandidate[] = [];

  for (const c of candidates) {
    const { error } = await db.from('alerts').insert({
      user_id: userId, month, kind: c.kind, category_id: c.categoryId, threshold: c.threshold, ref: c.ref, title: c.title, body: c.body,
    });
    if (error) {
      if (error.code === '23505') continue; // ya avisado este mes
      throw new Error(error.message);
    }
    created.push(c);
    await sendPushToUser(db, userId, { title: c.title, body: c.body, url: c.kind === 'uncategorized' ? '/' : c.kind === 'monthly_summary' ? '/analisis' : '/presupuesto' });
  }
  return created;
}
