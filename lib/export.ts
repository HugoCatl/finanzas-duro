import type { Account, Category, Transaction } from '@/lib/types';

/** Texto libre: neutraliza fórmulas (=, +, -, @, tab, CR) y entrecomilla ; " y saltos de línea. */
const cell = (v: string | null | undefined) => {
  let s = v ?? '';
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function transactionsToCsv(txs: Transaction[], categories: Category[], accounts: Account[]): string {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const header = 'fecha;importe;categoria;concepto;nota;cuenta;origen';
  const rows = txs.map((t) => [
    t.date,
    t.amount.toFixed(2).replace('.', ','),
    cell(t.categoryId ? cat.get(t.categoryId) : ''),
    cell(t.merchant),
    cell(t.note),
    cell(t.accountId ? acc.get(t.accountId) : ''),
    t.source,
  ].join(';'));
  return [header, ...rows].join('\n');
}
