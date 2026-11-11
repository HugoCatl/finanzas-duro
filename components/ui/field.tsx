import { Button } from './button';

export const inputClass = 'w-full rounded-control border border-line bg-surface-2 px-4 py-3 outline-none placeholder:text-faint focus:border-accent';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-small text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Botón principal a todo el ancho (formularios). Igual que <Button variant="primary" block>. */
export function PrimaryButton({ type = 'submit', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="primary" block type={type} {...props} />;
}
