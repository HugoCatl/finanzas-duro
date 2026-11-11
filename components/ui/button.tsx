type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold',
  secondary: 'bg-surface-2 text-text font-medium',
  ghost: 'text-muted font-medium hover:text-text',
  danger: 'text-loss font-medium',
};
const SIZES: Record<Size, string> = { md: 'h-12 px-5 text-body', sm: 'h-9 px-3.5 text-small' };

/** Clases del botón, para usarlas también en un <Link>. */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', block = false): string {
  return `inline-flex items-center justify-center gap-2 rounded-control ${SIZES[size]} ${VARIANTS[variant]} ${block ? 'w-full' : ''} disabled:opacity-40`;
}

/** Botón de la app: `primary` (dorado, uno por pantalla), `secondary`, `ghost` o `danger`. */
export function Button({ variant = 'secondary', size = 'md', block = false, className = '', type = 'button', ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; block?: boolean }) {
  return <button type={type} {...props} className={`${buttonClass(variant, size, block)} ${className}`} />;
}
