import { describe, it, expect } from 'vitest';
import { validateCategory, validateLimit, validateRecurring } from './validate';

const rec = { name: 'Netflix', amount: 12.99, kind: 'expense' as const, dayOfMonth: 1 };

describe('validateLimit', () => {
  it('acepta null, 0 y positivos', () => {
    expect(validateLimit(null)).toBeNull();
    expect(validateLimit(0)).toBeNull();
    expect(validateLimit(100)).toBeNull();
  });
  it('rechaza negativos, NaN, Infinity y enormes', () => {
    for (const v of [-1, NaN, Infinity, 1e12]) expect(validateLimit(v)).toBe('Límite no válido');
  });
});

describe('validateCategory', () => {
  const c = { name: 'Café', icon: 'coffee', kind: 'expense' as const, monthlyLimit: 10 };
  it('acepta válida', () => expect(validateCategory(c)).toBeNull());
  it('rechaza nombre vacío, kind y límite no válidos', () => {
    expect(validateCategory({ ...c, name: '  ' })).toBe('Ponle un nombre');
    expect(validateCategory({ ...c, kind: 'x' as never })).toBe('Tipo no válido');
    expect(validateCategory({ ...c, monthlyLimit: -2 })).toBe('Límite no válido');
  });
});

describe('validateRecurring', () => {
  it('acepta válido', () => expect(validateRecurring(rec)).toBeNull());
  it('rechaza importe, nombre, día y kind', () => {
    expect(validateRecurring({ ...rec, amount: 0 })).toBe('Nombre e importe obligatorios');
    expect(validateRecurring({ ...rec, name: ' ' })).toBe('Nombre e importe obligatorios');
    expect(validateRecurring({ ...rec, dayOfMonth: 32 })).toBe('Día entre 1 y 31');
    expect(validateRecurring({ ...rec, dayOfMonth: 1.5 })).toBe('Día entre 1 y 31');
    expect(validateRecurring({ ...rec, kind: 'x' as never })).toBe('Tipo no válido');
  });
});
