import { describe, it, expect } from 'vitest';
import { transactionsToCsv } from './export';

describe('transactionsToCsv', () => {
  it('genera CSV con ; y coma decimal, escapando comillas', () => {
    const csv = transactionsToCsv(
      [{ id: 't', date: '2026-10-01', amount: -12.5, merchant: 'Bar "Pepe"; Centro', note: null, categoryId: 'c', accountId: 'a', source: 'manual', recurringId: null }],
      [{ id: 'c', name: 'Comida fuera', icon: 'utensils', kind: 'expense', isFixed: false, monthlyLimit: null, sortOrder: 0 }],
      [{ id: 'a', name: 'ING', institution: 'ING', color: '#000', sortOrder: 0 }],
    );
    expect(csv.split('\n')).toEqual([
      'fecha;importe;categoria;concepto;nota;cuenta;origen',
      '2026-10-01;-12,50;Comida fuera;"Bar ""Pepe""; Centro";;ING;manual',
    ]);
  });

  it('neutraliza fórmulas de hoja de cálculo en los textos', () => {
    const base = { id: 't', date: '2026-10-01', amount: 5, categoryId: null, accountId: null, source: 'manual' as const, recurringId: null };
    const csv = transactionsToCsv(
      [
        { ...base, merchant: '=HYPERLINK("http://x")', note: '+1' },
        { ...base, merchant: '@SUM(A1)', note: '-2' },
        { ...base, merchant: '\tcmd', note: 'normal' },
      ],
      [],
      [],
    );
    const rows = csv.split('\n').slice(1);
    expect(rows[0]).toBe('2026-10-01;5,00;;"\'=HYPERLINK(""http://x"")";\'+1;;manual');
    expect(rows[1]).toBe("2026-10-01;5,00;;'@SUM(A1);'-2;;manual");
    expect(rows[2]).toBe("2026-10-01;5,00;;'\tcmd;normal;;manual");
  });

  it('entrecomilla saltos de línea y retornos de carro', () => {
    const csv = transactionsToCsv(
      [{ id: 't', date: '2026-10-01', amount: 1, merchant: 'a\r\nb', note: null, categoryId: null, accountId: null, source: 'manual', recurringId: null }],
      [], [],
    );
    expect(csv).toContain(';"a\r\nb";');
  });
});
