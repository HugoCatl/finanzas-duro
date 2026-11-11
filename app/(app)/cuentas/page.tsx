import { getAppData } from '@/lib/data/app-data';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { eur } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { EmptyNote } from '@/components/ui/empty-state';
import { Hero } from '@/components/ui/hero';
import { ListRow } from '@/components/ui/list-row';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { AccountEditor } from '@/components/accounts/account-editor';

export default async function CuentasPage() {
  const data = await getAppData('portfolio');
  const pf = appPortfolio(data);

  return (
    <>
      <PageHeader title="Cuentas" action={<AccountEditor />} />
      <Hero label="Todo tu dinero" value={pf.total} storageKey="cuentas:total">
        <span className="text-muted">Beneficio acumulado <Money value={pf.profit} signed colored /></span>
      </Hero>
      {data.accounts.length === 0 && <EmptyNote>Aún no tienes cuentas. Crea la primera con «Nueva»: tu banco, tu bróker o donde tengas la cripto.</EmptyNote>}
      <Card flush className="divide-y divide-line empty:hidden">
        {data.accounts.map((a) => {
          const count = pf.items.filter((i) => i.holding.accountId === a.id).length;
          return (
            <ListRow key={a.id} href={`/cuentas/${a.id}`} title={a.name} value={eur(pf.byAccount[a.id] ?? 0)}
              leading={<span className="block size-2.5 rounded-full" style={{ background: a.color }} />}
              subtitle={`${count} posici${count === 1 ? 'ón' : 'ones'}`} />
          );
        })}
      </Card>
    </>
  );
}
