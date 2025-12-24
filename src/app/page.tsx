'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { DashboardView } from '@/components/dashboard-view';
import { AuthDialog } from '@/components/auth-dialog';

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#E5E4E2]">
      {/* Sidebar - render it but maybe simpler or just standard */}
      <Sidebar />

      {/* We need to mimic the platform layout structure */}
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
        <DashboardView isGuest={true} onAuthRequest={() => setAuthOpen(true)} />
      </main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
