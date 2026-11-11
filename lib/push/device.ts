'use client';

import { deletePushSubscription } from '@/lib/actions/settings';

/**
 * Da de baja las notificaciones de ESTE dispositivo: borra la suscripción en el servidor y
 * después la cancela en el navegador. Si el servidor falla, devuelve el error y no cancela
 * (así sigue coherente y se puede reintentar). Sin suscripción local no hay nada que hacer.
 */
export async function disablePushOnThisDevice(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return { ok: true };
  const reg = await navigator.serviceWorker.getRegistration(); // `ready` no resuelve si el registro falló
  if (!reg) return { ok: true };
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };
  const r = await deletePushSubscription(sub.endpoint);
  if (!r.ok) return r;
  await sub.unsubscribe();
  return { ok: true };
}
