
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
const VISIBLE_INTERACTIONS_LIMIT = 7;

export default function SummaryPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [visibleInteractionsCount, setVisibleInteractionsCount] = useState(VISIBLE_INTERACTIONS_LIMIT);
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

  const otherInteractions = allLeads.filter(
    lead =>
      lead.leadStatus &&
      lead.leadStatus !== 'new' &&
      lead.leadStatus !== 'meeting-scheduled'
  );

  const handleShowMore = () => {
    setVisibleInteractionsCount(otherInteractions.length);
  };

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
                      <ul className="space-y-3 pt-2">
                        {scheduledMeetings.map(lead => (
                          <li key={lead.id} className="p-4 bg-muted/50 rounded-lg border">
                            <p className="font-semibold text-base">{lead.correctedBusinessName}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(lead.meetingTime!), 'PPP p')}
                            </p>
                            {lead.notes && (
                                <p className="text-sm text-foreground/80 italic mt-2 border-l-2 border-primary/20 pl-3">"{lead.notes}"</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No meetings scheduled.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="interactions">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-semibold">All Interactions ({otherInteractions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {otherInteractions.length > 0 ? (
                      <>
                        <ul className="space-y-3 pt-2">
                          {otherInteractions.slice(0, visibleInteractionsCount).map(lead => (
                            <li key={lead.id} className="p-4 bg-muted/50 rounded-lg border">
                              <div className="flex justify-between items-center">
                                  <p className="font-semibold text-base">{lead.correctedBusinessName}</p>
                                  <p className="text-sm text-muted-foreground capitalize">{lead.leadStatus?.replace('-', ' ')}</p>
                              </div>
                              {lead.notes && (
                                  <p className="text-sm text-foreground/80 italic mt-2 border-l-2 border-primary/20 pl-3">"{lead.notes}"</p>
                              )}
                            </li>
                          ))}
                        </ul>
                        {otherInteractions.length > visibleInteractionsCount && (
                          <div className="mt-4 text-center">
                            <Button variant="outline" onClick={handleShowMore}>
                              See More ({otherInteractions.length - visibleInteractionsCount} more)
                            </Button>
                          </div>
                        )}
                      </>
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
