'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Calendar, FileText, StickyNote } from 'lucide-react';
import type { ProcessedLead } from '@/lib/types';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const LEADS_KEY = 'leadsorter_leads';

export default function SummaryPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const router = useRouter();

  useEffect(() => {
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      setAllLeads(JSON.parse(storedLeads));
    }
  }, []);

  const scheduledMeetings = allLeads
    .filter(lead => lead.leadStatus === 'meeting-scheduled' && lead.meetingTime)
    .sort((a, b) => new Date(a.meetingTime!).getTime() - new Date(b.meetingTime!).getTime());

  const leadsWithNotes = allLeads.filter(lead => lead.notes && lead.notes.trim() !== '');

  const otherInteractions = allLeads.filter(
    lead =>
      lead.leadStatus &&
      lead.leadStatus !== 'new' &&
      lead.leadStatus !== 'meeting-scheduled' &&
      (!lead.notes || lead.notes.trim() === '')
  );

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>A complete overview of all your lead interactions.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full" defaultValue="meetings">
                <AccordionItem value="meetings">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Scheduled Meetings ({scheduledMeetings.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {scheduledMeetings.length > 0 ? (
                      <ul className="space-y-2 pt-2">
                        {scheduledMeetings.map(lead => (
                          <li key={lead.id} className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{lead.correctedBusinessName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(lead.meetingTime!), 'PPP p')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No meetings scheduled.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="notes">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Leads with Notes ({leadsWithNotes.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {leadsWithNotes.length > 0 ? (
                      <ul className="space-y-3 pt-2">
                        {leadsWithNotes.map(lead => (
                          <li key={lead.id} className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{lead.correctedBusinessName}</p>
                            <p className="text-sm text-muted-foreground italic">"{lead.notes}"</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No leads have notes yet.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="interactions">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Other Interactions ({otherInteractions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {otherInteractions.length > 0 ? (
                      <ul className="space-y-2 pt-2">
                        {otherInteractions.map(lead => (
                          <li key={lead.id} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                            <p className="font-medium">{lead.correctedBusinessName}</p>
                            <p className="text-sm text-muted-foreground capitalize">{lead.leadStatus?.replace('-', ' ')}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No other interactions logged.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
