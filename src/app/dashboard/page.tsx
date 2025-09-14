'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Building, Globe, Edit, CalendarClock, PhoneOff, UserX, UserCheck, StickyNote, AlertTriangle, CalendarDays, TrendingUp, XCircle, RotateCcw } from 'lucide-react';
import type { ProcessedLead, LeadStatus } from '@/lib/types';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LeadInteractionForm } from '@/components/lead-interaction-form';
import { Logo } from '@/components/logo';

const LEADS_KEY = 'leadsorter_leads';
const DISPENSED_LEADS_KEY = 'leadsorter_dispensed_leads';
const SESSION_START_KEY = 'leadsorter_session_start';


export default function Dashboard() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [dispensedLeads, setDispensedLeads] = useState<ProcessedLead[]>([]);
  const [interactingLead, setInteractingLead] = useState<ProcessedLead | null>(null);
  const [numLeads, setNumLeads] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
        setAllLeads(JSON.parse(storedLeads));
    }
    const storedDispensedLeads = localStorage.getItem(DISPENSED_LEADS_KEY);
    if (storedDispensedLeads) {
        setDispensedLeads(JSON.parse(storedDispensedLeads));
    }
    // Init session timer
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    if (allLeads.length > 0) {
      localStorage.setItem(LEADS_KEY, JSON.stringify(allLeads));
    }
  }, [allLeads]);
  
  useEffect(() => {
    if (dispensedLeads.length > 0) {
      localStorage.setItem(DISPENSED_LEADS_KEY, JSON.stringify(dispensedLeads));
    }
  }, [dispensedLeads]);
  
  const getLeads = (force = false) => {
    const newLeadsInDispenser = dispensedLeads.filter(l => l.leadStatus === 'new').length;

    if (newLeadsInDispenser > 0 && !force) {
      setShowAlert(true);
      return;
    }
    
    // Shuffle all new leads before slicing
    const shuffledNewLeads = allLeads
        .filter(lead => lead.leadStatus === 'new' || lead.leadStatus === 'call-back' || lead.leadStatus === 'no-answer')
        .sort(() => Math.random() - 0.5);

    const otherLeads = allLeads.filter(lead => lead.leadStatus !== 'new' && lead.leadStatus !== 'call-back' && lead.leadStatus !== 'no-answer');

    const leadsToGet = Math.min(Math.max(numLeads, 1), 35);
    const leadsToDispense = shuffledNewLeads.slice(0, leadsToGet);
    
    // Set all dispensed leads to 'new' status, so they can be recycled if not contacted
    const resetDispensed = leadsToDispense.map(l => ({ ...l, leadStatus: 'new' as const }));

    setDispensedLeads(resetDispensed);
    // Keep rest of the leads as they are
    const remainingLeads = shuffledNewLeads.slice(leadsToGet);
    setAllLeads([...otherLeads, ...remainingLeads, ...resetDispensed]);
    
    setShowAlert(false);
  };
  
  const resetProgress = () => {
    const isConfirmed = window.confirm("Are you sure you want to reset your session? This will clear your current dispenser and reset all lead statuses to 'new'. This action cannot be undone.");
    if (isConfirmed) {
      setDispensedLeads([]);
      localStorage.removeItem(DISPENSED_LEADS_KEY);
      localStorage.removeItem(SESSION_START_KEY);
      const storedLeads = localStorage.getItem(LEADS_KEY);
      if (storedLeads) {
        const parsedLeads: ProcessedLead[] = JSON.parse(storedLeads);
        const resetLeads = parsedLeads.map(l => ({ ...l, leadStatus: 'new' as const, notes: undefined, meetingTime: undefined }));
        setAllLeads(resetLeads);
        localStorage.setItem(LEADS_KEY, JSON.stringify(resetLeads));
      }
      window.location.reload();
    }
  }

  const handleUpdateLeadStatus = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
    setAllLeads(newAllLeads);
    
    setDispensedLeads(dispensedLeads.map(l => l.id === updatedLead.id ? updatedLead : l));

    setRecentlyUpdatedId(updatedLead.id);
    setTimeout(() => setRecentlyUpdatedId(null), 3000);
    setInteractingLead(null); // Close dialog
  }
  
  const handleSelectLead = (lead: ProcessedLead) => {
    setInteractingLead(lead);
  }

  const leadsRemaining = allLeads.filter(l => l.leadStatus === 'new').length;
  
  const scheduledMeetings = useMemo(() => {
    return allLeads.filter(l => l.leadStatus === 'meeting-scheduled' && l.meetingTime);
  }, [allLeads]);

  const getGlowColor = (status?: string) => {
    switch (status) {
      case 'meeting-scheduled': return 'bg-green-100/50';
      case 'interested': return 'bg-purple-100/50';
      case 'not-interested': return 'bg-red-100/50';
      case 'call-back': return 'bg-blue-100/50';
      case 'wrong-number': return 'bg-orange-100/50';
      case 'no-answer': return 'bg-gray-100/50';
      case 'sale-made': return 'bg-yellow-100/50';
      case 'closed-lost': return 'bg-red-200/50';
      default: return '';
    }
  };
  
  const StatusDisplay = ({ lead }: { lead: ProcessedLead }) => {
    let statusComponent;
    switch (lead.leadStatus) {
      case 'meeting-scheduled':
        statusComponent = (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 h-auto rounded-md">
            <div className="flex flex-col items-start">
              <div className="flex items-center">
                <CalendarClock className="h-3 w-3 mr-1" />
                Meeting Scheduled
              </div>
              {lead.meetingTime && 
                <span className="text-xs font-normal mt-1">{format(new Date(lead.meetingTime), "PPp")}</span>
              }
            </div>
          </Badge>
        );
        break;
      case 'interested':
        statusComponent = <Badge variant="outline" className="text-purple-800 bg-purple-50 border-purple-200"><UserCheck className="h-3 w-3 mr-1" /> Interested</Badge>;
        break;
      case 'not-interested':
        statusComponent = <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" /> Not Interested</Badge>;
        break;
      case 'contacted':
        statusComponent = <Badge variant="outline"><UserCheck className="h-3 w-3 mr-1" /> Contacted</Badge>;
        break;
      case 'no-answer':
        statusComponent = <Badge variant="outline" className="text-gray-800 bg-gray-50 border-gray-200"><PhoneOff className="h-3 w-3 mr-1" /> No Answer</Badge>;
        break;
      case 'call-back':
        statusComponent = <Badge variant="outline" className="text-blue-800 bg-blue-50 border-blue-200"><CalendarClock className="h-3 w-3 mr-1" /> Call Back</Badge>;
        break;
      case 'wrong-number':
        statusComponent = <Badge variant="outline" className="text-orange-800 bg-orange-50 border-orange-200"><PhoneOff className="h-3 w-3 mr-1" /> Wrong Number</Badge>;
        break;
      case 'sale-made':
        statusComponent = <Badge variant="outline" className="text-yellow-800 bg-yellow-50 border-yellow-200"><TrendingUp className="h-3 w-3 mr-1" /> Sale Made</Badge>;
        break;
      case 'closed-lost':
        statusComponent = <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Closed (Lost)</Badge>;
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
    <>
      <div className="flex-col md:flex">
        <div className="border-b">
            <div className="flex h-16 items-center px-4">
                <Logo className="h-6 w-6" />
                <h1 className="text-xl font-bold ml-2">LeadSorter</h1>
                <div className="ml-auto flex items-center space-x-4">
                </div>
            </div>
        </div>
        <main className="flex-grow p-4 md:p-8">
            <div className="flex items-center justify-between space-y-2 mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Your Lead Dispenser</h2>
                    <p className="text-muted-foreground">
                        You have {leadsRemaining > 0 ? leadsRemaining : 0} new leads remaining to be dispensed.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setIsCalendarOpen(true)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        View Calendar
                    </Button>
                </div>
            </div>

            <Card>
              <CardContent className="pt-6">
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
                  <Button variant="outline" onClick={resetProgress}>
                    <RotateCcw className="mr-2 h-4 w-4"/>
                    Reset Session
                  </Button>
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
                                      <TableRow 
                                          key={lead.id}
                                          className={cn(
                                              "transition-colors duration-500",
                                              recentlyUpdatedId === lead.id ? getGlowColor(lead.leadStatus) : 'bg-transparent'
                                          )}
                                      >
                                          <TableCell>
                                              <div className="font-medium">{lead.correctedBusinessName}</div>
                                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                  <Building className="h-4 w-4" />
                                                  {lead.businessType}
                                              </div>
                                          </TableCell>
                                          <TableCell>
                                              <div className="flex flex-col">
                                                  <a href={`tel:${lead.correctedPhoneNumber}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:text-primary whitespace-nowrap">
                                                      <Phone className="h-4 w-4" />
                                                      {lead.correctedPhoneNumber}
                                                  </a>
                                                  {lead.correctedWebsite ? (
                                                      <a href={lead.correctedWebsite.startsWith('http') ? lead.correctedWebsite : `https://${lead.correctedWebsite}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 underline hover:text-primary mt-1">
                                                          <Globe className="h-4 w-4" />
                                                          Visit Website
                                                      </a>
                                                  ) : <div className="text-muted-foreground mt-1 flex items-center gap-2"><Globe className="h-4 w-4" />N/A</div>}
                                              </div>
                                          </TableCell>
                                          <TableCell>
                                              <StatusDisplay lead={lead} />
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <Button variant="outline" size="sm" onClick={() => handleSelectLead(lead)}>
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
        </main>
      </div>
      
      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} LeadSorter. All rights reserved.</p>
      </footer>

      <CalendarDialog 
        isOpen={isCalendarOpen} 
        onOpenChange={setIsCalendarOpen}
        leads={scheduledMeetings}
        onUpdateLead={handleUpdateLeadStatus}
      />

      {interactingLead && (
        <Dialog open={!!interactingLead} onOpenChange={(isOpen) => !isOpen && setInteractingLead(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Interaction: {interactingLead.correctedBusinessName}</DialogTitle>
                    <DialogDescription>
                        Update the lead status and add any relevant notes from your call.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <LeadInteractionForm lead={interactingLead} onSave={handleUpdateLeadStatus} />
                </div>
            </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You still have uncontacted leads in your current list. Are you sure you want to get new leads and leave these behind for now? They will be returned to the pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => getLeads(true)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
