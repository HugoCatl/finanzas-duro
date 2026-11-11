'use server';

import { generateText } from 'ai';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { ADVISOR_MODEL } from '@/lib/ai/advisor';
import { PROFILE_SYSTEM, parseProfile, profilePrompt, toProfile, type HoldingProfile } from '@/lib/ai/holding-profile';
import { toHolding } from '@/lib/data/mappers';

/**
 * Devuelve la ficha de Duro de una inversión; si aún no existe, la escribe y la guarda. null si no se puede
 * (sin IA, sin la tabla o el modelo no responde bien): la pantalla enseña entonces la ficha general.
 */
export async function ensureHoldingProfile(holdingId: string): Promise<HoldingProfile | null> {
  const { supabase } = await requireUser();
  const existing = await supabase.from('holding_profiles').select('*').eq('holding_id', holdingId).maybeSingle();
  if (existing.error) {
    console.error('No se pudo leer la ficha', existing.error);
    return null;
  }
  if (existing.data) return toProfile(existing.data);

  const { data: row } = await supabase.from('holdings').select('*').eq('id', holdingId).maybeSingle();
  if (!row) return null;
  const holding = toHolding(row);
  if (holding.kind !== 'fund' && holding.kind !== 'stock' && holding.kind !== 'crypto') return null;

  let profile: HoldingProfile | null;
  try {
    const { text } = await generateText({ model: ADVISOR_MODEL, system: PROFILE_SYSTEM, prompt: profilePrompt(holding), maxOutputTokens: 500 });
    profile = parseProfile(text);
  } catch (e) {
    console.error('Duro no pudo escribir la ficha', e);
    return null;
  }
  if (!profile) return null;

  const { error } = await supabase.from('holding_profiles').upsert({
    holding_id: holdingId, summary: profile.summary, invests_in: profile.investsIn, risk: profile.risk, ter: profile.ter, indexed: profile.indexed,
  });
  if (error) console.error('No se pudo guardar la ficha', error);
  revalidatePath('/inversiones');
  return profile;
}
