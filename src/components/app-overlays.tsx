'use client';

import { ProfileNameDialog } from '@/components/profile-name-dialog';
import { TeamFab } from '@/components/team-fab';
import { AppTutorial } from '@/components/app-tutorial';
import { usePathname } from 'next/navigation';

export function AppOverlays() {
  const pathname = usePathname();
  const hideTeamFab = pathname?.startsWith('/bundles');

  return (
    <>
      <ProfileNameDialog />
      {!hideTeamFab && <TeamFab />}
      <AppTutorial />
    </>
  );
}
