'use client';

import { useState, useTransition } from 'react';
import { BellRing } from 'lucide-react';
import type { Alert } from '@/lib/types';
import { markAlertsRead } from '@/lib/actions/alerts';
import { Card } from '@/components/ui/card';

export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markRead() {
    setError(null);
    start(async () => {
      const result = await markAlertsRead();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card className="border-warn/30">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-heading"><BellRing size={18} className="text-warn" /> Avisos</h2>
        <button disabled={pending} onClick={markRead} className="text-small text-muted">
          Marcar como leídos
        </button>
      </div>
      {error && <p role="alert" className="mb-3 text-small text-loss">{error}</p>}
      <ul className="flex flex-col gap-3">
        {alerts.slice(0, 4).map((a) => (
          <li key={a.id}>
            <p className="font-medium">{a.title}</p>
            <p className="text-small text-muted">{a.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
