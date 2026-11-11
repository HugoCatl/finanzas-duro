import 'server-only';
import { generateText, Output } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '@/lib/types';
import { AI_MODEL } from '@/lib/ai/model';
import { buildSummaryInput } from '@/lib/ai/summary';
import { CHECKUP_SCHEMA, CHECKUP_SYSTEM, buildCheckup, checkupPrompt, cleanCheckupText, fallbackCheckupText, parseCheckup, type Checkup } from '@/lib/ai/checkup';
import { checkupScore } from '@/lib/finance/checkup';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { describeProfile, EMPTY_PROFILE, parseProfile } from '@/lib/profile';

/** Chequeos guardados del usuario, del más reciente al más antiguo. Los resúmenes de texto antiguos no cuentan. */
export async function listCheckups(db: SupabaseClient, userId: string, limit = 12): Promise<(Checkup & { createdAt: string })[]> {
  const { data, error } = await db.from('ai_summaries').select('content, created_at').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => {
    const c = parseCheckup(String(r.content));
    return c ? [{ ...c, createdAt: String(r.created_at) }] : [];
  });
}

/**
 * Calcula la nota del mes, le pide el texto a Duro (si falla, sale el de las reglas) y lo guarda en lugar
 * del que hubiera de ese mes. null si el mes no se puede puntuar.
 */
export async function createCheckup(db: SupabaseClient, data: AppData, month: string): Promise<Checkup | null> {
  const pf = appPortfolio(data);
  const score = checkupScore(data, pf, month);
  if (score.score === null) return null;
  const scored = { ...score, score: score.score };

  const { data: settings } = await db.from('settings').select('profile').eq('user_id', data.userId).maybeSingle();
  const parsed = parseProfile(settings?.profile ?? null);
  const profile = describeProfile(typeof parsed === 'string' ? EMPTY_PROFILE : parsed);

  let text = null;
  try {
    const { output } = await generateText({
      model: AI_MODEL, system: CHECKUP_SYSTEM, output: Output.object({ schema: CHECKUP_SCHEMA }),
      prompt: checkupPrompt(score, buildSummaryInput(data, month, pf), profile), maxOutputTokens: 500,
    });
    text = cleanCheckupText(output);
  } catch (e) {
    console.error('Duro no pudo escribir el chequeo', e);
  }
  const checkup = buildCheckup(scored, text ?? fallbackCheckupText(score), text !== null);

  const { error: delError } = await db.from('ai_summaries').delete().eq('user_id', data.userId).eq('month', `${month}-01`);
  if (delError) throw new Error(delError.message);
  const { error } = await db.from('ai_summaries').insert({ user_id: data.userId, month: `${month}-01`, content: JSON.stringify(checkup) });
  if (error) throw new Error(error.message);
  return checkup;
}
