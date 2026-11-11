import Link from 'next/link';
import type { GoalProgress } from '@/lib/finance/goal';
import { eur, monthLabel, pct } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function GoalCard({ target, progress, pace }: { target: number; progress: GoalProgress; pace: number }) {
  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-heading">Objetivo <span className="num">{eur(target, { whole: true })}</span></h2>
        <span className="num text-small text-accent">{pct(progress.pct)}</span>
      </div>
      <Progress pct={progress.pct} level="ok" />
      <p className="mt-3 text-small text-muted">
        {progress.remaining === 0 ? (
          'Objetivo conseguido.'
        ) : (
          <>
            Te faltan <span className="num text-text">{eur(progress.remaining)}</span>
            {progress.eta
              ? <>. Ahorrando unos <span className="num">{eur(pace, { whole: true })}</span> al mes llegarías en {monthLabel(progress.eta).toLowerCase()}.</>
              : <>. <Link href="/presupuesto" className="text-text underline-offset-2 hover:underline">Pon tus fijos y límites</Link> para estimar cuándo llegas.</>}
          </>
        )}
      </p>
    </Card>
  );
}
