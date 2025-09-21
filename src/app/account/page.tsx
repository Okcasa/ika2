
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
    <div className="flex flex-col min-h-screen">
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

        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={goToToday}>Today</Button>
                </div>
                <h2 className="text-xl font-semibold text-center">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="grid grid-cols-7 border-t border-l">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-semibold text-muted-foreground p-2 border-b border-r text-sm">
                            {day}
                        </div>
                    ))}
                    {daysInMonth.map(day => (
                        <div 
                            key={day.toString()} 
                            className={cn(
                                "relative border-b border-r h-40 p-2 flex flex-col",
                                !isSameMonth(day, currentDate) && "bg-muted/30 text-muted-foreground/50",
                                isPast(day) && !isSameDay(day, new Date()) && "bg-muted/60",
                            )}
                        >
                            <span className={cn(
                                "font-semibold text-sm",
                                isSameDay(day, new Date()) && "flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground"
                            )}>
                                {format(day, 'd')}
                            </span>
                            <div className="space-y-1.5 mt-2 overflow-y-auto pr-1">
                                {getMeetingsForDay(day).map(meeting => (
                                    <div key={meeting.id} className="bg-primary/10 border-l-4 border-primary p-2 rounded-r-md">
                                        <p className="font-bold text-xs text-primary truncate">{meeting.correctedBusinessName}</p>
                                        <div className="flex items-center justify-between text-xs text-primary/80 mt-1">
                                          <span>{format(new Date(meeting.meetingTime!), 'p')}</span>
                                           <Tooltip>
                                              <TooltipTrigger asChild>
                                                <a href={`tel:${meeting.correctedPhoneNumber}`} className="hover:text-primary transition-colors">
                                                    <Phone className="h-3.5 w-3.5" />
                                                </a>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{meeting.correctedPhoneNumber}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
              </TooltipProvider>
            </CardContent>
        </Card>

      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter. All rights reserved.</p>
      </footer>
    </div>
  );
}
