import { getAppData } from '@/lib/data/app-data';
import { learnedCategories } from '@/lib/transactions/learn';
import { PageHeader } from '@/components/ui/page-header';
import { TransactionList } from '@/components/transactions/transaction-list';
import { AddTransaction } from '@/components/transactions/add-transaction';

export default async function MovimientosPage() {
  const data = await getAppData('movements');
  return (
    <>
      <PageHeader title="Movimientos" />
      <TransactionList transactions={data.transactions} transfers={data.transfers} categories={data.categories} accounts={data.accounts} today={data.today} />
      <AddTransaction categories={data.categories} accounts={data.accounts} today={data.today} learned={learnedCategories(data.transactions)} />
    </>
  );
}
