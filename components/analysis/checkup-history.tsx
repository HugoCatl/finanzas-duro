import type { AiSummary } from '@/lib/types';
import { parseCheckup } from '@/lib/ai/checkup';
import { monthLabel } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { CheckupBody } from '@/components/advisor/checkup-card';

/** Chequeos de Duro de los últimos meses. Los resúmenes de texto de antes se siguen viendo tal cual. */
export function CheckupHistory({ summaries }: { summaries: AiSummary[] }) {
  if (!summaries.length) {
    return <Card><p className="text-small text-muted">Aún no hay chequeos. Duro te hace uno el día 1 de cada mes; también puedes pedírselo en Inicio.</p></Card>;
  }
  return (
    <div className="flex flex-col gap-4">
      {summaries.map((s) => {
        const checkup = parseCheckup(s.content);
        return (
          <Card key={s.id}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-heading">{monthLabel(s.month)}{checkup?.partial && <span className="text-small font-normal text-muted"> · a medias</span>}</h3>
              {checkup && <p className="num text-heading">{String(checkup.score).replace('.', ',')}<span className="text-small font-normal text-muted"> /10</span></p>}
            </div>
            {checkup ? <CheckupBody checkup={checkup} /> : (
              <div className="flex flex-col gap-2 text-small leading-relaxed">
                {s.content.split(/\n+/).filter(Boolean).map((line, i) => (
                  <p key={i}>{line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                    part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part)}</p>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
