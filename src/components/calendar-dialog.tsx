'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessedLead, LeadStatus } from '@/lib/types';
import { Phone, MoreHorizontal, TrendingUp, XCircle, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface CalendarDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leads: ProcessedLead[];
  onUpdateLead: (lead: ProcessedLead) => void;
}

export function CalendarDialog({ isOpen, onOpenChange, leads, onUpdateLead }: CalendarDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const meetingsByDay = leads.reduce((acc, lead) => {
    if (lead.meetingTime) {
      const day = format(new Date(lead.meetingTime), 'yyyy-MM-dd');
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(lead);
    }
    return acc;
  }, {} as Record<string, ProcessedLead[]>);

  const selectedDayMeetings = date ? meetingsByDay[format(date, 'yyyy-MM-dd')] || [] : [];
  
  const meetingDays = Object.keys(meetingsByDay).map(day => new Date(day));

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
        <DropdownMenuItem onClick={() => handleStatusUpdate(lead, 'closed-lost')} className="text-destructive focus:bg-destructive">
          <XCircle className="mr-2 h-4 w-4" />
          Closed (Lost)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Meeting Calendar</DialogTitle>
          <DialogDescription>
            Here are your scheduled meetings. Click on a day to see the details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
          <div className="flex justify-center items-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              modifiers={{
                meeting: meetingDays,
              }}
              modifiersClassNames={{
                meeting: 'bg-primary/20 text-primary-foreground',
              }}
            />
          </div>
          <div className="overflow-y-auto pr-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Meetings for {date ? format(date, 'PPP') : '...'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayMeetings.length > 0 ? (
                  <ul className="space-y-4">
                    {selectedDayMeetings
                      .sort((a, b) => new Date(a.meetingTime!).getTime() - new Date(b.meetingTime!).getTime())
                      .map((lead) => (
                      <li key={lead.id} className="p-3 bg-muted/50 rounded-lg flex items-start justify-between">
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

    