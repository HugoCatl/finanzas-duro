import { AnimatedMoney } from './animated-money';

/** La cifra principal de una pantalla: etiqueta pequeña, importe grande y fino, y debajo su variación. */
export function Hero({ label, value, storageKey, signed, children, className = '' }: {
  label?: React.ReactNode; value: number; storageKey?: string; signed?: boolean; children?: React.ReactNode; className?: string;
}) {
  return (
    <section className={`pb-6 ${className}`}>
      {label && <p className="text-small text-muted">{label}</p>}
      <p className="text-hero"><AnimatedMoney value={value} storageKey={storageKey} signed={signed} /></p>
      {children && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small">{children}</div>}
    </section>
  );
}
