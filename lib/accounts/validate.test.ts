import { describe, it, expect } from 'vitest';
import { validateAccount } from './validate';

describe('validateAccount', () => {
  it('acepta un nombre y un color válidos', () => {
    expect(validateAccount({ name: ' ING ', color: '#ff6200' }, ['BBVA'])).toBeNull();
  });

  it('pide nombre y lo limita a 40 caracteres', () => {
    expect(validateAccount({ name: '  ', color: '#ff6200' }, [])).toBe('Ponle un nombre');
    expect(validateAccount({ name: 'x'.repeat(41), color: '#ff6200' }, [])).toBe('Nombre demasiado largo');
  });

  it('rechaza colores que no son hex', () => {
    expect(validateAccount({ name: 'ING', color: 'red' }, [])).toBe('Color no válido');
  });

  it('no deja repetir el nombre de otra cuenta', () => {
    expect(validateAccount({ name: 'bbva', color: '#000000' }, ['BBVA '])).toBe('Ya tienes una cuenta llamada bbva');
  });
});
