import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { duro } from './store';

describe('ánimo de Duro', () => {
  beforeEach(() => { vi.useFakeTimers(); duro.set('idle'); duro.hush(); });
  afterEach(() => vi.useRealTimers());

  it('una reacción dura unos segundos y vuelve al estado de fondo', () => {
    duro.set('talking');
    duro.react('celebrating');
    expect(duro.get().mood).toBe('celebrating');
    vi.advanceTimersByTime(1500);
    expect(duro.get().mood).toBe('talking');
  });

  it('pensar corta la reacción en curso', () => {
    duro.react('wink');
    duro.set('thinking');
    expect(duro.get().mood).toBe('thinking');
    vi.advanceTimersByTime(2000);
    expect(duro.get().mood).toBe('thinking');
  });

  it('el bocadillo sale con la reacción y se va solo', () => {
    duro.react('worried', 'Presupuesto del mes al 80 %');
    expect(duro.get().message).toBe('Presupuesto del mes al 80 %');
    vi.advanceTimersByTime(4600);
    expect(duro.get()).toMatchObject({ mood: 'idle', message: null });
  });
});
