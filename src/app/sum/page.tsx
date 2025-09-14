
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Calendar, TrendingUp, XCircle, FileText } from 'lucide-react';
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
  
  const salesMade = allLeads.filter(
    lead => lead.leadStatus === 'sale-made' || lead.leadStatus === 'client'
  );

  const closedLost = allLeads.filter(lead => lead.leadStatus === 'closed-lost');

  const otherInteractions = allLeads.filter(
    lead =>
      lead.leadStatus &&
      lead.leadStatus !== 'new' &&
      lead.leadStatus !== 'meeting-scheduled' &&
      lead.leadStatus !== 'sale-made' &&
      lead.leadStatus !== 'client' &&
      lead.leadStatus !== 'closed-lost'
  );


  const handleShowMore = () => {
    setVisibleInteractionsCount(otherInteractions.length);
  };

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return 'Unknown';
    switch (status) {
        case 'sale-made': return 'Sale Made';
        case 'closed-lost': return 'Closed (Lost)';
        default: return status.replace(/-/g, ' ');
    }
  }

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
                
                <AccordionItem value="sales-made">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <span className="font-semibold">Sales Made ({salesMade.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {salesMade.length > 0 ? (
                      <ul className="space-y-3 pt-2">
                        {salesMade.map(lead => (
                          <li key={lead.id} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="font-semibold text-base">{lead.correctedBusinessName}</p>
                            <p className="text-sm capitalize text-green-600 font-medium mt-1">
                              {getStatusLabel(lead.leadStatus)}
                            </p>
                             {lead.notes && (
                                <p className="text-sm text-foreground/80 italic mt-2 border-l-2 border-green-500/20 pl-3">"{lead.notes}"</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No sales have been marked as made yet.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="closed-lost">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-semibold">Closed (Lost) ({closedLost.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {closedLost.length > 0 ? (
                      <ul className="space-y-3 pt-2">
                        {closedLost.map(lead => (
                          <li key={lead.id} className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                            <p className="font-semibold text-base">{lead.correctedBusinessName}</p>
                             {lead.notes && (
                                <p className="text-sm text-foreground/80 italic mt-2 border-l-2 border-red-500/20 pl-3">"{lead.notes}"</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No leads have been marked as lost.</p>
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
                      <>
                        <ul className="space-y-3 pt-2">
                          {otherInteractions.slice(0, visibleInteractionsCount).map(lead => (
                            <li key={lead.id} className="p-4 bg-muted/50 rounded-lg border">
                              <div className="flex justify-between items-center">
                                  <p className="font-semibold text-base">{lead.correctedBusinessName}</p>
                                  <p className="text-sm text-muted-foreground capitalize">{getStatusLabel(lead.leadStatus)}</p>
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
