
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, User, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import type { ProcessedLead } from '@/lib/types';
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

const LEADS_KEY = 'leadsorter_leads';

export default function AccountPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      setAllLeads(JSON.parse(storedLeads));
    }
  }, []);

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday

  const daysInWeek = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  const scheduledMeetings = allLeads.filter(
    (lead) => lead.leadStatus === 'meeting-scheduled' && lead.meetingTime
  );

  const getMeetingsForDay = (day: Date) => {
    return scheduledMeetings
      .filter((lead) => isSameDay(new Date(lead.meetingTime!), day))
      .sort((a, b) => new Date(a.meetingTime!).getTime() - new Date(b.meetingTime!).getTime());
  };

  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <User className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Your Calendar</h1>
                    <p className="text-muted-foreground">A weekly overview of your scheduled meetings.</p>
                </div>
            </div>
             <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>
        </div>

        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={goToToday}>Today</Button>
                </div>
                <h2 className="text-xl font-semibold text-center">
                    {format(startOfCurrentWeek, 'MMMM d')} - {format(addDays(startOfCurrentWeek, 6), 'MMMM d, yyyy')}
                </h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-7 gap-1 bg-muted/50 p-1 rounded-lg border">
                {daysInWeek.map(day => (
                    <div key={day.toString()} className={cn("rounded-md p-2 bg-background h-full min-h-[200px]", { 'bg-muted/60': isPast(day) && !isSameDay(day, new Date()) })}>
                        <h3 className={cn("font-semibold text-center mb-2", { 'text-primary': isSameDay(day, new Date())})}>
                            {format(day, 'EEE')}
                        </h3>
                        <p className={cn("text-center text-sm text-muted-foreground mb-4", { 'text-primary font-bold': isSameDay(day, new Date())})}>{format(day, 'd')}</p>
                        <div className="space-y-2">
                            {getMeetingsForDay(day).map(meeting => (
                                <div key={meeting.id} className="bg-primary/10 border-l-4 border-primary text-primary-foreground p-2 rounded-md">
                                    <p className="font-bold text-sm text-primary">{meeting.correctedBusinessName}</p>
                                    <p className="text-xs text-primary/80 mt-1">{format(new Date(meeting.meetingTime!), 'p')}</p>
                                     <a href={`tel:${meeting.correctedPhoneNumber}`} className="flex items-center gap-1.5 text-xs text-primary/80 hover:underline mt-1">
                                        <Phone className="h-3 w-3" />
                                        {meeting.correctedPhoneNumber}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>

      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter. All rights reserved.</p>
      </footer>
    </div>
  );
}
