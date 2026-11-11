import { describe, it, expect } from 'vitest';
import { GLOSSARY, LEVEL_TONE, levelOf } from './level';

describe('levelOf', () => {
  it('sale de la experiencia invirtiendo; sin respuesta, intermedio', () => {
    expect(levelOf({ experience: 'none' })).toBe('beginner');
    expect(levelOf({ experience: 'some' })).toBe('mid');
    expect(levelOf({ experience: 'advanced' })).toBe('advanced');
    expect(levelOf({ experience: null })).toBe('mid');
  });
  it('cada explicación es una frase corta y hay un tono por nivel', () => {
    for (const text of Object.values(GLOSSARY)) expect(text.length).toBeLessThan(160);
    expect(Object.keys(LEVEL_TONE)).toEqual(['beginner', 'mid', 'advanced']);
  });
});
