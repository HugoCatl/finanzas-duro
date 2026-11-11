import type { SupabaseClient } from '@supabase/supabase-js';
import { verifySecondFactor } from './second-factor';
import { isDemo } from '@/lib/demo/mode';

/** Id de sesión de Supabase tomado de los claims verificados del JWT (nunca de una decodificación sin verificar). */
export async function getSessionId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.session_id;
  return typeof id === 'string' && id !== '' ? id : null;
}

/** true si la cookie fz_2fa es válida para este usuario y esta sesión de Supabase. */
export async function hasValidSecondFactor(
  supabase: SupabaseClient, userId: string, cookieValue: string | undefined,
): Promise<boolean> {
  if (isDemo()) return true; // modo demo en local: sin login
  const sessionId = await getSessionId(supabase);
  if (!sessionId) return false;
  return verifySecondFactor(cookieValue, userId, sessionId, process.env.LOGIN_2FA_SECRET, Math.floor(Date.now() / 1000));
}
