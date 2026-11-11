import { EmptyState } from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <div className="mt-4 lg:mt-0">
      <EmptyState title="Esto no existe" body="Puede que lo hayas borrado o que el enlace esté mal." actions={[{ href: '/', label: 'Ir a Inicio' }]} />
    </div>
  );
}
