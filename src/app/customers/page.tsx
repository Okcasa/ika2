'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  ArrowUpRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle,
  FileEdit,
  History,
  Calculator,
  Target,
  DollarSign,
  Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { actorColorClass, getRoleCapabilities } from '@/lib/team-role';
import { useLeadScope } from '@/hooks/use-lead-scope';
import { NotificationBell } from '@/components/notification-bell';

const LOST_COLOR = 'bg-red-100 text-red-700';

const isDealLostLike = (status?: string | null, leadStatus?: string | null) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedLeadStatus = String(leadStatus || '').trim().toLowerCase();
  return (
    normalizedStatus === 'deal lost' ||
    normalizedStatus === 'lost' ||
    normalizedLeadStatus === 'closed-lost'
  );
};

const normalizeLeadColor = (status?: string | null, leadStatus?: string | null, color?: string | null) => {
  if (isDealLostLike(status, leadStatus)) return LOST_COLOR;
  return color ?? 'bg-stone-100 text-stone-600';
};

const mapLeadRowToUi = (row: any) => ({
  id: row.id,
  businessName: row.business_name ?? row.businessName ?? row.name ?? '',
  name: row.business_name ?? row.name ?? row.businessName ?? '',
  company: row.business_name ?? row.company ?? row.businessName ?? '',
  contactName: row.contact_name ?? row.contactName ?? '',
  email: row.email ?? '',
  phone: row.phone ?? '',
  address: row.address ?? '',
  status: row.status ?? 'New',
  leadStatus: row.lead_status ?? row.leadStatus ?? 'new',
  value: row.value ?? '$0',
  scheduledDate: row.scheduled_date ?? row.scheduledDate ?? '-',
  lastContact: row.last_contact ?? row.lastContact ?? 'Never',
  color: normalizeLeadColor(row.status, row.lead_status ?? row.leadStatus, row.color),
  history: Array.isArray(row.history) ? row.history.slice(0, 60) : [],
  groups: Array.isArray(row.groups) ? row.groups : [],
  openedAt: row.opened_at ?? row.openedAt,
  closedAt: row.closed_at ?? row.closedAt,
  ownerUserId: row.user_id ?? null,
  teamId: row.team_id ?? null,
});

const buildLeadUpdatePayload = (lead: any) => ({
  business_name: lead.businessName ?? lead.name ?? null,
  contact_name: lead.contactName ?? null,
  email: lead.email ?? null,
  phone: lead.phone ?? null,
  address: lead.address ?? null,
  status: lead.status ?? 'New',
  lead_status: lead.leadStatus ?? 'new',
  value: lead.value ?? '$0',
  scheduled_date: lead.scheduledDate ?? '-',
  last_contact: lead.lastContact ?? 'Never',
  color: normalizeLeadColor(lead.status, lead.leadStatus, lead.color),
  history: lead.history ?? [],
  groups: lead.groups ?? [],
  opened_at: lead.openedAt ? new Date(lead.openedAt).toISOString() : null,
  closed_at: lead.closedAt ? new Date(lead.closedAt).toISOString() : null,
});

const getStatusBadgeClass = (lead: any) => {
  const status = String(lead.status || '').toLowerCase();
  const leadStatus = String(lead.leadStatus || '').toLowerCase();

  if (status === 'deal lost' || status === 'lost' || leadStatus === 'closed-lost') {
    return 'bg-red-100 text-red-700 hover:bg-red-600 hover:text-white';
  }

  if (typeof lead?.color === 'string' && lead.color.includes('bg-') && lead.color.includes('text-')) {
    return `${lead.color} hover:opacity-90`;
  }

  if (status === 'closed' || status === 'closed deal' || leadStatus === 'closed-won') {
    return 'bg-green-100 text-green-700 hover:bg-green-600 hover:text-white';
  }

  if (status === 'deal lost' || status === 'lost' || leadStatus === 'closed-lost') {
    return 'bg-red-100 text-red-700 hover:bg-red-600 hover:text-white';
  }

  if (status === 'interested') {
    return 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white';
  }

  if (status === 'not interested') {
    return 'bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white';
  }

  if (status === 'meeting scheduled' || status === 'scheduled') {
    return 'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white';
  }

  if (status === 'no answer' || status === 'follow up') {
    return 'bg-orange-100 text-orange-700 hover:bg-orange-600 hover:text-white';
  }

  if (status === 'new') {
    return 'bg-stone-100 text-stone-700 hover:bg-stone-800 hover:text-white';
  }

  return 'bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white';
};

function LeadsPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  // Use a debounced search term to prevent lagging while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [closingLead, setClosingLead] = useState<any>(null);
  const [closeAmount, setCloseAmount] = useState('');
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [activityLead, setActivityLead] = useState<any>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [teamCanEdit, setTeamCanEdit] = useState(true);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTeamContext, setIsTeamContext] = useState(false);
  const { isMineScope } = useLeadScope();

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;
    const loadSupabase = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        if (mounted) setCurrentUserId(session.user.id);
        let resolvedTeamId: string | null = null;
        try {
          const teamRes = await fetch('/api/team/overview', {
            method: 'GET',
            headers: { authorization: `Bearer ${session.access_token}` },
          });
          const teamJson = await teamRes.json().catch(() => ({}));
          const caps = getRoleCapabilities(teamJson?.role || null);
          resolvedTeamId = teamJson?.team?.id || null;
          const viewerOwnMode = caps.role === 'viewer' && isMineScope;
          if (mounted) {
            setTeamCanEdit(viewerOwnMode ? true : caps.canEdit);
            setTeamRole(caps.role);
            setIsTeamContext(Boolean(resolvedTeamId) && !viewerOwnMode);
          }
          if (viewerOwnMode) {
            resolvedTeamId = null;
          }
        } catch {
          // Team permissions are optional; default to editable.
        }
        const leadQuery = supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });
        const { data, error } = resolvedTeamId
          ? await leadQuery.or(`team_id.eq.${resolvedTeamId},user_id.eq.${session.user.id}`)
          : await leadQuery.eq('user_id', session.user.id);
        if (!error && mounted) {
          setLeads((data || []).map(mapLeadRowToUi));
        }
      } catch (e) {
        console.error("Failed to load leads", e);
      }
    };
    loadSupabase();
    return () => {
      mounted = false;
    };
  }, [isMineScope]);

  // Calculate Smart Projections - Memoized
  const formatDuration = (ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return '--:--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const parseTime = (value: any) => {
    if (!value) return NaN;
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  const stats = useMemo(() => {
    // Create a quick summary without iterating multiple times if possible
    let closedCount = 0;
    let activeCount = 0;
    let totalClosedValue = 0;

    const durations: number[] = [];

    for (const l of leads) {
      const status = String(l.status || '').toLowerCase();
      const leadStatus = String(l.leadStatus || '').toLowerCase();
      const isClosed =
        status === 'closed' ||
        status === 'closed deal' ||
        status === 'sale made' ||
        leadStatus === 'sale-made' ||
        leadStatus === 'closed-won';
      const isInactive =
        isClosed ||
        status === 'deal lost' ||
        status === 'lost' ||
        status === 'not interested' ||
        leadStatus === 'closed-lost' ||
        leadStatus === 'not-interested';
      
      if (isClosed) {
        closedCount++;
        totalClosedValue += (parseFloat(l.value.replace(/[$,]/g, '')) || 0);

        const closedAt = parseTime(l.closedAt);
        const openedAt = parseTime(l.openedAt);
        let start = openedAt;
        if (!Number.isFinite(start) && l.history?.length) {
          const earliest = l.history
            .map((h: any) => parseTime(h.timestamp || h.date))
            .filter((t: number) => Number.isFinite(t))
            .sort((a: number, b: number) => a - b)[0];
          start = earliest;
        }
        let end = closedAt;
        if (!Number.isFinite(end) && l.history?.length) {
          const closeLog = l.history.find((h: any) => h.result === 'Closed Deal' || h.result === 'Deal Lost');
          end = parseTime(closeLog?.timestamp || closeLog?.date);
        }
        if (Number.isFinite(start) && Number.isFinite(end)) {
          durations.push(end - start);
        }
      } else if (!isInactive) {
        activeCount++;
      }
    }

    const averageDealValue = closedCount > 0 ? totalClosedValue / closedCount : 0;
    const projectedRevenue = totalClosedValue + (activeCount * averageDealValue);

    const avgCloseMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalClosedValue,
      averageDealValue,
      projectedRevenue,
      closedCount,
      activeCount,
      avgCloseMs
    };
  }, [leads]);

  const handleCloseDeal = () => {
    if (!teamCanEdit) {
      toast({
        title: 'Read-only access',
        description: 'Viewer role can view/export only.',
        variant: 'destructive',
      });
      return;
    }
    if (!closingLead || !closeAmount) return;

    const updatedLeads = leads.map(l =>
      l.id === closingLead.id
        ? { ...l, status: 'Closed', value: `$${parseFloat(closeAmount).toLocaleString()}`, color: 'bg-emerald-100 text-emerald-700', closedAt: Date.now() }
        : l
    );

    setLeads(updatedLeads);
    const updated = updatedLeads.find(l => l.id === closingLead.id);
    if (updated) {
      supabase.from('leads').update(buildLeadUpdatePayload(updated)).eq('id', updated.id);
    }

    toast({
      title: "Deal Closed!",
      description: `Successfully closed ${closingLead.name} for $${closeAmount}`,
    });

    setIsCloseDialogOpen(false);
    setClosingLead(null);
    setCloseAmount('');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Memoize filtered leads to avoid re-calculation on every render
  const filteredLeads = useMemo(() => {
    if (!debouncedSearch) return leads;
    
    const lowerSearch = debouncedSearch.toLowerCase();
    return leads.filter(lead => 
      (lead.name || lead.businessName || '').toLowerCase().includes(lowerSearch) || 
      (lead.company || lead.businessName || '').toLowerCase().includes(lowerSearch)
    );
  }, [leads, debouncedSearch]);

  const canCloseFromLeadsPage = teamCanEdit && teamRole !== 'viewer';

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // Reset to page 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-8 space-y-8 app-shell-bg app-shell-text min-h-screen select-none">
      <TooltipProvider delayDuration={200}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-stone-900 uppercase">Leads</h1>
          <p className="text-stone-700 font-medium mt-1">Manage your high-intent pipeline and accelerate conversions.</p>
        </div>
        <div className="flex gap-3">
          <NotificationBell />
          <Button variant="outline" className="bg-white border-stone-200 text-stone-600 hover:bg-stone-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-stone-900 text-white hover:bg-stone-800">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {teamRole === 'viewer' && (
            <Badge className="bg-amber-100 text-amber-700 border-0">Viewer Mode</Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-tutorial-id="leads-stats">
        <Card className="bg-white p-8 rounded-[2.5rem] border-none shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute right-6 top-6 p-3 bg-stone-50 rounded-2xl text-stone-300 group-hover:text-stone-900 transition-all group-hover:rotate-12">
            <Calculator className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Projected Revenue</p>
          <p className="text-4xl font-black text-stone-900 mt-2 tracking-tighter">
            ${stats.projectedRevenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
          </p>
          <div className="flex items-center mt-6 text-[10px] font-black gap-2">
            <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl uppercase tracking-widest">
              Avg: ${stats.averageDealValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </span>
            <span className="text-stone-400 uppercase tracking-widest">From {stats.closedCount} deals</span>
          </div>
        </Card>

        <Card className="bg-white p-8 rounded-[2.5rem] border-none shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute right-6 top-6 p-3 bg-stone-50 rounded-2xl text-stone-300 group-hover:text-stone-900 transition-all group-hover:scale-110">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-stone-700 uppercase tracking-[0.2em]">Active Pipeline</p>
          <p className="text-4xl font-black text-stone-900 mt-2 tracking-tighter">{stats.activeCount}</p>
          <div className="flex flex-col gap-2 mt-6">
            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
              High intent leads
            </div>
            <div className="text-[10px] font-black text-stone-500 bg-stone-100 w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
              Avg Close: {formatDuration(stats.avgCloseMs)}
            </div>
          </div>
        </Card>

        <Card className="bg-white p-8 rounded-[2.5rem] border-none shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
          <div className="absolute right-6 top-6 p-3 bg-stone-900 rounded-2xl text-white transition-all group-hover:-rotate-12 shadow-lg shadow-black/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Closed Value</p>
          <p className="text-4xl font-black text-stone-900 mt-2 tracking-tighter">${stats.totalClosedValue.toLocaleString()}</p>
          <div className="flex items-center mt-6 text-[10px] font-black text-stone-900 bg-stone-100 w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
             Closing Rate: {leads.length > 0 ? ((stats.closedCount / leads.length) * 100).toFixed(0) : 0}%
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[2.5rem] border-none shadow-sm overflow-hidden" data-tutorial-id="leads-table">
        {/* Table Controls */}
        <div className="p-8 border-b border-stone-50 flex items-center gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
            <Input 
              placeholder="Search by company or contact..." 
              className="pl-12 bg-stone-50 border-none focus:bg-white focus:ring-2 focus:ring-stone-100 transition-all h-14 rounded-2xl font-bold text-stone-900 placeholder:text-stone-300 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
             <Button variant="outline" className="h-14 w-14 rounded-2xl border-stone-100 text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all">
                <Filter className="w-5 h-5" />
             </Button>
          </div>
        </div>

        {/* Table */}
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-stone-50 h-16">
                <TableHead className="w-[320px] pl-8 text-xs font-black uppercase tracking-[0.2em] text-stone-500">Lead Information</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-stone-500 text-center">Current Status</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-stone-500 text-center">Schedule</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Value</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-stone-500 text-center">Time to Close</TableHead>
                <TableHead className="text-right pr-8 text-xs font-black uppercase tracking-[0.2em] text-stone-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-stone-50/50 border-stone-50 transition-all group h-24">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-5">
                    <div className="relative group">
                        <Avatar className="h-14 w-14 border border-stone-100 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name || lead.businessName}`} />
                        <AvatarFallback className="bg-stone-50 font-black text-stone-400">{lead.avatar || (lead.businessName || lead.name).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                    </div>
                    <div>
                      <p className="text-base font-black text-stone-900 tracking-tight">{lead.name || lead.businessName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-[11px] font-extrabold text-stone-500 uppercase tracking-[0.14em]">{lead.company || lead.businessName}</p>
                        {isTeamContext && (
                          <Badge
                            className={`h-5 border-0 px-2 text-[9px] font-black uppercase tracking-wider ${
                              lead.ownerUserId === currentUserId
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {lead.ownerUserId === currentUserId ? 'Mine' : 'Team'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className={`font-black border-0 px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shadow-sm transition-all cursor-default ${getStatusBadgeClass(lead)}`}
                  >
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col items-center gap-1">
                     <div className="flex items-center gap-2 text-[10px] font-black text-stone-600 uppercase tracking-widest bg-stone-50 px-3 py-1.5 rounded-xl">
                        <Clock className="h-3 w-3 text-stone-500" />
                        {lead.scheduledDate === '-' ? 'No Date' : lead.scheduledDate}
                     </div>
                   </div>
                </TableCell>
                <TableCell className="font-black text-stone-900 text-lg tracking-tighter">{lead.value}</TableCell>
                <TableCell className="text-center">
                  <span className="text-xs font-black text-stone-500">
                    {lead.status === 'Closed' || lead.status === 'Closed Deal'
                      ? (() => {
                          const closedAt = parseTime(lead.closedAt);
                          const openedAt = parseTime(lead.openedAt);
                          let start = openedAt;
                          if (!Number.isFinite(start) && lead.history?.length) {
                            const earliest = lead.history
                              .map((h: any) => parseTime(h.timestamp || h.date))
                              .filter((t: number) => Number.isFinite(t))
                              .sort((a: number, b: number) => a - b)[0];
                            start = earliest;
                          }
                          let end = closedAt;
                          if (!Number.isFinite(end) && lead.history?.length) {
                            const closeLog = lead.history.find((h: any) => h.result === 'Closed Deal' || h.result === 'Deal Lost');
                            end = parseTime(closeLog?.timestamp || closeLog?.date);
                          }
                          return Number.isFinite(start) && Number.isFinite(end) ? formatDuration(end - start) : '--:--:--';
                        })()
                      : '--:--:--'}
                  </span>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="lead-action-btn-wrapper">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="lead-action-btn"
                            onClick={() => {
                              setActivityLead(lead);
                              setIsActivityDialogOpen(true);
                            }}
                          >
                            <History className="lead-action-btn-icon" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>View Activity</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="lead-action-btn-wrapper">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="lead-action-btn"
                            onClick={() => router.push(`/logs?leadId=${lead.id}`)}
                          >
                            <FileEdit className="lead-action-btn-icon" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Open in Logs</TooltipContent>
                    </Tooltip>
                    
                    {canCloseFromLeadsPage &&
                      lead.status !== 'Closed' &&
                      lead.status !== 'Closed Deal' &&
                      lead.status !== 'Deal Lost' &&
                      lead.status !== 'Lost' &&
                      lead.status !== 'Not Interested' &&
                      lead.leadStatus !== 'closed-lost' &&
                      lead.leadStatus !== 'closed-won' && (
                      <Dialog open={isCloseDialogOpen && closingLead?.id === lead.id} onOpenChange={(open) => {
                        setIsCloseDialogOpen(open);
                        if(open) setClosingLead(lead);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="ml-2 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 font-bold shadow-sm shadow-emerald-600/20">
                            Close Deal
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Close Deal: {lead.name || lead.businessName}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                              <Label htmlFor="amount" className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Final Sale Amount</Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                                <Input
                                  id="amount"
                                  type="number"
                                  value={closeAmount}
                                  onChange={(e) => setCloseAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="pl-8 h-12 text-lg font-bold bg-stone-50 border-stone-200 text-stone-900"
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleCloseDeal} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-600/20">
                              Confirm Sale
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog
          open={isActivityDialogOpen}
          onOpenChange={(open) => {
            setIsActivityDialogOpen(open);
            if (!open) setActivityLead(null);
          }}
        >
          <DialogContent className="sm:max-w-2xl bg-white border border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-stone-900">
                Activity: {activityLead?.name || activityLead?.businessName || 'Lead'}
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
              {!activityLead?.history || activityLead.history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-sm text-stone-500">
                  No activity logged for this lead yet.
                </div>
              ) : (
                [...activityLead.history]
                  .sort((a: any, b: any) => {
                    const ta = parseTime(a?.timestamp || a?.date);
                    const tb = parseTime(b?.timestamp || b?.date);
                    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
                    if (!Number.isFinite(ta)) return 1;
                    if (!Number.isFinite(tb)) return -1;
                    return tb - ta;
                  })
                  .map((entry: any, idx: number) => {
                    const label = entry?.result || entry?.action || entry?.status || 'Update';
                    const note = entry?.note || entry?.details || '';
                    const actor = entry?.actor_name || entry?.actor || 'System';
                    const tsRaw = entry?.timestamp || entry?.date;
                    const ts = tsRaw ? new Date(tsRaw).toLocaleString() : 'No timestamp';
                    return (
                      <div key={`${tsRaw || 'entry'}-${idx}`} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-stone-900">{label}</p>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-stone-500 border-stone-300 bg-white">
                            {ts}
                          </Badge>
                        </div>
                        {note ? <p className="mt-2 text-sm text-stone-600">{note}</p> : <p className="mt-2 text-sm text-stone-400">No notes added.</p>}
                        <p className={`mt-2 text-xs font-semibold ${actorColorClass(actor)}`}>by {actor}</p>
                      </div>
                    );
                  })
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Pagination */}
        <div className="p-6 border-t border-stone-100 grid grid-cols-3 items-center bg-stone-50/30">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs font-bold bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs font-bold bg-stone-900 text-white border-stone-900 hover:bg-stone-800 hover:text-white disabled:opacity-50 disabled:bg-stone-300 disabled:border-stone-300 disabled:cursor-not-allowed"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          <div />
        </div>
      </div>
      </TooltipProvider>
    </div>
  );
}

export default function RootLeadsPage() {
  return (
    <div className="flex min-h-screen app-shell-bg app-shell-text">
      {/* Sidebar with high z-index to stay on top */}
      <div className="hidden md:block fixed left-0 top-0 h-full z-50">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main 
        className="flex-1 p-0 min-h-screen relative z-0 transition-[margin] duration-75"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <LeadsPageContent />
      </main>
    </div>
  );
}
