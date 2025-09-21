
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, User, List, Handshake, Percent, CalendarClock, TrendingUp, UserX, PhoneOff, CalendarDays } from 'lucide-react';
import type { ProcessedLead } from '@/lib/types';

const LEADS_KEY = 'leadsorter_leads';

export default function AccountPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      setAllLeads(JSON.parse(storedLeads));
    }
  }, []);

  const accountStats = useMemo(() => {
    const totalLeads = allLeads.length;
    const totalInteractions = allLeads.filter(l => l.leadStatus !== 'new').length;
    const meetings = allLeads.filter(l => l.leadStatus === 'meeting-scheduled').length;
    const sales = allLeads.filter(l => l.leadStatus === 'sale-made').length;
    const notInterested = allLeads.filter(l => l.leadStatus === 'not-interested').length;
    const callBacks = allLeads.filter(l => l.leadStatus === 'call-back').length;
    const wrongNumbers = allLeads.filter(l => l.leadStatus === 'wrong-number').length;
    const contacted = allLeads.filter(l => l.leadStatus && !['new', 'no-answer', 'wrong-number'].includes(l.leadStatus)).length;
    
    const contactRate = totalInteractions > 0 ? (contacted / totalInteractions) * 100 : 0;
    const meetingRate = contacted > 0 ? (meetings / contacted) * 100 : 0;
    const closingRate = meetings > 0 ? (sales / meetings) * 100 : 0;

    return { totalLeads, meetings, sales, notInterested, contactRate, totalInteractions, callBacks, wrongNumbers, meetingRate, closingRate };
  }, [allLeads]);

  const StatCard = ({ title, value, icon, rate }: { title: string; value: string | number; icon: React.ReactNode; rate?: string | number | null }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {rate && <p className="text-xs text-muted-foreground">{rate}</p>}
        </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <User className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Your Account</h1>
                    <p className="text-muted-foreground">A summary of your performance.</p>
                </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Leads" value={accountStats.totalLeads} icon={<List className="h-4 w-4 text-muted-foreground" />} />
            <StatCard title="Interactions" value={accountStats.totalInteractions} icon={<Handshake className="h-4 w-4 text-muted-foreground" />} rate={`${accountStats.contactRate.toFixed(1)}% contact rate`} />
            <StatCard title="Meetings Scheduled" value={accountStats.meetings} icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />} rate={`${accountStats.meetingRate.toFixed(1)}% of contacted`} />
            <StatCard title="Sales Made" value={accountStats.sales} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} rate={`${accountStats.closingRate.toFixed(1)}% of meetings`} />
        </div>

         <div className="mt-8">
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                    <CardDescription>A closer look at your lead statuses.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 text-sm">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <UserX className="h-4 w-4 text-red-500" />
                            <span>Not Interested</span>
                        </div>
                        <span className="font-semibold">{accountStats.notInterested}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                            <span>Needs Call Back</span>
                        </div>
                        <span className="font-semibold">{accountStats.callBacks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <PhoneOff className="h-4 w-4 text-orange-500" />
                            <span>Wrong Numbers</span>
                        </div>
                        <span className="font-semibold">{accountStats.wrongNumbers}</span>
                    </div>
                </CardContent>
            </Card>
        </div>

      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter. All rights reserved.</p>
      </footer>
    </div>
  );
