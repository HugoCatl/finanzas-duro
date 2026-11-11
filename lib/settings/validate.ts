const MAX = 10_000_000_000;

export function validateThreshold(n: unknown): string | null {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= MAX ? null : 'Importe no válido';
}

const nonEmpty = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

export function validatePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): string | null {
  const ok =
    !!sub &&
    nonEmpty(sub.endpoint, 2048) && sub.endpoint.startsWith('https://') &&
    !!sub.keys && nonEmpty(sub.keys.p256dh, 512) && nonEmpty(sub.keys.auth, 512);
  return ok ? null : 'Suscripción no válida';
}

export function validatePushEndpoint(endpoint: unknown): string | null {
  return nonEmpty(endpoint, 2048) && (endpoint as string).startsWith('https://') ? null : 'Suscripción no válida';
}
