import { AppNav } from '@/components/nav/app-nav';
import { AdvisorBubble } from '@/components/advisor/advisor-bubble';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { PendingSync } from '@/components/pwa/pending-sync';
import { PullToRefresh } from '@/components/pwa/pull-to-refresh';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { Toaster } from '@/components/ui/toaster';
import { LevelProvider } from '@/components/ui/term';
import { getLevel } from '@/lib/data/level';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const level = await getLevel();
  return (
    <LevelProvider level={level}>
    <div className="min-h-dvh lg:pl-60">
      <AppNav />
      <main className="pt-safe mx-auto w-full max-w-md px-4 pb-44 lg:max-w-5xl lg:px-10 lg:pb-12 lg:pt-10">
        <OfflineBanner />
        <PendingSync />
        {children}
      </main>
      <AdvisorBubble />
      <PullToRefresh />
      <Toaster />
      <ServiceWorkerRegister />
    </div>
    </LevelProvider>
  );
}
