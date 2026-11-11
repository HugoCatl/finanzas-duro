import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('app/globals.css', 'utf8');
const token = (name: string) => css.match(new RegExp(`--${name}:\s*([^;]+);`))?.[1].trim();

describe('tema oscuro premium', () => {
  it('no depende del modo del sistema', () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).toMatch(/color-scheme:\s*dark/);
  });
  it('usa los colores del diseño', () => {
    expect(token('bg')).toBe('#0a0a0b');
    expect(token('surface')).toBe('#111113');
    expect(token('surface-2')).toBe('#18181b');
    expect(token('line')).toBe('#1f1f23');
    expect(token('text')).toBe('#f4f4f5');
    expect(token('muted')).toBe('#8b8b93');
    expect(token('faint')).toBe('#5a5a62');
    expect(token('accent')).toBe('#d4a94f');
    expect(token('accent-ink')).toBe('#1a1408');
    expect(token('gain')).toBe('#3fbf7f');
    expect(token('loss')).toBe('#ef6b6b');
    expect(token('warn')).toBe('#e0a63a');
    expect(token('duro')).toBe('#f2a7b5');
  });
  it('define las cinco medidas de texto', () => {
    for (const u of ['text-hero', 'text-title', 'text-heading', 'text-body', 'text-small']) {
      expect(css).toContain(`@utility ${u}`);
    }
  });
  it('la barra del sistema y el manifest son negros', () => {
    expect(readFileSync('app/layout.tsx', 'utf8')).toContain("themeColor: '#0a0a0b'");
    const manifest = readFileSync('app/manifest.ts', 'utf8');
    expect(manifest).toContain("background_color: '#0a0a0b'");
    expect(manifest).toContain("theme_color: '#0a0a0b'");
  });
});
