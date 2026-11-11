import { eur } from '@/lib/format';

export function Money({ value, signed, colored, className = '' }: {
  value: number; signed?: boolean; colored?: boolean; className?: string;
}) {
  const tone = colored ? (value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : '') : '';
  return <span className={`num ${tone} ${className}`}>{eur(value, { signed })}</span>;
}
