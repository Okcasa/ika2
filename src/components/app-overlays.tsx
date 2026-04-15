'use client';

import { ProfileNameDialog } from '@/components/profile-name-dialog';
import { TeamFab } from '@/components/team-fab';
import { AppTutorial } from '@/components/app-tutorial';
import { SupportFab } from '@/components/support-fab';
import { usePathname } from 'next/navigation';

export function AppOverlays() {
  const pathname = usePathname();
  const hideTeamFab = false; // Always render to register global, but hidden via TeamFab's hiddenRoute
  const hideSupportFab = pathname === '/' || pathname?.startsWith('/shop') || pathname?.startsWith('/products') || pathname?.startsWith('/leads') || pathname?.startsWith('/logs') || pathname?.startsWith('/income') || pathname?.startsWith('/customers') || pathname?.startsWith('/privacy') || pathname?.startsWith('/terms');

  return (
    <>
      <ProfileNameDialog />
      {!hideTeamFab && <TeamFab />}
      {!hideSupportFab && <SupportFab />}
      <AppTutorial />
    </>
  );
}
