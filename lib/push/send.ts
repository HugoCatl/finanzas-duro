import 'server-only';
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload { title: string; body: string; url?: string }

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** Envía a todos los dispositivos del usuario. Borra las suscripciones caducadas. Devuelve cuántas se enviaron. */
export async function sendPushToUser(db: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  const { data, error } = await db.from('push_subscriptions').select('id, endpoint, keys').eq('user_id', userId);
  if (error) throw new Error(error.message);
  let sent = 0;
  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload));
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
        else console.error('Error enviando push', err);
      }
    }),
  );
  return sent;
}
