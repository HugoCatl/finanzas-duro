import { describe, expect, it } from 'vitest';
import {
  readFailures, SECOND_FACTOR_TTL_SECONDS, signFailures, signSecondFactor, verifySecondFactor,
} from './second-factor';

const SECRET = 'secreto-de-prueba';
const USER = '11111111-1111-4111-8111-111111111111';
const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_SESSION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NOW = 1_800_000_000;

describe('verifySecondFactor', () => {
  const good = signSecondFactor(USER, SESSION, SECRET, NOW);
  it('acepta una cookie válida', () => {
    expect(verifySecondFactor(good, USER, SESSION, SECRET, NOW + 10)).toBe(true);
  });
  it('rechaza un hmac manipulado', () => {
    expect(verifySecondFactor(`${good}x`, USER, SESSION, SECRET, NOW)).toBe(false);
    const [u, se, e] = good.split('.');
    expect(verifySecondFactor(`${u}.${se}.${e}.AAAA`, USER, SESSION, SECRET, NOW)).toBe(false);
  });
  it('rechaza una expiración alargada a mano', () => {
    const [u, se, e, h] = good.split('.');
    expect(verifySecondFactor(`${u}.${se}.${Number(e) + 1000}.${h}`, USER, SESSION, SECRET, NOW)).toBe(false);
  });
  it('rechaza otra sesion con la misma cookie', () => {
    expect(verifySecondFactor(good, USER, OTHER_SESSION, SECRET, NOW)).toBe(false);
  });
  it('rechaza otro usuario', () => {
    expect(verifySecondFactor(good, '22222222-2222-4222-8222-222222222222', SESSION, SECRET, NOW)).toBe(false);
  });
  it('rechaza cookies caducadas', () => {
    expect(verifySecondFactor(good, USER, SESSION, SECRET, NOW + SECOND_FACTOR_TTL_SECONDS)).toBe(false);
  });
  it('rechaza valores mal formados o ausentes', () => {
    for (const v of ['', 'a.b', 'a.b.c', 'a.b.c.d.e', `${USER}.${SESSION}.abc.xyz`, undefined, null]) {
      expect(verifySecondFactor(v, USER, SESSION, SECRET, NOW)).toBe(false);
    }
  });
  it('falla cerrado sin secreto o con otro secreto', () => {
    expect(verifySecondFactor(good, USER, SESSION, undefined, NOW)).toBe(false);
    expect(verifySecondFactor(good, USER, SESSION, '', NOW)).toBe(false);
    expect(verifySecondFactor(good, USER, SESSION, 'otro', NOW)).toBe(false);
  });
});

describe('contador de fallos', () => {
  it('lee el contador firmado', () => {
    expect(readFailures(signFailures(USER, 3, SECRET), USER, SECRET)).toBe(3);
  });
  it('devuelve 0 si está manipulado, es de otro usuario, falta o no hay secreto', () => {
    const v = signFailures(USER, 3, SECRET);
    expect(readFailures(v.replace(/\.3\./, '.0.'), USER, SECRET)).toBe(0);
    expect(readFailures(v, 'otro', SECRET)).toBe(0);
    expect(readFailures(undefined, USER, SECRET)).toBe(0);
    expect(readFailures(v, USER, undefined)).toBe(0);
  });
});
