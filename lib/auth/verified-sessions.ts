import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { SECOND_FACTOR_TTL_SECONDS } from './second-factor';

/** Marca la sesión como verificada (la RLS de las tablas de usuario lo exige). Devuelve false si falla. */
export async function markSessionVerified(sessionId: string, userId: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + SECOND_FACTOR_TTL_SECONDS * 1000).toISOString();
  const { error } = await createAdminClient()
    .from('verified_sessions')
    .upsert({ session_id: sessionId, user_id: userId, expires_at: expiresAt }, { onConflict: 'session_id' });
  if (error) console.error('Error guardando la sesión verificada', error);
  return !error;
}

/** Borra la fila de la sesión (best-effort). */
export async function revokeSession(sessionId: string): Promise<void> {
  const { error } = await createAdminClient().from('verified_sessions').delete().eq('session_id', sessionId);
  if (error) console.error('Error revocando la sesión verificada', error);
}
