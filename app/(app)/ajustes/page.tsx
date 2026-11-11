import { getAppData } from '@/lib/data/app-data';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { CategoryManager } from '@/components/settings/category-manager';
import { PushToggle } from '@/components/settings/push-toggle';
import { SignOutButton } from '@/components/settings/sign-out-button';
import { ResetData } from '@/components/settings/reset-data';
import { SettingsForm } from '@/components/settings/settings-form';
import { NetWorthGoalForm } from '@/components/settings/net-worth-goal-form';
import { ApplePaySetup } from '@/components/settings/apple-pay-setup';
import { hasShortcutToken } from '@/lib/actions/shortcut';
import { getProfile } from '@/lib/actions/profile';
import { ProfileCard } from '@/components/advisor/profile-card';

export default async function AjustesPage() {
  const [data, applePay, profile] = await Promise.all([getAppData('settings'), hasShortcutToken(), getProfile()]);
  const h2 = (t: string) => <h2 className="mb-3 text-heading">{t}</h2>;

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><PushToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} /></Card>
        <Card>{h2('Sobre ti')}<ProfileCard initial={profile} /></Card>
        <Card>{h2('Objetivo de patrimonio')}<NetWorthGoalForm target={data.settings.netWorthTarget} /></Card>
        <Card>{h2('Apple Pay')}<ApplePaySetup enabled={applePay} /></Card>
        <Card>{h2('Avisos')}<SettingsForm bigExpenseThreshold={data.settings.bigExpenseThreshold} /></Card>
        <Card className="lg:col-span-2">{h2('Categorías')}<CategoryManager categories={data.categories} accounts={data.accounts} /></Card>
        <Card flush>
          <h2 className="px-4 pt-4 text-heading">Tus datos</h2>
          <div className="divide-y divide-line">
            <ListRow href="/bienvenida" title="Repetir la configuración inicial" />
            <ListRow href="/?tour=1" title="Ver el tutorial otra vez" />
            <ListRow href="/ajustes/importar" title="Importar de Trade Republic" subtitle="Archivo CSV" />
            <a href="/api/export?format=csv" className="flex px-4 py-3.5 font-medium">Exportar movimientos (CSV)</a>
            <a href="/api/export?format=json" className="flex px-4 py-3.5 font-medium">Exportar todo (JSON)</a>
          </div>
          <div className="border-t border-line p-4"><ResetData /></div>
        </Card>
        <Card>
          {h2('Sesión')}
          <SignOutButton />
        </Card>
      </div>
    </>
  );
}
