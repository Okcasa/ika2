'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessedLead, LeadStatus } from '@/lib/types';
import { Phone, MoreHorizontal, TrendingUp, XCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leads: ProcessedLead[];
  onUpdateLead: (lead: ProcessedLead) => void;
}

export function CalendarDialog({ isOpen, onOpenChange, leads, onUpdateLead }: CalendarDialogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleStatusUpdate = (lead: ProcessedLead, status: LeadStatus) => {
    onUpdateLead({ ...lead, leadStatus: status });
  }

  const PostMeetingActions = ({ lead }: { lead: ProcessedLead }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleStatusUpdate(lead, 'sale-made')}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Sale Made
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusUpdate(lead, 'closed-lost')} className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground">
          <XCircle className="mr-2 h-4 w-4" />
          Closed (Lost)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth),
    end: endOfWeek(lastDayOfMonth),
  });

  const scheduledMeetings = useMemo(() => leads.filter(
    (lead) => lead.leadStatus === 'meeting-scheduled' && lead.meetingTime
  ), [leads]);

  const getMeetingsForDay = (day: Date) => {
    return scheduledMeetings
      .filter((lead) => isSameDay(new Date(lead.meetingTime!), day))
      .sort((a, b) => new Date(a.meetingTime!).getTime() - new Date(b.meetingTime!).getTime());
  };

  const selectedDayMeetings = getMeetingsForDay(selectedDate);
  
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] md:h-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Meeting Calendar</DialogTitle>
          <DialogDescription>
            Here are your scheduled meetings. Click on a day to see the details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
            <div className="p-1">
                <header className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-lg font-semibold text-center w-36">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <Button variant="outline" size="icon" onClick={goToNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </header>
                <div className="grid grid-cols-7">
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                        <div key={day} className="text-center font-semibold text-muted-foreground p-2 text-xs">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {daysInMonth.map(day => {
                        const meetingsOnDay = getMeetingsForDay(day);
                        return (
                        <div 
                            key={day.toString()} 
                            className={cn(
                                "relative h-16 p-2 flex flex-col group border border-transparent rounded-md cursor-pointer hover:bg-muted/50",
                                !isSameMonth(day, currentDate) && "text-muted-foreground/40",
                                isSameDay(day, selectedDate) && "border-primary/50",
                            )}
                            onClick={() => setSelectedDate(day)}
                        >
                            <span className={cn(
                                "font-medium text-sm h-6 w-6 flex items-center justify-center rounded-full",
                                isSameDay(day, new Date()) && "border-2 border-primary"
                            )}>
                                {format(day, 'd')}
                            </span>
                            {meetingsOnDay.length > 0 && (
                                <div className="flex items-center justify-center mt-1">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
          <div className="overflow-y-auto pr-2">
            <Card className="bg-muted/30 border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">
                  Meetings for {format(selectedDate, 'MMMM do, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayMeetings.length > 0 ? (
                  <ul className="space-y-4">
                    {selectedDayMeetings
                      .map((lead) => (
                      <li key={lead.id} className="p-3 bg-card/80 rounded-lg flex items-start justify-between">
                        <div>
                            <p className="font-semibold">{lead.correctedBusinessName}</p>
                            {lead.ownerName && (
                                <div className="mt-1.5 inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                    <User className="h-3.5 w-3.5" />
                                    {lead.ownerName}
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground mt-1.5">
                            {format(new Date(lead.meetingTime!), 'p')}
                            </p>
                            <a href={`tel:${lead.correctedPhoneNumber}`} className="flex items-center gap-2 text-sm text-primary hover:underline mt-1">
                            <Phone className="h-3 w-3" />
                            {lead.correctedPhoneNumber}
                            </a>
                        </div>
                        <PostMeetingActions lead={lead} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No meetings scheduled for this day.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
