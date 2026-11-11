'use client';

import { WifiOff } from 'lucide-react';
import { useOnline } from '@/lib/hooks/use-online';

export function OfflineBanner() {
  if (useOnline()) return null;
  return (
    <div className="mb-3 mt-3 flex items-center justify-center gap-2 rounded-full bg-warn/15 px-4 py-2 text-small font-medium text-warn">
      <WifiOff size={16} /> Sin conexión · lo que apuntes se subirá luego
    </div>
  );
}
