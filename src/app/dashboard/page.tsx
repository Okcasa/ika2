'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Building, Globe, Edit, CalendarClock, PhoneOff, UserX, UserCheck, StickyNote, AlertTriangle, CalendarDays, TrendingUp, XCircle, RotateCcw, ArrowRight, TrendingDown, MoreHorizontal, BarChart, Users, Percent, ListTodo, Handshake, Sun, Moon, User } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LeadInteractionForm } from '@/components/lead-interaction-form';
import { Logo } from '@/components/logo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

const LEADS_KEY = 'leadsorter_leads';
const DISPENSED_LEADS_KEY = 'leadsorter_dispensed_leads';
const SESSION_START_KEY = 'leadsorter_session_start';
const THEME_KEY = 'leadsorter_theme';


export default function Dashboard() {
  const [allLeads, setAllLeads] = useState<ProcessedLead[]>([]);
  const [dispensedLeads, setDispensedLeads] = useState<ProcessedLead[]>([]);
  const [interactingLead, setInteractingLead] = useState<ProcessedLead | null>(null);
  const [numLeads, setNumLeads] = useState(20);
  const [showAlert, setShowAlert] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);
  const [theme, setTheme] = useState('light');
  const router = useRouter();
  const { toast } = useToast();

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

    // Theme
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

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
    setInteractingLead(null); // Close interaction dialog
  }
  
  const handleSelectLead = (lead: ProcessedLead) => {
    setInteractingLead(lead);
  }

  const leadsRemaining = allLeads.filter(l => l.leadStatus === 'new').length;
  
  const sessionStats = useMemo(() => {
    const totalInteractions = allLeads.filter(l => l.leadStatus !== 'new').length;
    const meetings = allLeads.filter(l => l.leadStatus === 'meeting-scheduled').length;
    const sales = allLeads.filter(l => l.leadStatus === 'sale-made').length;
    const notInterested = allLeads.filter(l => l.leadStatus === 'not-interested').length;
    const callBacks = allLeads.filter(l => l.leadStatus === 'call-back').length;
    const wrongNumbers = allLeads.filter(l => l.leadStatus === 'wrong-number').length;
    const contacted = allLeads.filter(l => l.leadStatus && !['new', 'no-answer', 'wrong-number'].includes(l.leadStatus)).length;
    
    const contactRate = totalInteractions > 0 ? (contacted / totalInteractions) * 100 : 0;
    
    return { meetings, sales, notInterested, contactRate, totalInteractions, callBacks, wrongNumbers };
  }, [allLeads]);
  
  const callBackLeads = useMemo(() => {
    return allLeads.filter(l => l.leadStatus === 'call-back');
  }, [allLeads]);

  const scheduledMeetings = useMemo(() => {
    return allLeads.filter(l => l.leadStatus === 'meeting-scheduled' && l.meetingTime);
  }, [allLeads]);

  const getGlowColor = (status?: string) => {
    switch (status) {
      case 'meeting-scheduled': return 'bg-green-100/50 dark:bg-green-900/20';
      case 'not-interested': return 'bg-red-100/50 dark:bg-red-900/20';
      case 'call-back': return 'bg-blue-100/50 dark:bg-blue-900/20';
      case 'wrong-number': return 'bg-orange-100/50 dark:bg-orange-900/20';
      case 'no-answer': return 'bg-gray-100/50 dark:bg-gray-700/20';
      case 'sale-made': return 'bg-yellow-100/50 dark:bg-yellow-900/20';
      case 'closed-lost': return 'bg-red-200/50 dark:bg-red-800/20';
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
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 h-auto rounded-md">
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
            <PostMeetingActions lead={lead} />
          </div>
        );
        break;
      case 'not-interested':
        statusComponent = <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" /> Not Interested</Badge>;
        break;
      case 'no-answer':
        statusComponent = <Badge variant="outline" className="text-gray-800 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700"><PhoneOff className="h-3 w-3 mr-1" /> No Answer</Badge>;
        break;
      case 'call-back':
        statusComponent = <Badge variant="outline" className="text-blue-800 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700"><CalendarClock className="h-3 w-3 mr-1" /> Call Back</Badge>;
        break;
      case 'wrong-number':
        statusComponent = <Badge variant="outline" className="text-orange-800 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-700"><PhoneOff className="h-3 w-3 mr-1" /> Wrong Number</Badge>;
        break;
      case 'sale-made':
        statusComponent = <Badge variant="outline" className="text-yellow-800 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700"><TrendingUp className="h-3 w-3 mr-1" /> Sale Made</Badge>;
        break;
      case 'closed-lost':
        statusComponent = <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"><XCircle className="h-3 w-3 mr-1" /> Closed (Lost)</Badge>;
        break;
      default:
        statusComponent = <Badge variant="outline">New</Badge>;
    }

    if (lead.notes && lead.leadStatus !== 'meeting-scheduled') {
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

  const CallBackQueueActions = ({ lead }: { lead: ProcessedLead }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSelectLead(lead)}>
          <Edit className="mr-2 h-4 w-4" />
          Log Interaction
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpdateLeadStatus({ ...lead, leadStatus: 'not-interested' })} className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground">
          <UserX className="mr-2 h-4 w-4" />
          Not Interested
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="flex-col md:flex">
        <div className="border-b">
            <div className="flex h-16 items-center px-4">
                <Logo className="h-6 w-6" />
                <h1 className="text-xl font-bold ml-2">LeadSorter</h1>
                <div className="ml-auto flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => router.push('/account')}>
                        <User className="h-5 w-5" />
                        <span className="sr-only">Account</span>
                    </Button>
                </div>
            </div>
        </div>
        <main className="flex-grow p-4 md:p-8">
            <div className="flex items-center justify-between space-y-2 mb-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Welcome back! Here's your workspace.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setIsStatsOpen(true)}>
                        <BarChart className="mr-2 h-4 w-4" />
                        View Stats
                    </Button>
                    <Button variant="outline" onClick={() => setIsCalendarOpen(true)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        View Calendar
                    </Button>
                </div>
            </div>

            <Card>
              <CardHeader>
                 <CardTitle>Your Lead Dispenser</CardTitle>
                 <CardDescription>
                    You have {leadsRemaining > 0 ? leadsRemaining : 0} new leads remaining to be dispensed.
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
                        if (isNaN(value)) {
                            value = 0;
                        } else if (value > 35) {
                            value = 35;
                        }
                        setNumLeads(value);
                      }}
                      min="1"
                      max="35"
                      className={cn(
                        "w-24 transition-all",
                        numLeads >= 35 && "ring-2 ring-destructive focus-visible:ring-destructive animate-shake"
                      )}
                      placeholder="20"
                    />
                     {numLeads >= 35 && (
                      <p className="text-xs text-destructive mt-1.5 animate-in fade-in">Limit: 35 at a time.</p>
                    )}
                  </div>
                  <Button onClick={() => getLeads(false)} disabled={leadsRemaining <= 0}>Get New Leads</Button>
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
                                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                          <TableCell>
                                              <div className="font-medium">{lead.correctedBusinessName}</div>
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

      <Sheet open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <SheetContent className="sm:max-w-md flex flex-col">
            <SheetHeader>
                <SheetTitle>Session Statistics</SheetTitle>
                <SheetDescription>
                    Here's a summary of your activity in this session.
                </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-grow">
              <div className="py-4 space-y-4 pr-6">
                  <div className="grid gap-4 text-sm">
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <ListTodo className="h-4 w-4" />
                              <span>Total Leads Remaining</span>
                          </div>
                          <span className="font-semibold">{leadsRemaining}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <Handshake className="h-4 w-4" />
                              <span>Total Interactions</span>
                          </div>
                          <span className="font-semibold">{sessionStats.totalInteractions}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <Percent className="h-4 w-4 text-blue-500" />
                              <span>Contact Rate</span>
                          </div>
                          <span className="font-semibold">{sessionStats.contactRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarClock className="h-4 w-4 text-green-500" />
                              <span>Meetings Scheduled</span>
                          </div>
                          <span className="font-semibold">{sessionStats.meetings}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <TrendingUp className="h-4 w-4 text-yellow-500" />
                              <span>Sales Made</span>
                          </div>
                          <span className="font-semibold">{sessionStats.sales}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <UserX className="h-4 w-4 text-red-500" />
                              <span>Not Interested</span>
                          </div>
                          <span className="font-semibold">{sessionStats.notInterested}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarDays className="h-4 w-4 text-blue-500" />
                              <span>Needs Call Back</span>
                          </div>
                          <span className="font-semibold">{sessionStats.callBacks}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                              <PhoneOff className="h-4 w-4 text-orange-500" />
                              <span>Wrong Numbers</span>
                          </div>
                          <span className="font-semibold">{sessionStats.wrongNumbers}</span>
                      </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="call-backs">
                          <AccordionTrigger>
                              <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-blue-500" />
                                  <span className="font-semibold">Call Back Queue ({callBackLeads.length})</span>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent>
                          {callBackLeads.length > 0 ? (
                              <ul className="space-y-3 pt-2">
                                  {callBackLeads.map(lead => (
                                  <li key={lead.id} className="p-3 bg-muted/50 rounded-lg border">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <p className="font-semibold">{lead.correctedBusinessName}</p>
                                              <a href={`tel:${lead.correctedPhoneNumber}`} className="flex items-center gap-2 text-sm text-primary hover:underline mt-1">
                                                  <Phone className="h-3 w-3" />
                                                  {lead.correctedPhoneNumber}
                                              </a>
                                          </div>
                                          <CallBackQueueActions lead={lead} />
                                      </div>
                                  </li>
                                  ))}
                              </ul>
                          ) : (
                              <p className="text-muted-foreground text-center py-4 text-sm">No leads in the call back queue.</p>
                          )}
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
              </div>
            </ScrollArea>
        </SheetContent>
      </Sheet>

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
