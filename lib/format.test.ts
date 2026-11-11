import { describe, it, expect } from 'vitest';
import { eur, eurAxis, niceTicks, pct, parseAmount, monthLabel, dayLabel } from './format';

const n = (s: string) => s.replace(/\u00A0|\u202F/g, ' ');

describe('eur', () => {
  it('formatea en euros es-ES', () => {
    expect(n(eur(12345.6))).toBe('12.345,60 €');
  });
  it('añade + si signed y positivo', () => {
    expect(n(eur(10, { signed: true }))).toBe('+10,00 €');
    expect(n(eur(-10, { signed: true }))).toBe('-10,00 €');
  });
});

describe('eurAxis', () => {
  it('abrevia miles y millones para los ejes', () => {
    expect(eurAxis(0)).toBe('0 €');
    expect(eurAxis(850)).toBe('850 €');
    expect(eurAxis(12000)).toBe('12 k€');
    expect(eurAxis(12500)).toBe('12,5 k€');
    expect(eurAxis(1_250_000)).toBe('1,25 M€');
    expect(eurAxis(-3000)).toBe('-3 k€');
  });
});

describe('niceTicks', () => {
  it('da pasos redondos que cubren el rango, con el último por encima del máximo', () => {
    expect(niceTicks(0, 950, 4)).toEqual([0, 250, 500, 750, 1000]);
    expect(niceTicks(41_200, 47_900, 4)).toEqual([40_000, 42_000, 44_000, 46_000, 48_000]);
    expect(niceTicks(0, 0, 4)).toEqual([0, 1]);
  });
});

describe('pct', () => {
  it('formatea porcentaje con 1 decimal', () => {
    expect(n(pct(0.253))).toBe('25,3 %');
  });
  it('null → guion', () => {
    expect(pct(null)).toBe('—');
  });
});

describe('parseAmount', () => {
  it.each([
    ['12,50', 12.5],
    ['1.234,5', 1234.5],
    ['7', 7],
    ['12.5', 12.5],
    [' 3,456 € ', 3.46],
  ])('%s → %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
  it.each(['', 'abc', '-3', '0'])('%s → null', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe('monthLabel', () => {
  it('nombre del mes en español, con mayúscula inicial', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026');
    expect(monthLabel('2026-10', 'short')).toBe('oct');
  });
});

describe('dayLabel', () => {
  it('Hoy / Ayer / fecha larga', () => {
    expect(dayLabel('2026-10-29', '2026-10-29')).toBe('Hoy');
    expect(dayLabel('2026-10-28', '2026-10-29')).toBe('Ayer');
    expect(dayLabel('2026-10-20', '2026-10-29')).toBe('Martes, 20 de octubre');
  });
});

describe('parseAmount allowZero', () => {
  it('rechaza 0 por defecto y lo acepta con allowZero', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('0', { allowZero: true })).toBe(0);
    expect(parseAmount('0,00', { allowZero: true })).toBe(0);
  });
  it('sigue rechazando negativos y texto vacío o ilegible', () => {
    expect(parseAmount('-1', { allowZero: true })).toBeNull();
    expect(parseAmount('', { allowZero: true })).toBeNull();
    expect(parseAmount('abc', { allowZero: true })).toBeNull();
  });
});
