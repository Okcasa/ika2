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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Card, CardContent } from '@/components/ui/card';
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
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showOnlyScheduled, setShowOnlyScheduled] = useState(false);
  const [showHighValueOnly, setShowHighValueOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine' | 'team'>('all');
  const { isMineScope } = useLeadScope();
  const [isLeadsLoading, setIsLeadsLoading] = useState(true);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

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
      if (mounted) setIsLeadsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) setIsLeadsLoading(false);
          return;
        }
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
      } finally {
        if (mounted) setIsLeadsLoading(false);
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

  const parseMoney = (value: any) => {
    const parsed = parseFloat(String(value ?? '$0').replace(/[$,]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const computeTimeToClose = (lead: any) => {
    if (!(lead.status === 'Closed' || lead.status === 'Closed Deal')) return '--:--:--';
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

  const pipelineUtilizationPct = useMemo(() => {
    if (leads.length === 0) return 0;
    return Math.round((stats.activeCount / leads.length) * 100);
  }, [leads.length, stats.activeCount]);

  const revenueMomentum = useMemo(() => {
    const closedSeries = leads
      .map((lead) => {
        const status = String(lead.status || '').toLowerCase();
        const leadStatus = String(lead.leadStatus || '').toLowerCase();
        const isClosed =
          status === 'closed' ||
          status === 'closed deal' ||
          status === 'sale made' ||
          leadStatus === 'sale-made' ||
          leadStatus === 'closed-won';
        if (!isClosed) return null;

        const amount = parseFloat(String(lead.value || '$0').replace(/[$,]/g, '')) || 0;
        const closedAt = parseTime(lead.closedAt);
        return {
          amount,
          closedAt: Number.isFinite(closedAt) ? closedAt : 0,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.closedAt - a.closedAt)
      .slice(0, 5)
      .reverse() as Array<{ amount: number; closedAt: number }>;

    const maxAmount = Math.max(0, ...closedSeries.map((x) => x.amount));
    const bars = closedSeries.map((x) => {
      if (maxAmount <= 0) return 10;
      return Math.max(10, Math.round((x.amount / maxAmount) * 100));
    });

    return {
      bars,
      points: closedSeries.length,
      total: closedSeries.reduce((acc, x) => acc + x.amount, 0),
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

  const filteredLeads = useMemo(() => {
    const lowerSearch = debouncedSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (lowerSearch) {
        const searchHit =
          (lead.name || lead.businessName || '').toLowerCase().includes(lowerSearch) ||
          (lead.company || lead.businessName || '').toLowerCase().includes(lowerSearch);
        if (!searchHit) return false;
      }

      if (statusFilters.length > 0) {
        const leadStatus = String(lead.status || '').trim();
        if (!statusFilters.includes(leadStatus)) return false;
      }

      if (showOnlyScheduled && (!lead.scheduledDate || lead.scheduledDate === '-')) return false;
      if (showHighValueOnly && parseMoney(lead.value) < 100) return false;

      if (isTeamContext && ownerFilter !== 'all') {
        const isMine = lead.ownerUserId && currentUserId && lead.ownerUserId === currentUserId;
        if (ownerFilter === 'mine' && !isMine) return false;
        if (ownerFilter === 'team' && isMine) return false;
      }

      return true;
    });
  }, [
    leads,
    debouncedSearch,
    statusFilters,
    showOnlyScheduled,
    showHighValueOnly,
    ownerFilter,
    isTeamContext,
    currentUserId,
  ]);

  const availableStatuses = useMemo(
    () =>
      Array.from(
        new Set(
          leads
            .map((lead) => String(lead.status || '').trim())
            .filter((status) => status.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [leads]
  );

  const activeFilterCount =
    statusFilters.length +
    (showOnlyScheduled ? 1 : 0) +
    (showHighValueOnly ? 1 : 0) +
    (isTeamContext && ownerFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setStatusFilters([]);
    setShowOnlyScheduled(false);
    setShowHighValueOnly(false);
    setOwnerFilter('all');
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    statusFilters.forEach((status) => {
      chips.push({
        key: `status:${status}`,
        label: `Status: ${status}`,
        clear: () => setStatusFilters((prev) => prev.filter((s) => s !== status)),
      });
    });
    if (showOnlyScheduled) {
      chips.push({
        key: 'scheduled',
        label: 'Scheduled only',
        clear: () => setShowOnlyScheduled(false),
      });
    }
    if (showHighValueOnly) {
      chips.push({
        key: 'high-value',
        label: 'High value ($100+)',
        clear: () => setShowHighValueOnly(false),
      });
    }
    if (isTeamContext && ownerFilter !== 'all') {
      chips.push({
        key: 'owner',
        label: ownerFilter === 'mine' ? 'Owner: Mine' : 'Owner: Team',
        clear: () => setOwnerFilter('all'),
      });
    }
    return chips;
  }, [statusFilters, showOnlyScheduled, showHighValueOnly, isTeamContext, ownerFilter]);

  const canCloseFromLeadsPage = teamCanEdit && teamRole !== 'viewer';

  const exportRows = useMemo(
    () =>
      filteredLeads.map((lead) => ({
        company: lead.company || lead.businessName || lead.name || '',
        contact: lead.contactName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || '',
        value: lead.value || '$0',
        schedule: lead.scheduledDate || '-',
        timeToClose: computeTimeToClose(lead),
        lastContact: lead.lastContact || 'Never',
      })),
    [filteredLeads]
  );

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsCsv = () => {
    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Value', 'Schedule', 'Time To Close', 'Last Contact'];
    const quote = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = exportRows.map((row) =>
      [
        row.company,
        row.contact,
        row.email,
        row.phone,
        row.status,
        row.value,
        row.schedule,
        row.timeToClose,
        row.lastContact,
      ]
        .map(quote)
        .join(',')
    );
    downloadBlob([headers.join(','), ...rows].join('\n'), `leads-export-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    toast({ title: 'Exported CSV', description: `${exportRows.length} leads exported.` });
  };

  const exportAsJson = () => {
    downloadBlob(JSON.stringify(exportRows, null, 2), `leads-export-${Date.now()}.json`, 'application/json;charset=utf-8;');
    toast({ title: 'Exported JSON', description: `${exportRows.length} leads exported.` });
  };

  const exportAsTxt = () => {
    const lines = exportRows.map(
      (r, idx) =>
        `${idx + 1}. ${r.company}\n   Status: ${r.status}\n   Value: ${r.value}\n   Contact: ${r.contact || r.email || r.phone || '-'}\n   Schedule: ${r.schedule}\n   Time To Close: ${r.timeToClose}\n`
    );
    downloadBlob(lines.join('\n'), `leads-export-${Date.now()}.txt`, 'text/plain;charset=utf-8;');
    toast({ title: 'Exported TXT', description: `${exportRows.length} leads exported.` });
  };

  const exportAsDoc = () => {
    const rowsHtml = exportRows
      .map(
        (r) =>
          `<tr><td>${r.company}</td><td>${r.contact}</td><td>${r.email}</td><td>${r.phone}</td><td>${r.status}</td><td>${r.value}</td><td>${r.schedule}</td><td>${r.timeToClose}</td><td>${r.lastContact}</td></tr>`
      )
      .join('');
    const html = `<html><head><meta charset="utf-8"><title>Leads Export</title></head><body><h2>Leads Export</h2><table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Status</th><th>Value</th><th>Schedule</th><th>Time To Close</th><th>Last Contact</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    downloadBlob(html, `leads-export-${Date.now()}.doc`, 'application/msword');
    toast({ title: 'Exported DOC', description: `${exportRows.length} leads exported.` });
  };

  const exportAsPdf = () => {
    const rowsHtml = exportRows
      .map((r) => `<tr><td>${r.company}</td><td>${r.status}</td><td>${r.value}</td><td>${r.schedule}</td><td>${r.timeToClose}</td></tr>`)
      .join('');
    const html = `<html><head><title>Leads Export</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f4f4f4;}</style></head><body><h2>Leads Export</h2><p>Total rows: ${exportRows.length}</p><table><thead><tr><th>Company</th><th>Status</th><th>Value</th><th>Schedule</th><th>Time To Close</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    const popup = window.open('', '_blank');
    if (!popup) {
      toast({ title: 'Popup blocked', description: 'Enable popups to export PDF.', variant: 'destructive' });
      return;
    }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
    toast({ title: 'Opened PDF print view', description: 'Choose "Save as PDF" in print.' });
  };

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

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setIsHeaderCompact(window.scrollY > 120);
        raf = 0;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="shop-doodle-theme p-8 space-y-8 app-shell-text min-h-screen select-none">
      <TooltipProvider delayDuration={200}>
      <style jsx global>{`
        .keycap-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          padding: 0 16px;
          min-width: 96px;
          border-radius: 12px;
          background: linear-gradient(180deg, #282828, #202020);
          box-shadow:
            inset -8px 0 8px rgba(0, 0, 0, 0.15),
            inset 0 -8px 8px rgba(0, 0, 0, 0.25),
            0 0 0 2px rgba(0, 0, 0, 0.75),
            10px 20px 25px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
          transform: translateY(0);
        }
        .keycap-button::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 4px;
          bottom: 10px;
          right: 10px;
          background: linear-gradient(90deg, #232323, #4a4a4a);
          border-radius: 10px;
          box-shadow:
            -10px -10px 10px rgba(255, 255, 255, 0.25),
            10px 5px 10px rgba(0, 0, 0, 0.15);
          border-left: 1px solid #0004;
          border-bottom: 1px solid #0004;
          border-top: 1px solid #0009;
          transition: all 0.1s ease-in-out;
        }
        .keycap-button > * {
          position: relative;
          z-index: 1;
          color: #e9e9e9;
        }
        .keycap-button.keycap-icon-only {
          min-width: 56px;
          width: 56px;
          height: 56px;
          padding: 0;
          gap: 0;
        }
        .keycap-label {
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .keycap-button:active {
          transform: translateY(5px) !important;
          box-shadow:
            inset -7px 0 7px rgba(0, 0, 0, 0.2),
            inset 0 -7px 7px rgba(0, 0, 0, 0.24),
            0 0 0 2px rgba(0, 0, 0, 0.45),
            4px 9px 14px rgba(0, 0, 0, 0.38);
        }
        .keycap-button[data-state="open"] {
          transform: translateY(5px) !important;
          box-shadow:
            inset -7px 0 7px rgba(0, 0, 0, 0.2),
            inset 0 -7px 7px rgba(0, 0, 0, 0.24),
            0 0 0 2px rgba(0, 0, 0, 0.45),
            4px 9px 14px rgba(0, 0, 0, 0.38);
        }
        .keycap-button:active::before {
          top: 7px;
          left: 6px;
          bottom: 6px;
          right: 6px;
          box-shadow:
            -4px -4px 4px rgba(255, 255, 255, 0.12),
            4px 2px 4px rgba(0, 0, 0, 0.1);
        }
        .keycap-icon button {
          width: 44px;
          height: 44px;
          padding: 0;
          border-radius: 12px;
          background: linear-gradient(180deg, #282828, #202020);
          box-shadow:
            inset -8px 0 8px rgba(0, 0, 0, 0.15),
            inset 0 -8px 8px rgba(0, 0, 0, 0.25),
            0 0 0 2px rgba(0, 0, 0, 0.75),
            10px 20px 25px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          position: relative;
          transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in;
        }
        .keycap-icon button::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 4px;
          bottom: 10px;
          right: 10px;
          background: linear-gradient(90deg, #232323, #4a4a4a);
          border-radius: 10px;
          box-shadow:
            -10px -10px 10px rgba(255, 255, 255, 0.25),
            10px 5px 10px rgba(0, 0, 0, 0.15);
          border-left: 1px solid #0004;
          border-bottom: 1px solid #0004;
          border-top: 1px solid #0009;
          transition: all 0.1s ease-in-out;
        }
        .keycap-icon button > * {
          position: relative;
          z-index: 1;
          color: #e9e9e9;
        }
        .keycap-icon button:active {
          transform: translateY(5px) !important;
          box-shadow:
            inset -7px 0 7px rgba(0, 0, 0, 0.2),
            inset 0 -7px 7px rgba(0, 0, 0, 0.24),
            0 0 0 2px rgba(0, 0, 0, 0.45),
            4px 9px 14px rgba(0, 0, 0, 0.38);
        }
        .keycap-icon button:active::before {
          top: 7px;
          left: 6px;
          bottom: 6px;
          right: 6px;
          box-shadow:
            -4px -4px 4px rgba(255, 255, 255, 0.12),
            4px 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      {/* Header */}
      <div className="sticky top-4 z-30 -mx-2 px-2 py-2 rounded-[2.5rem] bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className={`leads-header-panel rounded-2xl border border-white/28 bg-white/26 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-[6px] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] ${isHeaderCompact ? 'opacity-0 -translate-y-2 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'}`}>
          <h1 className="pattern-readable-title text-4xl font-black tracking-tight uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">Leads</h1>
          <p className="pattern-readable-subtitle text-lg font-extrabold text-slate-700 mt-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">
            Manage your high-intent pipeline and accelerate conversions.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="keycap-icon">
            <NotificationBell />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="keycap-button border-0 bg-transparent hover:bg-transparent">
                <Filter className="w-4 h-4 mr-2" />
                <span className="keycap-label">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 min-w-5 rounded-full border-0 bg-white/20 px-1.5 text-[10px] text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Filter Leads</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={resetFilters}
                className="mb-1 font-bold text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                Clear filters
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-stone-500">Status</DropdownMenuLabel>
              {availableStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilters.includes(status)}
                  onCheckedChange={(checked) =>
                    setStatusFilters((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)))
                  }
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={showOnlyScheduled} onCheckedChange={(checked) => setShowOnlyScheduled(Boolean(checked))}>
                Scheduled only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={showHighValueOnly} onCheckedChange={(checked) => setShowHighValueOnly(Boolean(checked))}>
                High value ($100+)
              </DropdownMenuCheckboxItem>
              {isTeamContext && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-stone-500">Owner</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={ownerFilter === 'all'} onCheckedChange={() => setOwnerFilter('all')}>
                    All owners
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={ownerFilter === 'mine'} onCheckedChange={() => setOwnerFilter('mine')}>
                    Mine only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={ownerFilter === 'team'} onCheckedChange={() => setOwnerFilter('team')}>
                    Team only
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="keycap-button border-0 bg-transparent hover:bg-transparent">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                <span className="keycap-label">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportAsCsv}>CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsPdf}>PDF (Print)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsDoc}>DOC (.doc)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsJson}>JSON (.json)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsTxt}>TXT (.txt)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {teamRole === 'viewer' && (
            <Badge className="bg-amber-100 text-amber-700 border-0">Viewer Mode</Badge>
          )}
        </div>
      </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-tutorial-id="leads-stats">
        <Card className="doodle-panel rounded-[2.5rem] border border-white/10 shadow-[0_10px_24px_rgba(15,23,42,0.24)] bg-[#1f1f23] text-[#FAFAF9] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-full">
                <Calculator className="h-5 w-5 text-stone-300" />
              </div>
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">Projected Revenue</p>
            </div>
            <p className="text-5xl font-black tracking-tight">
              ${stats.projectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center mt-5 text-[11px] font-black gap-2">
              <span className="bg-[#2a2f3a] text-[#9fb4ff] px-3 py-1.5 rounded-xl uppercase tracking-widest text-[11px] leading-none">
                Avg: ${stats.averageDealValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-stone-400 uppercase tracking-widest">From {stats.closedCount} deals</span>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Revenue Momentum</div>
              <div className="flex items-end gap-1.5 h-8">
                {revenueMomentum.bars.map((h, i) => (
                  <span key={i} className="w-1.5 rounded-full bg-[#6f86ff]/70" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
              {revenueMomentum.points > 0
                ? `Last ${revenueMomentum.points} closed deals total $${revenueMomentum.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : 'No closed deals yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="doodle-panel rounded-[2.5rem] border border-white/10 shadow-[0_10px_24px_rgba(15,23,42,0.24)] bg-[#1f1f23] text-[#FAFAF9] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-full">
                <Target className="h-5 w-5 text-stone-300" />
              </div>
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">Active Pipeline</p>
            </div>
            <p className="text-5xl font-black tracking-tight">{stats.activeCount}</p>
            <div className="flex flex-col gap-2 mt-5">
              <div className="text-[11px] leading-none font-black text-emerald-200 bg-emerald-900/45 w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
                High intent leads
              </div>
              <div className="text-[11px] leading-none font-black text-stone-300 bg-[#2a2f3a] w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
                Avg Close: {formatDuration(stats.avgCloseMs)}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">
                <span>Pipeline Utilization</span>
                <span>{pipelineUtilizationPct}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#2a2f3a] overflow-hidden">
                <div
                  className="h-full bg-emerald-400/80 rounded-full transition-all"
                  style={{ width: `${pipelineUtilizationPct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="doodle-panel rounded-[2.5rem] border border-white/10 shadow-[0_10px_24px_rgba(15,23,42,0.24)] bg-[#1f1f23] text-[#FAFAF9] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-full">
                <DollarSign className="h-5 w-5 text-stone-300" />
              </div>
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">Closed Value</p>
            </div>
            <p className="text-5xl font-black tracking-tight">${stats.totalClosedValue.toLocaleString()}</p>
            <div className="flex items-center mt-5 text-[11px] leading-none font-black text-stone-200 bg-[#2a2f3a] w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
              Closing Rate: {leads.length > 0 ? ((stats.closedCount / leads.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#2a2f3a] px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Won Deals</p>
                <p className="text-lg font-black text-emerald-200 mt-1">{stats.closedCount}</p>
              </div>
              <div className="rounded-xl bg-[#2a2f3a] px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-400">Pipeline Total</p>
                <p className="text-lg font-black text-stone-100 mt-1">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <div className="bg-stone-50/90 rounded-[2.5rem] border border-white/40 shadow-[0_6px_18px_rgba(15,23,42,0.10)] backdrop-blur-[2px] overflow-hidden transition-all duration-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.13)] relative" data-tutorial-id="leads-table">
        {/* Table Controls */}
        <div className="p-8 border-b border-white/60">
          <div className="flex items-center gap-6">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-700 transition-colors" />
              <Input 
                placeholder="Search by company or contact..." 
                className="pl-12 bg-stone-100/90 border-none focus:bg-white/95 focus:ring-2 focus:ring-stone-200 transition-all h-14 rounded-2xl font-bold text-stone-800 placeholder:text-stone-500 shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="keycap-button keycap-icon-only border-0 bg-transparent hover:bg-transparent relative">
                    <Filter className="w-6 h-6" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-[10px] font-black text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1">
                  <DropdownMenuLabel className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                    Quick Filters
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={showOnlyScheduled} onCheckedChange={(checked) => setShowOnlyScheduled(Boolean(checked))}>
                    Scheduled only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={showHighValueOnly} onCheckedChange={(checked) => setShowHighValueOnly(Boolean(checked))}>
                    High value ($100+)
                  </DropdownMenuCheckboxItem>
                  {isTeamContext && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-stone-500">Owner</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem checked={ownerFilter === 'all'} onCheckedChange={() => setOwnerFilter('all')}>
                        All owners
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={ownerFilter === 'mine'} onCheckedChange={() => setOwnerFilter('mine')}>
                        Mine only
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={ownerFilter === 'team'} onCheckedChange={() => setOwnerFilter('team')}>
                        Team only
                      </DropdownMenuCheckboxItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-stone-500">Status</DropdownMenuLabel>
                  {availableStatuses.slice(0, 8).map((status) => (
                    <DropdownMenuCheckboxItem
                      key={`quick-${status}`}
                      checked={statusFilters.includes(status)}
                      onCheckedChange={(checked) =>
                        setStatusFilters((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)))
                      }
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetFilters} className="font-bold text-red-600 focus:bg-red-50 focus:text-red-700">
                    Clear all filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {activeFilterChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">Active Filters</span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-200"
                  title="Click to remove this filter"
                >
                  <span>{chip.label}</span>
                  <XCircle className="h-3.5 w-3.5 text-stone-500" />
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600 hover:bg-red-100"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="px-4 relative min-h-[640px]" aria-busy={isLeadsLoading}>
          <div className={`absolute inset-0 px-4 pb-24 pt-4 transition-opacity duration-300 ${isLeadsLoading && paginatedLeads.length === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`leads-table-skeleton-${idx}`}
                  className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-[pulse_1.4s_ease-in-out_infinite]" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-stone-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 rounded-full bg-stone-200 animate-pulse" />
                      <div className="h-3 w-28 rounded-full bg-stone-200 animate-pulse" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-stone-200 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`transition-all duration-300 ${isLeadsLoading && paginatedLeads.length === 0 ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
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
                  <span className="text-xs font-black text-stone-500">{computeTimeToClose(lead)}</span>
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
    <div className="flex min-h-screen platform-pattern-bg app-shell-text">
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
