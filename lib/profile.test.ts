import { describe, it, expect } from 'vitest';
import { EMPTY_PROFILE, describeProfile, hasProfile, parseProfile } from './profile';

describe('parseProfile', () => {
  it('deja pasar un perfil válido', () => {
    const p = parseProfile({ age: 27, situation: 'employee', goals: ['house', 'invest', 'house'], risk: 'medium', debts: false, notes: '  ahorro para la entrada ' });
    expect(p).toEqual({ ...EMPTY_PROFILE, age: 27, situation: 'employee', goals: ['house', 'invest'], risk: 'medium', debts: false, notes: 'ahorro para la entrada' });
  });
  it('vacía lo que no encaja', () => {
    expect(parseProfile({ age: 7, situation: 'pirata', goals: ['x', 3], dependents: -1, notes: 'a'.repeat(500) }))
      .toEqual({ ...EMPTY_PROFILE, notes: 'a'.repeat(300) });
    expect(parseProfile(null)).toEqual(EMPTY_PROFILE);
    expect(parseProfile('hola')).toBe('Perfil no válido');
  });
});

describe('hasProfile y describeProfile', () => {
  it('pide la edad y algo más', () => {
    expect(hasProfile({ ...EMPTY_PROFILE, age: 30 })).toBe(false);
    expect(hasProfile({ ...EMPTY_PROFILE, age: 30, risk: 'low' })).toBe(true);
  });
  it('lo pone en palabras', () => {
    expect(describeProfile({ ...EMPTY_PROFILE, age: 30, goals: ['emergency'], debts: true }))
      .toEqual({ edad: 30, objetivos: 'Tener un colchón', deudas: 'Sí, tiene deudas (préstamos o tarjetas)' });
  });
});
