'use client';

/** Pestañas de periodo o modo. La activa va en dorado. */
export function Segmented<T extends string>({ value, options, onChange, label, size = 'sm', className = '' }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md'; className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex gap-1 rounded-full bg-surface-2 p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-full ${size === 'sm' ? 'px-3 py-1 text-small' : 'px-4 py-1.5 text-body'} font-medium ${active ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
