import { describe, it, expect } from 'vitest';
import { SOURCES_MARK, cardTags, cleanSources, nextAdvisorCount, splitAnswer, stripCardTags, validateChat } from './advisor';

describe('validateChat', () => {
  it('se queda con mensajes válidos y empieza por el usuario', () => {
    const r = validateChat([
      { role: 'assistant', content: '¡Hola!' },
      { role: 'user', content: '¿Cómo voy?' },
    ]);
    expect(r).toEqual([{ role: 'user', content: '¿Cómo voy?' }]);
  });
  it('recorta el historial y los mensajes largos', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
    many.push({ role: 'user', content: 'x'.repeat(5000) });
    const r = validateChat(many) as { content: string }[];
    expect(r.length).toBeLessThanOrEqual(12);
    expect(r[r.length - 1].content).toHaveLength(800);
  });
  it('rechaza lo que no es un chat', () => {
    expect(validateChat([])).toBe('Escribe algo');
    expect(validateChat([{ role: 'system', content: 'hola' }])).toBe('Mensaje no válido');
    expect(validateChat([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }])).toBe('Mensaje no válido');
    expect(validateChat('hola')).toBe('Escribe algo');
  });
});

describe('nextAdvisorCount', () => {
  it('cuenta por día y corta en el límite', () => {
    expect(nextAdvisorCount(null, 0, '2026-11-04')).toBe(1);
    expect(nextAdvisorCount('2026-11-03', 40, '2026-11-04')).toBe(1);
    expect(nextAdvisorCount('2026-11-04', 5, '2026-11-04')).toBe(6);
    expect(nextAdvisorCount('2026-11-04', 40, '2026-11-04')).toBeNull();
  });
});

describe('fuentes de la búsqueda', () => {
  it('limpia: solo enlaces web, sin repetir medio, cuatro como mucho', () => {
    const r = cleanSources([
      { sourceType: 'url', url: 'https://a.com/1', title: 'www.reuters.com' },
      { sourceType: 'url', url: 'https://a.com/2', title: 'reuters.com' },
      { sourceType: 'url', url: 'javascript:alert(1)', title: 'malo' },
      { sourceType: 'document', url: 'https://a.com/3', title: 'doc' },
      { sourceType: 'url', url: 'https://www.elpais.com/x' },
      ...[1, 2, 3, 4].map((n) => ({ sourceType: 'url', url: `https://m${n}.com`, title: `m${n}.com` })),
    ]);
    expect(r.map((s) => s.title)).toEqual(['reuters.com', 'elpais.com', 'm1.com', 'm2.com']);
  });
  it('separa el texto de las fuentes y aguanta el JSON a medias', () => {
    const sources = [{ title: 'reuters.com', url: 'https://a.com/1' }];
    expect(splitAnswer('Hola')).toEqual({ content: 'Hola', sources: [], cards: [] });
    expect(splitAnswer('Hola' + SOURCES_MARK + JSON.stringify({ sources }))).toEqual({ content: 'Hola', sources, cards: [] });
    expect(splitAnswer('Hola' + SOURCES_MARK + '{"sources":[{"title":"reu')).toEqual({ content: 'Hola', sources: [], cards: [] });
  });
});

describe('tarjetas del chat', () => {
  it('reconoce las etiquetas conocidas, sin repetir y dos como mucho', () => {
    expect(cardTags('Vas bien.\n[[presupuesto]]\n[[ Colchón ]] [[presupuesto]] [[objetivo]] [[otra]]')).toEqual(['presupuesto', 'colchon']);
    expect(cardTags('Nada que enseñar')).toEqual([]);
  });
  it('las quita del texto, también a medio llegar', () => {
    expect(stripCardTags('Vas bien.\n[[presupuesto]]')).toBe('Vas bien.');
    expect(stripCardTags('Vas bien.\n[[presu')).toBe('Vas bien.');
    expect(stripCardTags('Vas bien.\n[')).toBe('Vas bien.');
    expect(stripCardTags('Pesa un 5 % [aprox.] de tu cartera.')).toBe('Pesa un 5 % [aprox.] de tu cartera.');
  });
  it('solo acepta tarjetas con enlace a una pantalla de la app', () => {
    const cards = [
      { title: 'Presupuesto', value: 'Te quedan 10 €', detail: 'Gastado 290 € de 300 €', href: '/presupuesto', pct: 1.4 },
      { title: 'Mala', value: 'x', detail: '', href: 'https://malo.com' },
      { title: 'Mala', value: 'x', detail: '', href: '//malo.com' },
    ];
    expect(splitAnswer('Hola [[presupuesto]]' + SOURCES_MARK + JSON.stringify({ sources: [], cards }))).toEqual({
      content: 'Hola', sources: [], cards: [{ title: 'Presupuesto', value: 'Te quedan 10 €', detail: 'Gastado 290 € de 300 €', href: '/presupuesto', pct: 1 }],
    });
  });
});
