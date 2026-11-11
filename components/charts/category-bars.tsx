import { eur } from '@/lib/format';

/** Gasto por categoría; con `previous`, al lado sale cuánto ha cambiado respecto al mes anterior. */
export function CategoryBars({ items }: { items: { name: string; value: number; previous?: number }[] }) {
  if (items.length === 0) return <p className="py-8 text-center text-small text-muted">Aún no hay gastos este mes.</p>;
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i, idx) => (
        <li key={`${i.name}-${idx}`}>
          <div className="mb-1.5 flex justify-between">
            <span>{i.name}</span>
            <span className="num text-muted">
              {i.previous !== undefined && i.previous > 0 && (
                <span className={`mr-2 text-small ${i.value > i.previous ? 'text-warn' : 'text-gain'}`}>
                  {i.value > i.previous ? '▲' : '▼'} {eur(Math.abs(i.value - i.previous), { whole: true })}
                </span>
              )}
              {eur(i.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full origin-left animate-grow rounded-full bg-muted" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
