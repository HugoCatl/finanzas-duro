import type { Metadata } from 'next';
import { getAppData } from '@/lib/data/app-data';
import { OnboardingWizard } from '@/components/onboarding/wizard';

export const metadata: Metadata = { title: 'Bienvenida · Finanzas' };

export default async function BienvenidaPage() {
  const data = await getAppData('settings');
  return (
    <OnboardingWizard existingAccounts={data.accounts.map((a) => ({ name: a.name, color: a.color }))}
      categories={data.categories} target={data.settings.netWorthTarget} />
  );
}
