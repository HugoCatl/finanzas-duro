import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Parámetros de scrypt (fijos, no van en el formato): N=2^15, r=8, p=1, keylen=32. */
export const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 32, maxmem: 64 * 1024 * 1024 } as const;
export const PASSPHRASE_WORDS = 10;

/** Recorta, minúsculas, Unicode NFC y espacios internos colapsados. Mantener igual que scripts/hash-passphrase.mjs. */
export function normalisePassphrase(input: string): string {
  return input.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFC');
}

export function hasExactWordCount(normalised: string): boolean {
  return normalised !== '' && normalised.split(' ').length === PASSPHRASE_WORDS;
}

function derive(normalised: string, salt: Buffer): Buffer {
  const { keylen, ...opts } = SCRYPT;
  return scryptSync(normalised, salt, keylen, opts);
}

/** Devuelve `scrypt.<saltB64url>.<hashB64url>` (sin dólar: Next lo expandiría al leer .env) para una frase ya normalizada. */
export function hashPassphrase(normalised: string, salt: Buffer = randomBytes(16)): string {
  return `scrypt.${salt.toString('base64url')}.${derive(normalised, salt).toString('base64url')}`;
}

export function isValidHashFormat(stored: string): boolean {
  return /^scrypt\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(stored);
}

/** Compara la frase (se normaliza aquí) con el hash almacenado en tiempo constante. */
export function checkPassphrase(phrase: string, stored: string): boolean {
  if (!isValidHashFormat(stored)) return false;
  const parts = stored.split('.');
  const salt = Buffer.from(parts[1], 'base64url');
  const expected = Buffer.from(parts[2], 'base64url');
  if (salt.length === 0 || expected.length !== SCRYPT.keylen) return false;
  const normalised = normalisePassphrase(phrase);
  if (!hasExactWordCount(normalised)) return false;
  return timingSafeEqual(derive(normalised, salt), expected);
}
