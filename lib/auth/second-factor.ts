import { createHmac, timingSafeEqual } from 'node:crypto';

export const SECOND_FACTOR_COOKIE = 'fz_2fa';
export const FAILURES_COOKIE = 'fz_2fa_fail';
export const SECOND_FACTOR_TTL_SECONDS = 30 * 24 * 60 * 60;
export const MAX_FAILURES = 5;

function mac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function macMatches(secret: string, payload: string, given: string): boolean {
  const a = Buffer.from(mac(secret, payload));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Valor de la cookie fz_2fa, ligada a usuario y sesión: `<userId>.<sessionId>.<expiryEpochSeconds>.<hmac>`. */
export function signSecondFactor(userId: string, sessionId: string, secret: string, nowSeconds: number): string {
  const expiry = nowSeconds + SECOND_FACTOR_TTL_SECONDS;
  return `${userId}.${sessionId}.${expiry}.${mac(secret, `${userId}.${sessionId}.${expiry}`)}`;
}

/** Falla cerrado: sin secreto, valor ausente/mal formado/manipulado/caducado o de otro usuario → false. */
export function verifySecondFactor(
  value: string | undefined | null, userId: string, sessionId: string, secret: string | undefined, nowSeconds: number,
): boolean {
  if (!secret || !value || !userId || !sessionId) return false;
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  const [cookieUser, cookieSession, expiryRaw, given] = parts;
  if (cookieUser !== userId || cookieSession !== sessionId || !/^\d+$/.test(expiryRaw)) return false;
  if (!macMatches(secret, `${cookieUser}.${cookieSession}.${expiryRaw}`, given)) return false;
  return Number(expiryRaw) > nowSeconds;
}

/** Contador de fallos firmado: `<userId>.<count>.<hmac>`. */
export function signFailures(userId: string, count: number, secret: string): string {
  return `${userId}.${count}.${mac(secret, `fail.${userId}.${count}`)}`;
}

/** Fallos acumulados del usuario; 0 si la cookie falta, está manipulada o es de otro usuario. */
export function readFailures(value: string | undefined | null, userId: string, secret: string | undefined): number {
  if (!secret || !value) return 0;
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== userId || !/^\d{1,3}$/.test(parts[1])) return 0;
  return macMatches(secret, `fail.${userId}.${parts[1]}`, parts[2]) ? Number(parts[1]) : 0;
}

/** Atributos comunes de ambas cookies. */
export function authCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
