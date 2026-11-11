// Uso: node scripts/hash-passphrase.mjs   (escribe la frase por stdin; no se guarda en el historial)
// Imprime la línea LOGIN_PASSPHRASE_HASH=... para .env.local y Vercel.
import { randomBytes, scryptSync } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Mantener sincronizado con lib/auth/passphrase.ts (hay un test que comprueba que coinciden).
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 32, maxmem: 64 * 1024 * 1024 };
const WORDS = 10;

export function normalisePassphrase(input) {
  return input.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFC');
}

export function hashPassphrase(normalised, salt = randomBytes(16)) {
  const { keylen, ...opts } = SCRYPT;
  return `scrypt.${salt.toString('base64url')}.${scryptSync(normalised, salt, keylen, opts).toString('base64url')}`;
}

async function readStdin() {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  if (process.stdin.isTTY) console.error(`Escribe la frase de ${WORDS} palabras, pulsa Intro y luego Ctrl+D (Ctrl+Z e Intro en Windows):`);
  const phrase = normalisePassphrase(await readStdin());
  const count = phrase === '' ? 0 : phrase.split(' ').length;
  if (count !== WORDS) {
    console.error(`La frase debe tener exactamente ${WORDS} palabras (tiene ${count}).`);
    process.exit(1);
  }
  console.log(`LOGIN_PASSPHRASE_HASH=${hashPassphrase(phrase)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
