'use client';

/** Interruptor accesible (role="switch"); el pulgar se desliza con la curva suave de la app. */
export function Switch({ checked, onChange, disabled, label, busy }: {
  checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label: string; busy?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} aria-busy={busy || undefined}
      disabled={disabled || busy} onClick={() => onChange(!checked)}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-300 ease-soft
        disabled:cursor-not-allowed ${checked ? 'bg-accent' : 'bg-surface-2'} ${disabled ? 'opacity-50' : ''}`}>
      <span className={`absolute left-[3px] top-[3px] size-6 rounded-full bg-text transition-transform duration-300 ease-soft
        ${checked ? 'translate-x-5' : 'translate-x-0'} ${busy ? 'opacity-70' : ''}`} />
    </button>
  );
}
