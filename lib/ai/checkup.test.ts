import { describe, it, expect } from 'vitest';
import type { CheckupScore } from '@/lib/finance/checkup';
import { buildCheckup, cleanCheckupText, fallbackCheckupText, parseCheckup } from './checkup';

const score: CheckupScore & { score: number } = {
  month: '2026-10', partial: false, score: 4.2,
  parts: [
    { key: 'saving', label: 'Ahorro', score: 5, detail: 'Has ahorrado el 15 % de lo que ingresas' },
    { key: 'budget', label: 'Presupuesto', score: 0, detail: 'Has gastado 1700 € de 300 €' },
    { key: 'risk', label: 'Riesgo', score: 10, detail: 'Cripto y acciones sueltas son el 5 % de lo que tienes invertido' },
  ],
};

describe('texto del chequeo', () => {
  it('limpia lo que escribe el modelo y exige dos acciones', () => {
    expect(cleanCheckupText({ summary: ' Vas **bien**. ', actions: ['1. Sube el ahorro', '- Revisa ocio', 'sobra'] }))
      .toEqual({ summary: 'Vas bien.', actions: ['Sube el ahorro', 'Revisa ocio'] });
    expect(cleanCheckupText({ summary: 'Vale', actions: ['solo una'] })).toBeNull();
    expect(cleanCheckupText({ summary: '', actions: ['a', 'b'] })).toBeNull();
    expect(cleanCheckupText(null)).toBeNull();
  });

  it('sin IA: cuenta los datos y aconseja sobre lo peor', () => {
    const t = fallbackCheckupText(score);
    expect(t.summary).toContain('Has gastado 1700 € de 300 €');
    expect(t.actions).toEqual(['Mira en Presupuesto qué categoría se te va y ponle un tope', 'Aparta el ahorro el día que cobras, antes de gastar']);
    const fine = fallbackCheckupText({ ...score, parts: [score.parts[2]] });
    expect(fine.actions).toHaveLength(2);
  });

  it('se guarda como JSON y se vuelve a leer; un resumen antiguo no es un chequeo', () => {
    const c = buildCheckup(score, { summary: 'Hola', actions: ['a', 'b'] }, true);
    expect(parseCheckup(JSON.stringify(c))).toEqual(c);
    expect(parseCheckup('**Cómo ha ido** Bien.')).toBeNull();
    expect(parseCheckup('{"v":1}')).toBeNull();
    expect(parseCheckup('{roto')).toBeNull();
  });
});
