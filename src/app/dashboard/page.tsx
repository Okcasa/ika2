'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Building, Globe, Edit, CalendarClock, PhoneOff, UserX, UserCheck, StickyNote, AlertTriangle, CalendarDays } from 'lucide-react';
import type { ProcessedLead } from '@/lib/types';
import { LeadInteractionDialog } from '@/components/lead-interaction-dialog';
import { CalendarDialog } from '@/components/calendar-dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const LEADS_KEY = 'leadsorter_leads';

export default function DashboardPage() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [dispensedLeads, setDispensedLeads] = useState<ProcessedLead[]>([]);
  const [interactingLead, setInteractingLead] = useState<ProcessedLead | null>(null);
  const [numLeads, setNumLeads] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      setAllLeads(JSON.parse(storedLeads));
    }
  }, []);
  
  const getLeads = (force = false) => {
    const newLeadsInDispenser = dispensedLeads.filter(l => !l.leadStatus || l.leadStatus === 'new').length;

    if (newLeadsInDispenser > 0 && !force) {
      setShowAlert(true);
      return;
    }
    
    const leadsToGet = Math.min(Math.max(numLeads, 1), 35);
    const availableLeads = allLeads.filter(l => !l.leadStatus || l.leadStatus === 'new');
    const leadsToDispense = availableLeads.slice(0, leadsToGet);
    
    setDispensedLeads(leadsToDispense);
    setShowAlert(false);
  };
  
  const resetProgress = () => {
    setDispensedLeads([]);
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      const parsedLeads: ProcessedLead[] = JSON.parse(storedLeads);
      const resetLeads = parsedLeads.map(l => ({ ...l, leadStatus: 'new' as const, notes: undefined, meetingTime: undefined }));
      setAllLeads(resetLeads);
      localStorage.setItem(LEADS_KEY, JSON.stringify(resetLeads));
    }
  }

  const handleUpdateLeadStatus = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
    
    setAllLeads(newAllLeads);
    // Remove the updated lead from the dispensed list if its status is no longer 'new'
    if (updatedLead.leadStatus && updatedLead.leadStatus !== 'new') {
        setDispensedLeads(dispensedLeads.filter(l => l.id !== updatedLead.id));
    } else {
        setDispensedLeads(dispensedLeads.map(l => l.id === updatedLead.id ? updatedLead : l));
    }

    localStorage.setItem(LEADS_KEY, JSON.stringify(newAllLeads));
    setInteractingLead(null);
  }

  const leadsRemaining = allLeads.filter(l => !l.leadStatus || l.leadStatus === 'new').length;
  
  const scheduledMeetings = useMemo(() => {
    return allLeads.filter(l => l.leadStatus === 'meeting-scheduled' && l.meetingTime);
  }, [allLeads]);

  
  const StatusDisplay = ({ lead }: { lead: ProcessedLead }) => {
    let statusComponent;
    switch (lead.leadStatus) {
      case 'meeting-scheduled':
        statusComponent = (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 h-auto rounded-md">
            <div className="flex flex-col items-start">
              <div className="flex items-center">
                <CalendarClock className="h-3 w-3 mr-1" />
                Meeting
              </div>
              {lead.meetingTime && 
                <span className="text-xs font-normal mt-1">{format(new Date(lead.meetingTime), "PPp")}</span>
              }
            </div>
          </Badge>
        );
        break;
      case 'not-interested':
        statusComponent = <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" /> Not Interested</Badge>;
        break;
      case 'contacted':
        statusComponent = <Badge variant="outline"><UserCheck className="h-3 w-3 mr-1" /> Contacted</Badge>;
        break;
      case 'no-answer':
        statusComponent = <Badge variant="outline"><PhoneOff className="h-3 w-3 mr-1" /> No Answer</Badge>;
        break;
      case 'call-back':
        statusComponent = <Badge variant="outline" className="text-blue-800 bg-blue-50 border-blue-200">Call Back</Badge>;
        break;
      case 'wrong-number':
        statusComponent = <Badge variant="outline" className="text-orange-800 bg-orange-50 border-orange-200">Wrong Number</Badge>;
        break;
      default:
        statusComponent = <Badge variant="outline">New</Badge>;
    }

    if (lead.notes) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                {statusComponent}
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{lead.notes}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return statusComponent;
  };


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Header />
        <div className="mt-8 max-w-7xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Lead Dispenser</CardTitle>
                <CardDescription>
                  Get your next batch of leads to contact. You have {leadsRemaining > 0 ? leadsRemaining : 0} new leads remaining.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setIsCalendarOpen(true)}>
                <CalendarDays className="h-4 w-4 mr-2" />
                View Calendar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className='flex items-center gap-2'>
                  <Input
                    type="number"
                    value={numLeads}
                    onChange={(e) => setNumLeads(parseInt(e.target.value, 10))}
                    min="1"
                    max="35"
                    className="w-24"
                    placeholder="20"
                  />
                  <Button onClick={() => getLeads(false)} disabled={leadsRemaining <= 0}>Get New Leads</Button>
                </div>
                <Button variant="outline" onClick={resetProgress}>Reset Session</Button>
              </div>

              {dispensedLeads.length > 0 && (
                 <div className="mt-8">
                    <div className="border rounded-lg overflow-x-auto">
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
                                            <a href={`tel:${lead.correctedPhoneNumber}`} className="flex items-center gap-2 hover:text-primary whitespace-nowrap">
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

      <CalendarDialog 
        isOpen={isCalendarOpen} 
        onOpenChange={setIsCalendarOpen}
        leads={scheduledMeetings}
      />

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You still have uncontacted leads in your current list. Are you sure you want to get new leads and leave these behind for now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => getLeads(true)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
