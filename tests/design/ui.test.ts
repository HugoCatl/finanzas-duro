import { describe, it, expect } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';

describe('piezas comunes', () => {
  it('el botón principal es dorado y el secundario no', () => {
    expect(buttonClass('primary')).toContain('bg-accent');
    expect(buttonClass('primary')).toContain('text-accent-ink');
    expect(buttonClass('secondary')).toContain('bg-surface-2');
    expect(buttonClass('secondary')).not.toContain('bg-accent');
  });
  it('Button pinta un <button type="button"> por defecto', () => {
    const html = renderToStaticMarkup(h(Button, null, 'Guardar'));
    expect(html).toMatch(/^<button type="button"/);
    expect(html).toContain('Guardar');
  });
  it('la tarjeta es plana con borde fino y la versión flush no tiene relleno', () => {
    const html = renderToStaticMarkup(h(Card, null, 'x'));
    expect(html).toContain('rounded-card');
    expect(html).toContain('border-line');
    expect(html).toContain('p-4');
    expect(renderToStaticMarkup(h(Card, { flush: true }, 'x'))).not.toContain('p-4');
  });
  it('una fila con href es un enlace y la cifra lleva .num', () => {
    const html = renderToStaticMarkup(h(ListRow, { href: '/cuentas', title: 'ING', value: '1.000 €' }));
    expect(html).toContain('href="/cuentas"');
    expect(html).toMatch(/class="[^"]*num[^"]*"[^>]*>1\.000 €/);
  });
});
