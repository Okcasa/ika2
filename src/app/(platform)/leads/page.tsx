'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Building, Globe, Edit, CalendarClock, PhoneOff, UserX, UserCheck, StickyNote, AlertTriangle, CalendarDays, TrendingUp, XCircle, RotateCcw, MoreHorizontal, User } from 'lucide-react';
import type { ProcessedLead } from '@/lib/types';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LeadInteractionForm } from '@/components/lead-interaction-form';
import { useToast } from '@/hooks/use-toast';
import { CalendarDialog } from '@/components/calendar-dialog';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LeadsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [dispensedLeads, setDispensedLeads] = useState<ProcessedLead[]>([]);
  const [interactingLead, setInteractingLead] = useState<ProcessedLead | null>(null);
  const [numLeads, setNumLeads] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setUserId(session.user.id);

      const leadsKey = `leadsorter_leads_${session.user.id}`;
      const dispensedKey = `leadsorter_dispensed_leads_${session.user.id}`;

      const storedLeads = localStorage.getItem(leadsKey);
      if (storedLeads) {
          setAllLeads(JSON.parse(storedLeads));
      }
      const storedDispensedLeads = localStorage.getItem(dispensedKey);
      if (storedDispensedLeads) {
          setDispensedLeads(JSON.parse(storedDispensedLeads));
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (userId && allLeads.length > 0) {
      localStorage.setItem(`leadsorter_leads_${userId}`, JSON.stringify(allLeads));
    }
  }, [allLeads, userId]);

  useEffect(() => {
    if (userId && dispensedLeads.length > 0) {
      localStorage.setItem(`leadsorter_dispensed_leads_${userId}`, JSON.stringify(dispensedLeads));
    }
  }, [dispensedLeads, userId]);

  const getLeads = (force = false) => {
    // Only verify we have leads to dispense from the purchased pool
    const newLeadsPool = allLeads.filter(l => l.leadStatus === 'new' || l.leadStatus === 'call-back' || l.leadStatus === 'no-answer');

    if (newLeadsPool.length === 0) {
        toast({
            title: "No leads available",
            description: "You have no new leads to work. Please visit the Shop to purchase more.",
            variant: "destructive"
        });
        return;
    }

    const newLeadsInDispenser = dispensedLeads.filter(l => l.leadStatus === 'new').length;

    if (newLeadsInDispenser > 0 && !force) {
      setShowAlert(true);
      return;
    }

    // Shuffle all new leads before slicing
    const shuffledNewLeads = [...newLeadsPool].sort(() => Math.random() - 0.5);

    const leadsToGet = Math.min(Math.max(numLeads, 1), 35, shuffledNewLeads.length);
    const leadsToDispense = shuffledNewLeads.slice(0, leadsToGet);

    const resetDispensed = leadsToDispense.map(l => ({ ...l }));

    setDispensedLeads(resetDispensed);
    setShowAlert(false);
  };

  const handleUpdateLeadStatus = (updatedLead: ProcessedLead) => {
    const newAllLeads = allLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
    setAllLeads(newAllLeads);
    setDispensedLeads(dispensedLeads.map(l => l.id === updatedLead.id ? updatedLead : l));

    setRecentlyUpdatedId(updatedLead.id);
    setTimeout(() => setRecentlyUpdatedId(null), 3000);
    setInteractingLead(null);
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
      case 'meeting-scheduled': return 'bg-green-500/10';
      case 'not-interested': return 'bg-red-500/10';
      case 'call-back': return 'bg-blue-500/10';
      case 'wrong-number': return 'bg-orange-500/10';
      case 'no-answer': return 'bg-gray-500/10';
      case 'sale-made': return 'bg-yellow-500/10';
      case 'closed-lost': return 'bg-red-600/10';
      default: return '';
    }
  };

  const PostMeetingActions = ({ lead }: { lead: ProcessedLead }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleUpdateLeadStatus({ ...lead, leadStatus: 'sale-made' })}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Sale Made
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpdateLeadStatus({ ...lead, leadStatus: 'closed-lost' })} className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground">
          <XCircle className="mr-2 h-4 w-4" />
          Closed (Lost)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const StatusDisplay = ({ lead }: { lead: ProcessedLead }) => {
    let statusComponent;
    switch (lead.leadStatus) {
      case 'meeting-scheduled':
        statusComponent = (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 h-auto rounded-md">
                <div className="flex flex-col items-start">
                  <div className="flex items-center">
                      <CalendarClock className="h-3 w-3 mr-1.5" />
                      Meeting Scheduled
                  </div>
                  {lead.meetingTime &&
                      <span className="text-xs font-normal mt-1.5">{format(new Date(lead.meetingTime), "PPp")}</span>
                  }
                </div>
            </Badge>
            <PostMeetingActions lead={lead} />
          </div>
        );
        break;
      case 'not-interested':
        statusComponent = <Badge variant="destructive"><UserX className="h-3 w-3 mr-1.5" /> Not Interested</Badge>;
        break;
      case 'no-answer':
        statusComponent = <Badge variant="outline"><PhoneOff className="h-3 w-3 mr-1.5" /> No Answer</Badge>;
        break;
      case 'call-back':
        statusComponent = <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20"><CalendarClock className="h-3 w-3 mr-1.5" /> Call Back</Badge>;
        break;
      case 'wrong-number':
        statusComponent = <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20"><PhoneOff className="h-3 w-3 mr-1.5" /> Wrong Number</Badge>;
        break;
      case 'sale-made':
        statusComponent = <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><TrendingUp className="h-3 w-3 mr-1.5" /> Sale Made</Badge>;
        break;
      case 'closed-lost':
        statusComponent = <Badge variant="destructive" className="bg-red-600/10 text-red-400 border-red-600/20"><XCircle className="h-3 w-3 mr-1.5" /> Closed (Lost)</Badge>;
        break;
      default:
        statusComponent = <Badge variant="outline">New</Badge>;
    }

    if (lead.notes && lead.leadStatus !== 'meeting-scheduled') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
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

  if (!userId) {
      return <div className="p-8 text-center text-muted-foreground">Loading workspace...</div>
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-0">
      <div className="flex items-center justify-between space-y-2">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">My Leads</h2>
            <p className="text-muted-foreground">
                Manage your active leads and log your interactions.
            </p>
        </div>
        <div className="flex items-center gap-2">
             <Button variant="outline" onClick={() => setIsCalendarOpen(true)}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Calendar
            </Button>
        </div>
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardHeader>
            <CardTitle>Lead Dispenser</CardTitle>
            <CardDescription>
            You have {leadsRemaining} new leads available to work.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-4 items-center">
                <div>
                <Input
                    type="number"
                    value={numLeads > 0 ? numLeads : ''}
                    onChange={(e) => {
                    let value = parseInt(e.target.value, 10);
                    if (isNaN(value)) { value = 0; }
                    else if (value > 35) { value = 35; }
                    setNumLeads(value);
                    }}
                    min="1"
                    max="35"
                    className="w-24 font-code"
                    placeholder="20"
                />
                </div>
                <Button onClick={() => getLeads(false)} disabled={leadsRemaining <= 0}>Get New Leads</Button>
            </div>

            {dispensedLeads.length > 0 && (
                <div className="mt-8">
                    <div className="border rounded-lg overflow-x-auto shadow-inner">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Business</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dispensedLeads.map((lead, index) => (
                                    <TableRow
                                        key={lead.id}
                                        className={cn(
                                            "transition-colors duration-500",
                                            recentlyUpdatedId === lead.id ? getGlowColor(lead.leadStatus) : 'bg-transparent'
                                        )}
                                    >
                                        <TableCell className="text-muted-foreground font-code">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="font-medium font-code">{lead.correctedBusinessName}</div>
                                            {lead.ownerName && (
                                                <div className="mt-1.5 inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                                    <User className="h-3.5 w-3.5" />
                                                    {lead.ownerName}
                                                </div>
                                            )}
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1.5">
                                                <Building className="h-4 w-4" />
                                                {lead.businessType}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <a href={`tel:${lead.correctedPhoneNumber}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:text-primary whitespace-nowrap font-code">
                                                    <Phone className="h-4 w-4" />
                                                    {lead.correctedPhoneNumber}
                                                </a>
                                                {lead.correctedWebsite ? (
                                                    <a href={lead.correctedWebsite.startsWith('http') ? lead.correctedWebsite : `https://${lead.correctedWebsite}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 underline hover:text-primary mt-1 font-code">
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
                                                Log
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
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
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
    </div>
  );
}
