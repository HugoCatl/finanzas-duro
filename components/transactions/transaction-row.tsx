'use client';

import type { Category, Transaction } from '@/lib/types';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Money } from '@/components/ui/money';
import { SwipeRow } from '@/components/ui/swipe-row';

/** Deslizar a la izquierda muestra Editar / Borrar. */
export function TransactionRow({ tx, category, account, onEdit, onDelete }: {
  tx: Transaction; category: Category | undefined; account?: string; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <SwipeRow onTap={onEdit} className="" actions={[
      { label: 'Editar', className: 'bg-surface-2 text-text', onClick: onEdit },
      { label: 'Borrar', className: 'bg-loss text-white', onClick: onDelete },
    ]}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2"><CategoryIcon icon={category?.icon ?? 'circle'} size={16} className={category ? 'text-muted' : 'text-warn'} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{tx.merchant ?? category?.name ?? 'Sin categoría'}</span>
        <span className="block truncate text-small text-muted">
          {category?.name ?? 'Toca para categorizar'}{account ? ` · ${account}` : ''}{tx.source === 'recurring' ? ' · fijo' : ''}
        </span>
      </span>
      <Money value={tx.amount} signed className={`font-medium ${tx.amount > 0 ? 'text-gain' : ''}`} />
    </SwipeRow>
  );
}
