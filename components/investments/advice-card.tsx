import { Lightbulb } from 'lucide-react';
import type { Advice } from '@/lib/finance/advice';
import { Card } from '@/components/ui/card';

/** Consejos tranquilos sobre la cartera: sin rojo, como mucho dos. */
export function AdviceCard({ advice }: { advice: Advice[] }) {
  if (advice.length === 0) return null;
  return (
    <Card flush className="divide-y divide-line">
      {advice.map((a) => (
        <div key={a.id} className="flex gap-3 p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-accent"><Lightbulb size={15} /></span>
          <span className="min-w-0">
            <span className="block font-medium">{a.title}</span>
            <span className="block text-small text-muted">{a.body}</span>
          </span>
        </div>
      ))}
    </Card>
  );
}
