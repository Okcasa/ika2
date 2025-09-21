
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, User, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import type { ProcessedLead } from '@/lib/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isPast, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth),
    end: endOfWeek(lastDayOfMonth),
  });

  const scheduledMeetings = useMemo(() => allLeads.filter(
    (lead) => lead.leadStatus === 'meeting-scheduled' && lead.meetingTime
  ), [allLeads]);

  const getMeetingsForDay = (day: Date) => {
    return scheduledMeetings
      .filter((lead) => isSameDay(new Date(lead.meetingTime!), day))
      .sort((a, b) => new Date(a.meetingTime!).getTime() - new Date(b.meetingTime!).getTime());
  };

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <User className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Your Calendar</h1>
                    <p className="text-muted-foreground">A monthly overview of your scheduled meetings.</p>
                </div>
            </div>
             <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>
        </div>

        <div className="bg-card border rounded-lg">
            <header className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-semibold text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="outline" onClick={goToToday}>Today</Button>
            </header>
            <div className="grid grid-cols-7">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center font-semibold text-muted-foreground p-2 border-r border-b text-xs">
                        {day}
                    </div>
                ))}
            </div>
            <TooltipProvider>
              <div className="grid grid-cols-7 grid-rows-5">
                  {daysInMonth.map(day => (
                      <div 
                          key={day.toString()} 
                          className={cn(
                              "relative border-r border-b h-36 p-2 flex flex-col group",
                              !isSameMonth(day, currentDate) && "text-muted-foreground/40",
                          )}
                      >
                          <span className={cn(
                              "font-medium text-sm",
                                isSameDay(day, new Date()) && "flex items-center justify-center h-6 w-6 rounded-full border-2 border-primary"
                          )}>
                              {format(day, 'd')}
                          </span>
                          <div className="space-y-1 mt-2 overflow-y-auto pr-1 text-xs">
                              {getMeetingsForDay(day).map(meeting => (
                                  <div key={meeting.id} className="bg-primary/80 text-primary-foreground p-1.5 rounded-md text-xs truncate">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-primary-foreground/80 mr-2 shrink-0"></div>
                                            <span className="truncate">{format(new Date(meeting.meetingTime!), 'p')} {meeting.correctedBusinessName}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-semibold">{meeting.correctedBusinessName}</p>
                                          <p>{meeting.correctedPhoneNumber}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
            </TooltipProvider>
        </div>

      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter. All rights reserved.</p>
      </footer>
    </div>
  );
}
