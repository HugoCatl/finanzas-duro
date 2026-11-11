import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { TradeRepublicImport } from '@/components/settings/trade-republic-import';

export default function ImportarPage() {
  return (
    <>
      <Link href="/ajustes" className="inline-flex items-center gap-1 pt-4 text-small text-muted lg:pt-0"><ChevronLeft size={16} /> Ajustes</Link>
      <PageHeader title="Importar de Trade Republic" />
      <div className="max-w-xl">
        <TradeRepublicImport />
      </div>
    </>
  );
}
