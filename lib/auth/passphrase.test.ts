import { describe, expect, it } from 'vitest';
import { checkPassphrase, hashPassphrase, hasExactWordCount, isValidHashFormat, normalisePassphrase } from './passphrase';
import * as script from '../../scripts/hash-passphrase.mjs';

const PHRASE = 'uno dos tres cuatro cinco seis siete ocho nueve diez';

describe('passphrase', () => {
  it('normaliza espacios, mayúsculas y Unicode', () => {
    expect(normalisePassphrase('  UNO   dos\ttres\n')).toBe('uno dos tres');
    expect(normalisePassphrase('café')).toBe('café');
  });
  it('exige exactamente 10 palabras', () => {
    expect(hasExactWordCount(PHRASE)).toBe(true);
    expect(hasExactWordCount('uno dos')).toBe(false);
    expect(hasExactWordCount(`${PHRASE} once`)).toBe(false);
    expect(hasExactWordCount('')).toBe(false);
  });
  it('verifica la frase correcta con cualquier formato de espacios y mayúsculas', () => {
    const stored = hashPassphrase(PHRASE);
    expect(stored).toMatch(/^scrypt\.[\w-]+\.[\w-]+$/);
    expect(stored).not.toContain('$');
    expect(isValidHashFormat(stored)).toBe(true);
    expect(isValidHashFormat('scrypt$abc$def')).toBe(false);
    expect(checkPassphrase(`  ${PHRASE.toUpperCase().replace(/ /g, '  ')} \n`, stored)).toBe(true);
  });
  it('rechaza frases incorrectas, de otra longitud y hashes mal formados', () => {
    const stored = hashPassphrase(PHRASE);
    expect(checkPassphrase(PHRASE.replace('diez', 'once'), stored)).toBe(false);
    expect(checkPassphrase('uno dos tres', stored)).toBe(false);
    expect(checkPassphrase(PHRASE, 'basura')).toBe(false);
    expect(checkPassphrase(PHRASE, 'scrypt..')).toBe(false);
  });
  it('el script y la librería coinciden en normalización y hash', () => {
    for (const s of ['  UNO   dos\ttres\n', 'café Ñandú', '', 'a']) {
      expect(script.normalisePassphrase(s)).toBe(normalisePassphrase(s));
    }
    expect(checkPassphrase(PHRASE, script.hashPassphrase(script.normalisePassphrase(PHRASE)))).toBe(true);
    const salt = Buffer.alloc(16, 7);
    expect(script.hashPassphrase(PHRASE, salt)).toBe(hashPassphrase(PHRASE, salt));
  });
});
