'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Building, Globe, Edit, CalendarClock, PhoneOff, UserX, UserCheck } from 'lucide-react';
import type { ProcessedLead, LeadStatus } from '@/lib/types';
import { LeadInteractionDialog } from '@/components/lead-interaction-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const LEADS_KEY = 'leadsorter_leads';
const VIEWED_LEADS_COUNT_KEY = 'leadsorter_viewed_count';

export default function DashboardPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [dispensedLeads, setDispensedLeads] = useState<ProcessedLead[]>([]);
  const [viewedCount, setViewedCount] = useState(0);
  const [interactingLead, setInteractingLead] = useState<ProcessedLead | null>(null);

  useEffect(() => {
    // This effect runs only on the client side
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      setAllLeads(JSON.parse(storedLeads));
    }
    const storedCount = localStorage.getItem(VIEWED_LEADS_COUNT_KEY);
    if (storedCount) {
      setViewedCount(parseInt(storedCount, 10));
    }
  }, []);
  
  const getLeads = () => {
    const remainingLeads = allLeads.slice(viewedCount);
    const leadsToDispense = remainingLeads.slice(0, 20);
    setDispensedLeads(leadsToDispense);
    
    const newViewedCount = viewedCount + leadsToDispense.length;
    setViewedCount(newViewedCount);
    localStorage.setItem(VIEWED_LEADS_COUNT_KEY, newViewedCount.toString());
  };
  
  const resetProgress = () => {
    setViewedCount(0);
    setDispensedLeads([]);
    localStorage.setItem(VIEWED_LEADS_COUNT_KEY, '0');
  }

  const handleUpdateLeadStatus = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
    const newDispensedLeads = dispensedLeads.map(l => l.id === updatedLead.id ? updatedLead : l);

    setAllLeads(newAllLeads);
    setDispensedLeads(newDispensedLeads);
    localStorage.setItem(LEADS_KEY, JSON.stringify(newAllLeads));
    setInteractingLead(null);
  }

  const leadsRemaining = allLeads.length - viewedCount;

  const StatusDisplay = ({ lead }: { lead: ProcessedLead }) => {
    switch (lead.leadStatus) {
      case 'meeting-scheduled':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CalendarClock className="h-3 w-3 mr-1" />
            Meeting
            {lead.meetingTime && ` - ${format(new Date(lead.meetingTime), "PPp")}`}
          </Badge>
        );
      case 'not-interested':
        return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" /> Not Interested</Badge>
      case 'contacted':
        return <Badge variant="outline"><UserCheck className="h-3 w-3 mr-1" /> Contacted</Badge>
      case 'no-answer':
        return <Badge variant="outline"><PhoneOff className="h-3 w-3 mr-1" /> No Answer</Badge>
      default:
        return <Badge variant="outline">New</Badge>;
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8 max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Your Lead Dispenser</CardTitle>
              <CardDescription>
                Get your next batch of leads to contact. You have {leadsRemaining > 0 ? leadsRemaining : 0} leads remaining.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Button onClick={getLeads} disabled={leadsRemaining <= 0}>Get 20 Leads</Button>
                <Button variant="outline" onClick={resetProgress}>Reset Progress</Button>
              </div>

              {dispensedLeads.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Your 20 Leads for Today</h3>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Business</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dispensedLeads.map(lead => (
                                    <TableRow key={lead.id}>
                                        <TableCell>
                                            <div className="font-medium">{lead.correctedBusinessName}</div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Building className="h-4 w-4" />
                                                {lead.businessType}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <a href={`tel:${lead.correctedPhoneNumber}`} className="flex items-center gap-2 hover:text-primary">
                                                <Phone className="h-4 w-4" />
                                                {lead.correctedPhoneNumber}
                                            </a>
                                            {lead.correctedWebsite ? (
                                                <a href={lead.correctedWebsite.startsWith('http') ? lead.correctedWebsite : `https://${lead.correctedWebsite}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline hover:text-primary mt-1">
                                                    <Globe className="h-4 w-4" />
                                                    Visit Website
                                                </a>
                                            ) : <div className="text-muted-foreground mt-1 flex items-center gap-2"><Globe className="h-4 w-4" />N/A</div>}
                                        </TableCell>
                                        <TableCell>
                                            <StatusDisplay lead={lead} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => setInteractingLead(lead)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Log Interaction
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {interactingLead && (
        <LeadInteractionDialog
            lead={interactingLead}
            onSave={handleUpdateLeadStatus}
            onOpenChange={(isOpen) => !isOpen && setInteractingLead(null)}
        />
      )}

      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
