'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { DashboardView } from '@/components/dashboard-view';
import { AuthDialog } from '@/components/auth-dialog';

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#E5E4E2] overflow-hidden">
      {/* Sidebar - render it but maybe simpler or just standard */}
      <Sidebar />

      {/* We need to mimic the platform layout structure */}
      <main 
        className="flex-1 p-8 transition-[margin] duration-75 flex flex-col h-full overflow-hidden"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <DashboardView isGuest={true} onAuthRequest={() => setAuthOpen(true)} />
      </main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
