'use client';

import { ProfileNameDialog } from '@/components/profile-name-dialog';
import { TeamFab } from '@/components/team-fab';
import { AppTutorial } from '@/components/app-tutorial';

export function AppOverlays() {
  return (
    <>
      <ProfileNameDialog />
      <TeamFab />
      <AppTutorial />
    </>
  );
}
