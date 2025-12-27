'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Phone, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Building2,
  History as HistoryIcon,
  MoreHorizontal,
  User,
  Search,
  ChevronRight,
  ArrowLeft,
  Plus,
  Folder,
  Tag,
  Clock,
  X,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Storage Keys
const LEADS_STORAGE_KEY = 'ika_leads_data';
const GROUPS_STORAGE_KEY = 'ika_custom_groups';

// Initial Mock Data
const DEFAULT_LEADS = [
  {
    id: '1',
    businessName: 'Apex Roofing Solutions',
    contactName: 'David Miller',
    email: 'david@apexroofing.com',
    phone: '(555) 123-4567',
    address: '123 Market St, Austin, TX 78701',
    status: 'In Progress',
    scheduledDate: 'Dec 26, 5:23 PM',
    lastContact: '2 days ago',
    avatar: 'AR',
    groups: ['Priority'],
    history: [
      { id: 101, type: 'call', result: 'No Answer', date: 'Mar 24, 2:30 PM', note: 'Tried calling, left voicemail.' },
      { id: 102, type: 'email', result: 'Sent', date: 'Mar 22, 10:15 AM', note: 'Sent introductory packet.' }
    ]
  },
  {
    id: '2',
    businessName: 'TechNova Systems',
    contactName: 'Sarah Jenkins',
    email: 's.jenkins@technova.io',
    phone: '(555) 987-6543',
    address: '450 Innovation Dr, San Jose, CA',
    status: 'New',
    scheduledDate: '-',
    lastContact: 'Never',
    avatar: 'TN',
    groups: [],
    history: []
  },
  {
    id: '3',
    businessName: 'GreenLeaf Landscaping',
    contactName: 'Mike Ross',
    email: 'mike@greenleaf.net',
    phone: '(555) 456-7890',
    address: '88 Garden Way, Portland, OR',
    status: 'Follow Up',
    scheduledDate: '-',
    lastContact: '1 week ago',
    avatar: 'GL',
    groups: ['Call Back Friday'],
    history: []
  }
];

const DEFAULT_GROUPS = ['Priority', 'Call Back Friday', 'Difficult Time'];

function LogsPageContent() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('14:00');
  const [selectedConclusion, setSelectedConclusion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Use a debounced search term to prevent lagging while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Leads & Groups State
  const [leads, setLeads] = useState<any[]>([]);
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState('All Leads');
  const [newGroupName, setNewGroupName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<{leadId: string, logId: number} | null>(null);
  const { toast } = useToast();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load from Storage Optimized
  useEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const savedLeads = localStorage.getItem(LEADS_STORAGE_KEY);
          const savedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
          
          if (savedLeads) {
            setLeads(JSON.parse(savedLeads));
          } else {
            setLeads(DEFAULT_LEADS);
            localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(DEFAULT_LEADS));
          }

          if (savedGroups) {
            setCustomGroups(JSON.parse(savedGroups));
          } else {
            setCustomGroups(DEFAULT_GROUPS);
            localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));
          }
        } catch (e) {
          console.error("Failed to load logs data", e);
        }
      }, 0);
    });
  }, []);

  const activeLead = leads.find(l => l.id === selectedLeadId);

    const conclusions = [
      { id: 'scheduled', label: 'Meeting Scheduled', icon: CalendarIcon, color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { id: 'interested', label: 'Interested', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' },
      { id: 'not-interested', label: 'Not Interested', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' },
      { id: 'no-answer', label: 'No Answer', icon: Phone, color: 'bg-orange-100 text-orange-700 border-orange-200' },
      { id: 'closed', label: 'Closed Deal', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { id: 'lost', label: 'Deal Lost', icon: XCircle, color: 'bg-stone-100 text-stone-700 border-stone-200' },
    ];

    const handleSelectConclusion = (id: string) => {
      setSelectedConclusion(id);
      if (id === 'scheduled') {
        setIsCalendarOpen(true);
      } else {
        setIsCalendarOpen(false); // Close calendar if another option is selected
      }
    };

    const handleSaveLog = () => {
      if (!selectedLeadId || !selectedConclusion) {
        toast({
          title: "Error",
          description: "Please select an outcome before saving.",
          variant: "destructive"
        });
        return;
      }

      const conclusionObj = conclusions.find(c => c.id === selectedConclusion);
    const now = new Date();
    const logDate = format(now, 'MMM d, h:mm a');
    const timestamp = now.toISOString(); // For analytics
    
    // Format scheduled time into 12h format
    let scheduledStr = null;
    if (selectedConclusion === 'scheduled' && date) {
      const [hours, minutes] = time.split(':');
      const dateWithTime = new Date(date);
      dateWithTime.setHours(parseInt(hours), parseInt(minutes));
      scheduledStr = format(dateWithTime, 'MMM d, h:mm a');
    }

    const isDealOutcome = selectedConclusion === 'closed' || selectedConclusion === 'lost';
    const dealAmount = isDealOutcome ? note : null; // In deal outcome, 'note' is the amount input

    const newEntry = {
      id: Date.now(),
      type: selectedConclusion === 'scheduled' ? 'meeting' : 'call',
      result: conclusionObj?.label || 'Interaction',
      date: logDate,
      timestamp: timestamp,
      note: isDealOutcome ? (dealAmount ? `Amount: $${dealAmount}` : 'No amount added') : (note || 'No notes added.')
    };

    const leadToUpdate = leads.find(l => l.id === selectedLeadId);
    if (!leadToUpdate) return;

    const updatedLeads = leads.map(lead => {
      if (lead.id === selectedLeadId) {
        let newColor = lead.color;
        let newValue = lead.value;

        // Update color and value based on new status
        const newStatus = conclusionObj?.label || lead.status;
        
        // Map to internal leadStatus if possible
        let newLeadStatus = lead.leadStatus;
        if (selectedConclusion === 'scheduled') newLeadStatus = 'meeting-scheduled';
        else if (selectedConclusion === 'not-interested') newLeadStatus = 'not-interested';
        else if (selectedConclusion === 'no-answer') newLeadStatus = 'no-answer';
        else if (selectedConclusion === 'closed') newLeadStatus = 'sale-made';
        else if (selectedConclusion === 'lost') newLeadStatus = 'closed-lost';
        // 'interested' doesn't have a direct map in standard types, keep as is or map to something else

        switch(newStatus) {
          case 'Not Interested': newColor = 'bg-red-100 text-red-700'; break;
          case 'Interested': newColor = 'bg-blue-100 text-blue-700'; break;
          case 'Meeting Scheduled': newColor = 'bg-purple-100 text-purple-700'; break;
          case 'Closed Deal': 
            newColor = 'bg-green-100 text-green-700';
            if (dealAmount) newValue = `$${parseFloat(dealAmount).toLocaleString()}`;
            break;
          case 'Deal Lost': 
            newColor = 'bg-stone-100 text-stone-700';
            if (dealAmount) newValue = `$${parseFloat(dealAmount).toLocaleString()}`;
            break;
          case 'No Answer': newColor = 'bg-amber-100 text-amber-700'; break;
        }
          
          return {
            ...lead,
            status: newStatus,
            leadStatus: newLeadStatus,
            scheduledDate: scheduledStr || lead.scheduledDate,
            value: newValue,
            color: newColor,
            lastContact: 'Just now',
            history: [newEntry, ...(lead.history || [])]
          };
        }
        return lead;
      });

      setLeads(updatedLeads);
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

      toast({
        title: "Interaction Logged",
        description: scheduledStr 
          ? `Meeting scheduled for ${scheduledStr}` 
          : `Saved log for ${leadToUpdate.businessName || leadToUpdate.correctedBusinessName || leadToUpdate.name || 'Lead'}`,
      });

    // Reset Form
    setSelectedConclusion(null);
    setNote('');
  };

  // Memoize filtered leads for performance
  const filteredLeads = leads.filter(lead => {
    const lowerSearch = debouncedSearch.toLowerCase();
    const matchesSearch = (lead.businessName || '').toLowerCase().includes(lowerSearch) || 
                          (lead.contactName || '').toLowerCase().includes(lowerSearch);
    const matchesGroup = activeGroup === 'All Leads' || (lead.groups && lead.groups.includes(activeGroup));
    return matchesSearch && matchesGroup;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleCreateGroup = () => {
    if (newGroupName && !customGroups.includes(newGroupName)) {
      const updatedGroups = [...customGroups, newGroupName];
      setCustomGroups(updatedGroups);
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updatedGroups));
      setNewGroupName('');
      setDialogOpen(false);
      toast({
        title: "Category Created",
        description: `'${newGroupName}' added to your groups.`
      });
    }
  };

  const initiateDeleteLog = (e: React.MouseEvent, leadId: string, logId: number) => {
    e.stopPropagation();
    setLogToDelete({ leadId, logId });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLog = () => {
    if (!logToDelete) return;

    const { leadId, logId } = logToDelete;
    
    const updatedLeads = leads.map(lead => {
      if (lead.id === leadId) {
        // Filter out the log
        const newHistory = lead.history.filter((log: any) => log.id !== logId);
        
        // Recalculate state from remaining history
        let newStatus = 'New';
        let newLeadStatus = 'new';
        let newColor = 'bg-stone-100 text-stone-600';
        let newValue = undefined;
        let newScheduledDate = '-';
        let newLastContact = 'Never';

        if (newHistory.length > 0) {
          const latestLog = newHistory[0]; // Assuming index 0 is latest
          newLastContact = latestLog.date; // Or calculate '2 days ago' etc. if feasible, but date string is fine
          
          switch(latestLog.result) {
            case 'Meeting Scheduled':
              newStatus = 'Meeting Scheduled';
              newLeadStatus = 'meeting-scheduled';
              newColor = 'bg-purple-100 text-purple-700';
              // Ideally parse scheduled date from note or log if stored, otherwise reset or keep
              break;
            case 'Interested':
              newStatus = 'Interested';
              newLeadStatus = 'new'; // or interested
              newColor = 'bg-blue-100 text-blue-700';
              break;
            case 'Not Interested':
              newStatus = 'Not Interested';
              newLeadStatus = 'not-interested';
              newColor = 'bg-red-100 text-red-700';
              break;
            case 'No Answer':
              newStatus = 'No Answer';
              newLeadStatus = 'no-answer';
              newColor = 'bg-amber-100 text-amber-700';
              break;
            case 'Closed Deal':
              newStatus = 'Closed Deal';
              newLeadStatus = 'sale-made';
              newColor = 'bg-green-100 text-green-700';
              // Attempt to parse value from note "Amount: $399"
              if (latestLog.note && latestLog.note.includes('Amount: $')) {
                 const match = latestLog.note.match(/Amount: \$([\d,.]+)/);
                 if (match) newValue = `$${match[1]}`;
              }
              break;
            case 'Deal Lost':
              newStatus = 'Deal Lost';
              newLeadStatus = 'closed-lost';
              newColor = 'bg-stone-100 text-stone-700';
              break;
            default: 
              newStatus = 'In Progress';
              newColor = 'bg-stone-100 text-stone-600';
          }
        }

        return {
          ...lead,
          history: newHistory,
          status: newStatus,
          leadStatus: newLeadStatus,
          color: newColor,
          value: newValue,
          scheduledDate: newScheduledDate, // Resetting scheduled date as simpler approach, user can re-schedule if needed
          lastContact: newLastContact
        };
      }
      return lead;
    });

    setLeads(updatedLeads);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));
    
    setDeleteDialogOpen(false);
    setLogToDelete(null);
    
    toast({
      title: "Log Deleted",
      description: "The interaction log has been removed and lead status updated."
    });
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    const updatedGroups = customGroups.filter(g => g !== groupName);
    setCustomGroups(updatedGroups);
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updatedGroups));
    
    // If active group was deleted, switch to all leads
    if (activeGroup === groupName) {
      setActiveGroup('All Leads');
    }

    // Clean up leads that had this group assigned
    const updatedLeads = leads.map(lead => ({
      ...lead,
      groups: lead.groups.filter((g: string) => g !== groupName)
    }));
    setLeads(updatedLeads);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedLeads));

    toast({
      title: "Category Deleted",
      description: `'${groupName}' has been removed.`
    });
  };

  const toggleGroupForLead = (leadId: string, group: string) => {
    const updated = leads.map(lead => {
      if (lead.id === leadId) {
        const newGroups = lead.groups.includes(group)
          ? lead.groups.filter((g: string) => g !== group)
          : [...lead.groups, group];
        return { ...lead, groups: newGroups };
      }
      return lead;
    });
    setLeads(updated);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="flex h-screen bg-[#E5E4E2] text-stone-900 overflow-hidden">
      {/* List View (Left Panel) */}
      <div className={`w-full md:w-[400px] border-r border-stone-200 bg-[#F5F5F4] flex flex-col transition-all duration-300 ${selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Total Count Header */}
        <div className="p-6 pb-2 bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-stone-200">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 text-stone-400">Total Leads</p>
              <h1 className="text-4xl font-black text-stone-900 leading-none">{leads.length}</h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 rounded-full border-dashed border-stone-300 text-stone-500 hover:text-stone-900 hover:border-stone-400 bg-white">
                  <Plus className="w-3 h-3 mr-1" /> New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. Call Back Tuesday"
                      className="text-stone-900 font-semibold"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateGroup}>Create Group</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Group Filter Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            <button
              onClick={() => setActiveGroup('All Leads')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${activeGroup === 'All Leads' 
                  ? 'bg-stone-900 text-white shadow-sm' 
                  : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'}`}
            >
              All Leads
            </button>
            {customGroups.map(group => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border group/chip
                  ${activeGroup === group 
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                    : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-100'}`}
              >
                <Folder className="w-3 h-3" />
                <span>{group}</span>
                <span 
                  onClick={(e) => handleDeleteGroup(e, group)}
                  className={`ml-1 hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-black/10 ${activeGroup === group ? 'text-white/50' : 'text-stone-300'}`}
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </button>
            ))}
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search leads..." 
              className="pl-9 bg-white border-stone-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {paginatedLeads.map(lead => (
            <div 
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`p-4 rounded-xl cursor-pointer border transition-all hover:shadow-md group relative
                ${selectedLeadId === lead.id 
                  ? 'bg-white border-stone-300 shadow-sm ring-1 ring-stone-200' 
                  : 'bg-white border-transparent hover:border-stone-200'
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-stone-100">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.businessName || lead.correctedBusinessName || lead.name}`} />
                    <AvatarFallback>{lead.avatar || (lead.businessName || lead.correctedBusinessName || lead.name || 'LE').substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-stone-900">{lead.businessName || lead.correctedBusinessName || lead.name || 'Unknown Business'}</h3>
                    <p className="text-xs text-stone-500">{lead.contactName || lead.ownerName || 'No contact name'}</p>
                  </div>
                </div>
                {selectedLeadId === lead.id && (
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2 pl-[52px]">
                {lead.groups?.map((g: string) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded-md border border-stone-200 flex items-center gap-1">
                    {g}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3 pl-[52px]">
                 {(() => {
                    const manualStatuses = ['Meeting Scheduled', 'Closed Deal', 'Deal Lost', 'Interested', 'Not Interested', 'No Answer', 'Closed', 'Sale Made'];
                    let displayStatus = lead.status;
                    
                    // Safety: If history is empty, an interaction status is invalid -> Reset to New
                    if ((!lead.history || lead.history.length === 0) && manualStatuses.includes(displayStatus)) {
                       displayStatus = 'New';
                    } 
                    // Otherwise, prefer manual status if present, else format leadStatus
                    else if (!manualStatuses.includes(lead.status) && lead.leadStatus) {
                       displayStatus = lead.leadStatus.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                    }

                    // Initialize with default or stored color (only if status matches)
                    let badgeColor = 'bg-stone-100 text-stone-600 hover:bg-stone-200';
                    if (lead.color && displayStatus === lead.status) {
                       badgeColor = lead.color + ' hover:bg-stone-200';
                    }

                    // Apply specific colors based on the resolved display status
                    if (displayStatus === 'Closed' || displayStatus === 'Closed Deal' || displayStatus === 'Sale Made') {
                        badgeColor = 'bg-green-100 text-green-700 hover:bg-green-500 hover:text-white';
                    } else if (displayStatus === 'Not Interested') {
                        badgeColor = 'bg-red-100 text-red-700 hover:bg-red-500 hover:text-white';
                    } else if (displayStatus === 'No Answer' || displayStatus === 'Follow Up') {
                        badgeColor = 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white';
                    } else if (displayStatus === 'Meeting Scheduled' || displayStatus === 'Scheduled') {
                        badgeColor = 'bg-purple-100 text-purple-700 hover:bg-purple-500 hover:text-white';
                    } else if (displayStatus === 'Interested') {
                        badgeColor = 'bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white';
                    }

                    return (
                      <Badge variant="secondary" className={`font-bold border-0 px-3 py-1 rounded-full text-[11px] shadow-sm transition-colors cursor-default ${badgeColor}`}>
                        {displayStatus}
                      </Badge>
                    );
                 })()}
                <span className="text-[10px] text-stone-400">{lead.lastContact}</span>
              </div>
            </div>
          ))}
          
          {/* Pagination Controls */}
          {filteredLeads.length > 0 && (
            <div className="pt-4 mt-2 border-t border-stone-200 flex justify-between items-center px-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Page {currentPage} of {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-white border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-stone-900 border-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 disabled:bg-stone-300 disabled:border-stone-300"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail View (Right Panel) */}
      <div className={`flex-1 flex flex-col h-full bg-[#E5E4E2] overflow-y-auto ${!selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
        {activeLead ? (
          <>
          <div className="p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Mobile Back Button */}
            <Button 
              variant="ghost" 
              className="md:hidden mb-4 -ml-2 text-stone-500" 
              onClick={() => setSelectedLeadId(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>

            {/* Active Lead Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-stone-100">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeLead.businessName}`} />
                    <AvatarFallback>{activeLead.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900">{activeLead.businessName || activeLead.correctedBusinessName || activeLead.name || 'Unknown Business'}</h2>
                    <div className="flex items-center gap-2 text-stone-500 mt-1">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">{activeLead.contactName || activeLead.ownerName || 'No contact name'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button variant="outline" size="sm" className="rounded-full bg-stone-900 text-white border-stone-800 hover:bg-stone-800 transition-colors">
                         <Tag className="w-4 h-4 mr-2" /> Categories
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-56 p-2" align="end">
                       <p className="text-xs font-bold text-stone-500 mb-2 px-2 uppercase tracking-tight">Assign to</p>
                       <div className="space-y-1">
                         {customGroups.map(group => (
                           <button
                             key={group}
                             onClick={() => toggleGroupForLead(activeLead.id, group)}
                             className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-stone-100 flex items-center justify-between transition-colors"
                           >
                             <span>{group}</span>
                             {activeLead.groups?.includes(group) && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                           </button>
                         ))}
                         {customGroups.length === 0 && (
                            <p className="text-[10px] text-stone-400 p-2 italic text-center">No categories created.</p>
                         )}
                       </div>
                     </PopoverContent>
                   </Popover>
                   <Button size="sm" className="rounded-full bg-stone-900 text-white hover:bg-stone-800 shadow-sm">
                     <Phone className="w-4 h-4 mr-2" /> Call Now
                   </Button>
                   <Button 
                     size="sm" 
                     variant="destructive"
                     className="rounded-full shadow-sm"
                     onClick={() => setReportDialogOpen(true)}
                   >
                     <Globe className="w-4 h-4 mr-2" /> Report Website
                   </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2 text-stone-400 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Company</span>
                  </div>
                  <p className="text-sm font-medium text-stone-900">{activeLead.address || activeLead.notes || 'No address available'}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2 text-stone-400 mb-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Contact</span>
                  </div>
                  <p className="text-sm font-medium text-stone-900">{activeLead.phone || activeLead.phoneNumber || activeLead.correctedPhoneNumber || 'No phone available'}</p>
                  <p className="text-sm text-stone-500">{activeLead.email || activeLead.website || 'No email available'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Interaction Logger */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm relative overflow-hidden">
                  <h3 className="text-sm font-bold text-stone-900 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4" /> Log Interaction
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {conclusions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectConclusion(item.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-2 h-24
                          ${selectedConclusion === item.id 
                            ? `${item.color} ring-2 ring-offset-2 ring-stone-900/5` 
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                          } ${item.id === 'closed' || item.id === 'lost' ? 'md:col-span-2' : ''}`}
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-bold text-center">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Date/Time Picker Area (Slides down when Meeting Scheduled is selected) */}
                  {(selectedConclusion === 'scheduled' || selectedConclusion === 'closed' || selectedConclusion === 'lost') && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6 animate-in slide-in-from-top-2 duration-200">
                      {(selectedConclusion === 'scheduled') && (
                        <div className="flex items-center gap-4 mb-4">
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="flex-1 bg-white border-blue-200 text-stone-900 font-semibold h-11 shadow-sm">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                                  {date ? format(date, "PPP") : "Pick Date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setIsCalendarOpen(false); }} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-md px-3 h-11 shadow-sm">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <input 
                                  type="time" 
                                  value={time} 
                                  onChange={(e) => setTime(e.target.value)}
                                  className="bg-transparent border-none focus:ring-0 text-sm font-bold text-stone-900 outline-none"
                              />
                            </div>
                        </div>
                      )}
                      {(selectedConclusion === 'closed' || selectedConclusion === 'lost') && (
                        <div className="space-y-4">
                           <Label htmlFor="sale-amount" className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Final Deal Amount (Optional)</Label>
                           <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                             <Input
                               id="sale-amount"
                               type="number"
                               value={note}
                               onChange={(e) => setNote(e.target.value)}
                               placeholder="0.00" 
                               className="pl-8 h-12 text-lg font-bold bg-white border-blue-200 text-stone-900"
                             />
                           </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <Textarea 
                      placeholder="Add specific notes about this call or meeting..." 
                      className="resize-none bg-stone-50 border-stone-200 focus:bg-white min-h-[120px] text-stone-900 font-medium"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />

                    <Button onClick={handleSaveLog} className="w-full h-12 bg-stone-900 text-white hover:bg-stone-800 text-base font-medium shadow-md shadow-black/10">
                      Save Interaction Log
                    </Button>
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div className="xl:col-span-1">
                <div className="bg-white/50 backdrop-blur rounded-[2rem] p-6 border border-stone-200/50 h-full shadow-sm">
                  <h3 className="text-sm font-bold text-stone-900 mb-6 uppercase tracking-wider">Past Activity</h3>
                  <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-200/50">
                    {activeLead.history?.map((log: any) => (
                      <div key={log.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 w-10 h-10 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-white border-[3px] border-stone-300 shadow-sm z-10" />
                        </div>
                        <div className="group">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">{log.type}</span>
                            <span className="text-[10px] text-stone-400 font-medium">{log.date}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm group-hover:border-stone-200 transition-colors relative pr-8">
                            <p className="font-bold text-stone-900 text-sm mb-1">{log.result}</p>
                            <p className="text-xs text-stone-500 leading-relaxed">{log.note}</p>
                            <button 
                              onClick={(e) => initiateDeleteLog(e, activeLead.id, log.id)}
                              className="absolute top-2 right-2 text-stone-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-full transition-all"
                              title="Delete Log"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!activeLead.history || activeLead.history.length === 0) && (
                      <p className="text-xs text-stone-400 italic text-center py-8">No past interactions logged.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-white border-stone-200 shadow-xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-stone-900">Delete Interaction Log?</AlertDialogTitle>
              <AlertDialogDescription className="text-stone-500">
                This will remove this log from the history and revert the lead's status and value to the previous state.
                <br /><br />
                Income recorded from this log will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLogToDelete(null)} className="bg-white border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteLog} className="bg-red-600 hover:bg-red-700 rounded-xl text-white">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <AlertDialogContent className="bg-white border-stone-200 shadow-xl rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-stone-900">Report Existing Website</AlertDialogTitle>
              <AlertDialogDescription className="text-stone-500">
                Are you sure you want to flag this lead as having a website?
                <br /><br />
                This will help track lead quality issues and prevent future errors.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  setReportDialogOpen(false);
                  toast({
                    title: "Lead Reported",
                    description: "This lead has been flagged for having an existing website.",
                    variant: "destructive"
                  });
                }}
                className="bg-red-600 hover:bg-red-700 rounded-xl text-white"
              >
                Report Issue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-8 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-stone-100">
              <User className="w-10 h-10 text-stone-300" />
            </div>
            <h2 className="text-xl font-bold text-stone-600">Select a Lead</h2>
            <p className="max-w-xs mt-2 text-stone-400">Choose a lead from the list on the left to view details and log interactions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RootLogsPage() {
  return (
    <div className="flex min-h-screen bg-[#E5E4E2]">
      <div className="hidden md:block fixed left-0 top-0 h-full z-50">
        <Sidebar />
      </div>
      <main 
        className="flex-1 p-0 min-h-screen relative z-0 transition-[margin] duration-75"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <LogsPageContent />
      </main>
    </div>
  );
}
