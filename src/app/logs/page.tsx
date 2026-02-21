'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
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
  Globe,
  RotateCcw
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
import { supabase } from '@/lib/supabase';
import { actorColorClass, getRoleCapabilities } from '@/lib/team-role';
import { useLeadScope } from '@/hooks/use-lead-scope';
import { NotificationBell } from '@/components/notification-bell';

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
const STATUS_GROUPS = ['No Answer', 'Not Interested', 'Interested', 'Meeting Scheduled', 'Closed Deal', 'Deal Lost'];
const SYSTEM_GROUPS = ['Closed Deal', 'Deal Lost', 'No Answer', 'Not Interested', 'Interested', 'Meeting Scheduled'];
const MAX_HISTORY_ITEMS_PER_LEAD = 80;
const LOST_COLOR = 'bg-red-100 text-red-700';

const TIMER_COOKIE = 'ika_lead_timers';
const TIMER_COOKIE_DAYS = 2;

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/`;
};

const readTimers = (): Record<string, { start: number; elapsed: number; running: boolean; lastTick: number; stop?: number }> => {
  try {
    const raw = getCookie(TIMER_COOKIE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeTimers = (timers: Record<string, { start: number; elapsed: number; running: boolean; lastTick: number; stop?: number }>) => {
  try {
    setCookie(TIMER_COOKIE, JSON.stringify(timers), TIMER_COOKIE_DAYS);
  } catch {
    // ignore cookie write failures
  }
};

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

const ensureGroupOrder = (groups: string[]) => {
  const unique = Array.from(new Set(groups.filter(Boolean)));
  const rest = unique.filter((g) => !SYSTEM_GROUPS.includes(g));
  return [...SYSTEM_GROUPS, ...rest];
};

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

const historyTimestampMs = (entry: any) => {
  const raw = entry?.timestamp || entry?.date || '';
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
};

const historyEntryKey = (entry: any) => {
  const action = String(entry?.result || entry?.action || '').trim().toLowerCase();
  const note = String(entry?.note || '').trim();
  const actor = String(entry?.actor_name || entry?.actorName || '').trim().toLowerCase();
  const ts = historyTimestampMs(entry);
  return `${action}|${note}|${actor}|${ts}`;
};

const mapLeadLogRowToHistory = (row: any) => ({
  id: row.id,
  leadLogId: row.id,
  type: 'call',
  result: row.action || 'Interaction',
  date: row.created_at ? format(new Date(row.created_at), 'MMM d, h:mm a') : 'Unknown',
  timestamp: row.created_at || null,
  note: row.note || 'No notes added.',
  actor_name: row.actor_name || undefined,
  actorName: row.actor_name || undefined,
});

const mergeHistoryEntries = (existing: any[], fromLeadLogs: any[]) => {
  const merged: any[] = [];
  const seen = new Set<string>();
  for (const entry of [...fromLeadLogs, ...existing]) {
    const key = historyEntryKey(entry);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged.sort((a, b) => historyTimestampMs(b) - historyTimestampMs(a));
};

const deriveLeadStateFromLatestHistory = (lead: any, history: any[]) => {
  if (!Array.isArray(history) || history.length === 0) return lead;
  const latest = history[0];
  const latestResult = String(latest?.result || '').trim();
  if (!latestResult) return lead;

  const normalizedStatus = String(lead?.status || '').trim().toLowerCase();
  const normalizedLeadStatus = String(lead?.leadStatus || '').trim().toLowerCase();
  const hasExplicitStatus =
    [
      'meeting scheduled',
      'interested',
      'not interested',
      'no answer',
      'closed deal',
      'deal lost',
      'sale made',
      'closed',
      'lost',
    ].includes(normalizedStatus) ||
    ['meeting-scheduled', 'not-interested', 'no-answer', 'sale-made', 'closed-lost'].includes(normalizedLeadStatus);

  // Only hydrate when row still has a base/unset status.
  if (hasExplicitStatus) return lead;

  const next = { ...lead, lastContact: latest?.date || lead?.lastContact || 'Never' };
  switch (latestResult) {
    case 'Meeting Scheduled':
      next.status = 'Meeting Scheduled';
      next.leadStatus = 'meeting-scheduled';
      next.color = 'bg-blue-100 text-blue-700';
      break;
    case 'Interested':
      next.status = 'Interested';
      next.color = 'bg-amber-100 text-amber-700';
      break;
    case 'Not Interested':
      next.status = 'Not Interested';
      next.leadStatus = 'not-interested';
      next.color = 'bg-rose-100 text-rose-700';
      break;
    case 'No Answer':
      next.status = 'No Answer';
      next.leadStatus = 'no-answer';
      next.color = 'bg-amber-100 text-amber-700';
      break;
    case 'Closed Deal':
      next.status = 'Closed Deal';
      next.leadStatus = 'sale-made';
      next.color = 'bg-green-100 text-green-700';
      break;
    case 'Deal Lost':
      next.status = 'Deal Lost';
      next.leadStatus = 'closed-lost';
      next.color = LOST_COLOR;
      break;
    default:
      break;
  }

  return next;
};

const mapLeadRowToUi = (row: any) => ({
  id: row.id,
  businessName: row.business_name ?? row.businessName ?? row.name ?? '',
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
  history: Array.isArray(row.history) ? row.history.slice(0, MAX_HISTORY_ITEMS_PER_LEAD) : [],
  groups: Array.isArray(row.groups) ? row.groups : [],
  openedAt: row.opened_at ? Date.parse(row.opened_at) : row.openedAt,
  closedAt: row.closed_at ? Date.parse(row.closed_at) : row.closedAt,
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

function LogsPageContent() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('14:00');
  const [selectedConclusion, setSelectedConclusion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dealAmount, setDealAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Use a debounced search term to prevent lagging while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actorName, setActorName] = useState<string>('');
  
  // Leads & Groups State
  const [leads, setLeads] = useState<any[]>([]);
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState('All Leads');
  const [newGroupName, setNewGroupName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<{leadId: string, logId: string | number} | null>(null);
  const { toast } = useToast();
  const [timerTick, setTimerTick] = useState(Date.now());
  const [lastReopen, setLastReopen] = useState<{ leadId: string; snapshot: any } | null>(null);
  const [teamCanEdit, setTeamCanEdit] = useState(true);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const { isMineScope } = useLeadScope();
  const consumedDeepLinkRef = useRef<string | null>(null);
  const previousLeadIdRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;
    const loadSupabase = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) {
            setLeads(DEFAULT_LEADS);
            setCustomGroups(ensureGroupOrder([...DEFAULT_GROUPS, ...STATUS_GROUPS]));
          }
          return;
        }

        const uid = session.user.id;
        if (mounted) setUserId(uid);
        if (mounted) setCurrentUserId(uid);
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
          if (viewerOwnMode) {
            resolvedTeamId = null;
          }
          if (mounted) {
            setTeamCanEdit(viewerOwnMode ? true : caps.canEdit);
            setTeamRole(caps.role);
            setTeamId(viewerOwnMode ? null : resolvedTeamId);
          }
        } catch {
          // Keep editable fallback.
        }

        let displayName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email ||
          'Team Member';

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', uid)
          .maybeSingle();
        if (profile?.full_name) displayName = profile.full_name;
        if (mounted) setActorName(displayName);

        const leadsQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
        const [settingsRes, leadsRes] = await Promise.all([
          supabase.from('user_settings').select('custom_groups').eq('user_id', uid).maybeSingle(),
          resolvedTeamId
            ? leadsQuery.or(`team_id.eq.${resolvedTeamId},user_id.eq.${uid}`)
            : leadsQuery.eq('user_id', uid),
        ]);

        let groups = settingsRes.data?.custom_groups || DEFAULT_GROUPS;
        const mergedGroups = ensureGroupOrder([...groups, ...STATUS_GROUPS]);

        if (!settingsRes.data) {
          await supabase.from('user_settings').insert({ user_id: uid, custom_groups: mergedGroups });
        } else if (mergedGroups.join('|') !== groups.join('|')) {
          await supabase.from('user_settings').update({ custom_groups: mergedGroups }).eq('user_id', uid);
        }

        let normalizedLeads = (leadsRes.data || []).map(mapLeadRowToUi);
        if (normalizedLeads.length > 0) {
          const leadIds = normalizedLeads.map((l: any) => l.id);
          const { data: logRows } = await supabase
            .from('lead_logs')
            .select('id, lead_id, actor_name, action, note, created_at')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false });

          if (Array.isArray(logRows) && logRows.length > 0) {
            const grouped = new Map<string, any[]>();
            for (const row of logRows) {
              const mapped = mapLeadLogRowToHistory(row);
              const arr = grouped.get(row.lead_id) || [];
              arr.push(mapped);
              grouped.set(row.lead_id, arr);
            }
            normalizedLeads = normalizedLeads.map((lead: any) => {
              const fromDb = grouped.get(lead.id) || [];
              const mergedHistory = mergeHistoryEntries(
                Array.isArray(lead.history) ? lead.history : [],
                fromDb
              ).slice(0, MAX_HISTORY_ITEMS_PER_LEAD);
              const hydrated = {
                ...lead,
                history: mergedHistory,
              };
              return deriveLeadStateFromLatestHistory(hydrated, mergedHistory);
            });
          }
        }

        if (mounted) {
          setCustomGroups(mergedGroups);
          setLeads(normalizedLeads);
        }
      } catch (e) {
        console.error("Failed to load logs data", e);
      }
    };

    loadSupabase();
    return () => {
      mounted = false;
    };
  }, [isMineScope]);

  useEffect(() => {
    const leadId = searchParams?.get('leadId');
    if (!leadId || leads.length === 0) return;
    if (consumedDeepLinkRef.current === leadId) return;
    const exists = leads.find((l) => l.id === leadId);
    if (exists) {
      const isClosed =
        ['Closed Deal', 'Deal Lost', 'Closed', 'Sale Made'].includes(exists.status) ||
        ['sale-made', 'closed-lost'].includes((exists.leadStatus || '').toLowerCase());
      const targetGroup: string = isClosed
        ? ((exists.status === 'Deal Lost' || (exists.leadStatus || '').toLowerCase() === 'closed-lost')
            ? 'Deal Lost'
            : 'Closed Deal')
        : 'All Leads';

      if (activeGroup !== targetGroup) {
        setActiveGroup(targetGroup);
      }
      if (searchTerm) {
        setSearchTerm('');
        setDebouncedSearch('');
      }

      const targetFilteredLeads = leads.filter((lead) => {
        const inGroup = lead.groups && lead.groups.includes(targetGroup);
        const isGroupByStatus =
          (targetGroup === 'Closed Deal' && (lead.status === 'Closed Deal' || lead.leadStatus === 'sale-made')) ||
          (targetGroup === 'Deal Lost' && (lead.status === 'Deal Lost' || lead.leadStatus === 'closed-lost')) ||
          (targetGroup === 'Meeting Scheduled' && (lead.status === 'Meeting Scheduled' || lead.leadStatus === 'meeting-scheduled')) ||
          (targetGroup === 'Interested' && lead.status === 'Interested') ||
          (targetGroup === 'Not Interested' && lead.status === 'Not Interested') ||
          (targetGroup === 'No Answer' && lead.status === 'No Answer');
        const matchesGroup = targetGroup === 'All Leads' ? !isClosedStatus(lead) : (inGroup || isGroupByStatus);
        return matchesGroup;
      });
      const targetIndex = targetFilteredLeads.findIndex((l) => l.id === leadId);
      if (targetIndex >= 0) {
        setCurrentPage(Math.floor(targetIndex / itemsPerPage) + 1);
      } else {
        setCurrentPage(1);
      }

      consumedDeepLinkRef.current = leadId;
      setSelectedLeadId(leadId);
      // Apply redirect selection once, then remove query param so manual selections are not overridden.
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.delete('leadId');
        const nextQuery = params.toString();
        const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        window.history.replaceState({}, '', nextUrl);
      }
    }
  }, [searchParams, leads, pathname]);

  // Reset unsaved interaction form state when switching to another lead.
  useEffect(() => {
    if (!selectedLeadId) {
      previousLeadIdRef.current = null;
      return;
    }
    if (previousLeadIdRef.current && previousLeadIdRef.current !== selectedLeadId) {
      setSelectedConclusion(null);
      setNote('');
      setDealAmount('');
      setIsCalendarOpen(false);
    }
    previousLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  const activeLead = leads.find(l => l.id === selectedLeadId);
  const isClosedLead = !!activeLead && (
    ['Closed Deal', 'Deal Lost', 'Closed', 'Sale Made'].includes(activeLead.status) ||
    ['sale-made', 'closed-lost'].includes(activeLead.leadStatus)
  );

  const activeTimer = useMemo(() => {
    if (!activeLead) return null;
    const timers = readTimers();
    return timers[activeLead.id];
  }, [activeLead, timerTick]);

  const activeDurationMs = useMemo(() => {
    if (!activeTimer) return null;
    if (!activeTimer.running) return activeTimer.elapsed;
    return activeTimer.elapsed + Math.max(0, timerTick - activeTimer.lastTick);
  }, [activeTimer, timerTick]);

  useEffect(() => {
    if (!activeLead) return;
    const now = Date.now();
    const timers = readTimers();
    const existing = timers[activeLead.id];
    if (!existing) {
      timers[activeLead.id] = { start: now, elapsed: 0, running: true, lastTick: now };
      writeTimers(timers);
    } else if (existing.running) {
      timers[activeLead.id] = { ...existing, lastTick: now };
      writeTimers(timers);
    }
    // Persist openedAt for leads page stats
    if (!activeLead.openedAt) {
      const updatedLeads = leads.map(l =>
        l.id === activeLead.id ? { ...l, openedAt: Date.now() } : l
      );
      setLeads(updatedLeads);
      const updated = updatedLeads.find(l => l.id === activeLead.id);
      if (updated) {
        supabase.from('leads').update(buildLeadUpdatePayload(updated)).eq('id', updated.id);
      }
    }
  }, [activeLead, leads]);

  useEffect(() => {
    if (!activeLead) return;
    const timers = readTimers();
    const t = timers[activeLead.id];
    if (!t || !t.running) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const next = readTimers();
      const current = next[activeLead.id];
      if (!current || !current.running) return;
      const increment = Math.max(0, now - current.lastTick);
      next[activeLead.id] = {
        ...current,
        elapsed: current.elapsed + increment,
        lastTick: now,
      };
      writeTimers(next);
      setTimerTick(now);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeLead]);

    const conclusions = [
      { id: 'scheduled', label: 'Meeting Scheduled', icon: CalendarIcon, color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { id: 'interested', label: 'Interested', icon: CheckCircle2, color: 'bg-amber-100 text-amber-700 border-amber-200' },
      { id: 'not-interested', label: 'Not Interested', icon: XCircle, color: 'bg-rose-100 text-rose-700 border-rose-200' },
      { id: 'no-answer', label: 'No Answer', icon: Phone, color: 'bg-orange-100 text-orange-700 border-orange-200' },
      { id: 'closed', label: 'Closed Deal', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { id: 'lost', label: 'Deal Lost', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' },
    ];

  const handleSelectConclusion = (id: string) => {
      if (!teamCanEdit) return;
      setSelectedConclusion(id);
      if (id === 'scheduled') {
        setIsCalendarOpen(true);
      } else {
        setIsCalendarOpen(false); // Close calendar if another option is selected
      }
      if (id !== 'closed') {
        setDealAmount('');
      }
    };

    const handleSaveLog = async () => {
      if (!teamCanEdit) {
        toast({
          title: 'Read-only access',
          description: 'Viewer role can view/export only.',
          variant: 'destructive'
        });
        return;
      }
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
    const dealAmountValue = selectedConclusion === 'closed' ? dealAmount : '';
    const noteText = note.trim();
    const noteParts: string[] = [];
    if (selectedConclusion === 'closed' && dealAmountValue) {
      noteParts.push(`Amount: $${dealAmountValue}`);
    }
    if (noteText) {
      noteParts.push(noteText);
    }

    const newEntry = {
      id: Date.now(),
      type: selectedConclusion === 'scheduled' ? 'meeting' : 'call',
      result: conclusionObj?.label || 'Interaction',
      date: logDate,
      timestamp: timestamp,
      note: noteParts.length > 0 ? noteParts.join(' | ') : 'No notes added.',
      actor_name: actorName || undefined,
      actorName: actorName || undefined,
    };

    const leadToUpdate = leads.find(l => l.id === selectedLeadId);
    if (!leadToUpdate) return;

    const updatedLeads = leads.map(lead => {
      if (lead.id === selectedLeadId) {
        let newColor = lead.color;
        let newValue = lead.value;
        let nextGroups = Array.isArray(lead.groups) ? [...lead.groups] : [];

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

        const statusGroupMap: Record<string, string> = {
          scheduled: 'Meeting Scheduled',
          interested: 'Interested',
          'not-interested': 'Not Interested',
          'no-answer': 'No Answer',
          closed: 'Closed Deal',
          lost: 'Deal Lost',
        };
        const statusGroup = statusGroupMap[selectedConclusion] || null;
        if (statusGroup) {
          nextGroups = Array.from(new Set([statusGroup, ...nextGroups]));
        }

        switch(newStatus) {
          case 'Not Interested': newColor = 'bg-rose-100 text-rose-700'; break;
          case 'Interested': newColor = 'bg-amber-100 text-amber-700'; break;
          case 'Meeting Scheduled': newColor = 'bg-blue-100 text-blue-700'; break;
          case 'Closed Deal': 
            newColor = 'bg-green-100 text-green-700';
            if (dealAmountValue) newValue = `$${parseFloat(dealAmountValue).toLocaleString()}`;
            break;
          case 'Deal Lost': 
            newColor = 'bg-red-100 text-red-700';
            break;
          case 'No Answer': newColor = 'bg-amber-100 text-amber-700'; break;
        }
          
          const updatedLead = {
            ...lead,
            status: newStatus,
            leadStatus: newLeadStatus,
            scheduledDate: scheduledStr || lead.scheduledDate,
            value: newValue,
            color: newColor,
            lastContact: 'Just now',
            history: [newEntry, ...(lead.history || [])],
            groups: nextGroups,
          };
          if (isDealOutcome) {
            updatedLead.closedAt = Date.now();
          }
          return updatedLead;
        }
        return lead;
      });

      setLeads(updatedLeads);
      let logSaved = false;
      if (selectedLeadId) {
        const updated = updatedLeads.find(l => l.id === selectedLeadId);
        if (updated) {
          const { error: updateErr } = await supabase
            .from('leads')
            .update(buildLeadUpdatePayload(updated))
            .eq('id', updated.id);
          if (updateErr) {
            toast({
              title: "Save Failed",
              description: updateErr.message,
              variant: "destructive",
            });
            return;
          }
          if (userId) {
            const { error: logErr } = await supabase.from('lead_logs').insert({
              lead_id: updated.id,
              actor_id: userId,
              actor_name: actorName || null,
              action: newEntry.result,
              note: newEntry.note,
            });
            if (logErr) {
              toast({
                title: "Log Save Failed",
                description: logErr.message,
                variant: "destructive",
              });
            } else {
              logSaved = true;
            }
          }
        }
      }

      if (selectedLeadId) {
        const timers = readTimers();
        const existing = timers[selectedLeadId];
        if (existing) {
          const now = Date.now();
          const increment = Math.max(0, now - existing.lastTick);
          const next = {
            ...existing,
            elapsed: existing.elapsed + increment,
            lastTick: now,
          };
          if (isDealOutcome) {
            next.running = false;
            next.stop = now;
          }
          timers[selectedLeadId] = next;
          writeTimers(timers);
        }
      }

      toast({
        title: "Interaction Logged",
        description: scheduledStr 
          ? `Meeting scheduled for ${scheduledStr}` 
          : `Saved log for ${leadToUpdate.businessName || leadToUpdate.correctedBusinessName || leadToUpdate.name || 'Lead'}`,
      });
      if (logSaved) {
        toast({
          title: "Lead Log Saved",
          description: "Your interaction was saved to lead_logs.",
        });
      }

    // Reset Form
    setSelectedConclusion(null);
    setNote('');
    setDealAmount('');
  };

  const isClosedStatus = (lead: any) => {
    const status = (lead.status || '').toLowerCase();
    const leadStatus = (lead.leadStatus || '').toLowerCase();
    return (
      ['closed deal', 'deal lost', 'closed', 'sale made'].includes(status) ||
      ['closed-lost', 'sale-made'].includes(leadStatus)
    );
  };

  const activeLeads = useMemo(
    () => leads.filter((lead) => !isClosedStatus(lead)),
    [leads]
  );
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const statusBuckets = {
      'Closed Deal': (lead: any) => lead.status === 'Closed Deal' || lead.leadStatus === 'sale-made',
      'Deal Lost': (lead: any) => lead.status === 'Deal Lost' || lead.leadStatus === 'closed-lost',
      'Meeting Scheduled': (lead: any) => lead.status === 'Meeting Scheduled' || lead.leadStatus === 'meeting-scheduled',
      'Interested': (lead: any) => lead.status === 'Interested',
      'Not Interested': (lead: any) => lead.status === 'Not Interested',
      'No Answer': (lead: any) => lead.status === 'No Answer',
    };

    for (const lead of leads) {
      const leadGroups = new Set<string>(Array.isArray(lead.groups) ? lead.groups : []);
      for (const [label, fn] of Object.entries(statusBuckets)) {
        if (fn(lead)) {
          if (!leadGroups.has(label)) {
            counts[label] = (counts[label] || 0) + 1;
          }
        }
      }
      for (const g of leadGroups) {
        counts[g] = (counts[g] || 0) + 1;
      }
    }
    return counts;
  }, [leads]);

  // Memoize filtered leads for performance on large datasets
  const filteredLeads = useMemo(() => {
    const lowerSearch = debouncedSearch.toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch =
        (lead.businessName || '').toLowerCase().includes(lowerSearch) ||
        (lead.contactName || '').toLowerCase().includes(lowerSearch);
      const inGroup = lead.groups && lead.groups.includes(activeGroup);
      const isGroupByStatus =
        (activeGroup === 'Closed Deal' && (lead.status === 'Closed Deal' || lead.leadStatus === 'sale-made')) ||
        (activeGroup === 'Deal Lost' && (lead.status === 'Deal Lost' || lead.leadStatus === 'closed-lost')) ||
        (activeGroup === 'Meeting Scheduled' && (lead.status === 'Meeting Scheduled' || lead.leadStatus === 'meeting-scheduled')) ||
        (activeGroup === 'Interested' && lead.status === 'Interested') ||
        (activeGroup === 'Not Interested' && lead.status === 'Not Interested') ||
        (activeGroup === 'No Answer' && lead.status === 'No Answer');
      const searchingAllLeads = activeGroup === 'All Leads' && lowerSearch.length > 0;
      const matchesGroup = activeGroup === 'All Leads'
        ? (searchingAllLeads ? true : !isClosedStatus(lead))
        : (inGroup || isGroupByStatus);
      return matchesSearch && matchesGroup;
    });
  }, [leads, debouncedSearch, activeGroup]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handleReopenLead = () => {
    if (!teamCanEdit) return;
    if (!activeLead) return;
    setLastReopen({ leadId: activeLead.id, snapshot: { ...activeLead } });
    const now = new Date();
    const logDate = format(now, 'MMM d, h:mm a');
    const newEntry = {
      id: Date.now(),
      type: 'status',
      result: 'Reopened',
      date: logDate,
      timestamp: now.toISOString(),
      note: 'Lead reopened.',
      actor_name: actorName || undefined,
      actorName: actorName || undefined,
    };

    const updatedLeads = leads.map((lead) => {
      if (lead.id !== activeLead.id) return lead;
      const cleanedGroups = (Array.isArray(lead.groups) ? lead.groups : []).filter(
        (g: string) => !['Closed Deal', 'Deal Lost', 'Closed Deals'].includes(g)
      );
      return {
        ...lead,
        status: 'In Progress',
        leadStatus: 'new',
        color: 'bg-stone-100 text-stone-600',
        closedAt: null,
        lastContact: 'Just now',
        groups: cleanedGroups,
        history: [newEntry, ...(lead.history || [])],
      };
    });

    setLeads(updatedLeads);
    const updated = updatedLeads.find(l => l.id === activeLead.id);
    if (updated) {
      supabase.from('leads').update(buildLeadUpdatePayload(updated)).eq('id', updated.id);
      if (userId) {
        supabase.from('lead_logs').insert({
          lead_id: updated.id,
          actor_id: userId,
          actor_name: actorName || null,
          action: 'Reopened',
          note: newEntry.note,
        });
      }
    }

    const timers = readTimers();
    const existing = timers[activeLead.id];
    const nowMs = Date.now();
    if (existing) {
      timers[activeLead.id] = {
        ...existing,
        running: true,
        stop: undefined,
        lastTick: nowMs,
      };
    } else {
      timers[activeLead.id] = { start: nowMs, elapsed: 0, running: true, lastTick: nowMs };
    }
    writeTimers(timers);

    toast({
      title: "Lead Reopened",
      description: "The lead is now active again.",
    });
  };

  const handleUndoReopen = () => {
    if (!teamCanEdit) return;
    if (!lastReopen) return;
    const { leadId, snapshot } = lastReopen;
    const updatedLeads = leads.map((lead) => (lead.id === leadId ? snapshot : lead));
    setLeads(updatedLeads);
    const updated = updatedLeads.find(l => l.id === leadId);
    if (updated) {
      supabase.from('leads').update(buildLeadUpdatePayload(updated)).eq('id', updated.id);
      if (userId) {
        supabase.from('lead_logs').insert({
          lead_id: updated.id,
          actor_id: userId,
          actor_name: actorName || null,
          action: 'Reopen Undone',
          note: 'Undo reopen action.',
        });
      }
    }

    const timers = readTimers();
    if (snapshot?.closedAt) {
      const existing = timers[leadId];
      if (existing) {
        timers[leadId] = {
          ...existing,
          running: false,
          stop: snapshot.closedAt,
          lastTick: Date.now(),
        };
        writeTimers(timers);
      }
    }

    setLastReopen(null);
    toast({
      title: "Reopen Undone",
      description: "The lead was reverted to its previous state.",
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleCreateGroup = () => {
    if (!teamCanEdit) return;
    if (newGroupName && !customGroups.includes(newGroupName)) {
      const updatedGroups = ensureGroupOrder([...customGroups, newGroupName]);
      setCustomGroups(updatedGroups);
      if (userId) {
        supabase.from('user_settings').upsert({ user_id: userId, custom_groups: updatedGroups });
      }
      setNewGroupName('');
      setDialogOpen(false);
      toast({
        title: "Category Created",
        description: `'${newGroupName}' added to your groups.`
      });
    }
  };

  const initiateDeleteLog = (e: React.MouseEvent, leadId: string, logId: string | number) => {
    e.stopPropagation();
    setLogToDelete({ leadId, logId });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLog = async () => {
    if (!teamCanEdit) return;
    if (!logToDelete) return;

    const { leadId, logId } = logToDelete;
    let removedEntry: any = null;
    
    const updatedLeads = leads.map(lead => {
      if (lead.id === leadId) {
        removedEntry = lead.history.find((log: any) => String(log.id) === String(logId)) || null;
        // Filter out the log
        const newHistory = lead.history.filter((log: any) => String(log.id) !== String(logId));
        
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
              newColor = 'bg-blue-100 text-blue-700';
              // Ideally parse scheduled date from note or log if stored, otherwise reset or keep
              break;
            case 'Interested':
              newStatus = 'Interested';
              newLeadStatus = 'new'; // or interested
              newColor = 'bg-amber-100 text-amber-700';
              break;
            case 'Not Interested':
              newStatus = 'Not Interested';
              newLeadStatus = 'not-interested';
              newColor = 'bg-rose-100 text-rose-700';
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
              newColor = 'bg-red-100 text-red-700';
              break;
            default: 
              newStatus = 'In Progress';
              newColor = 'bg-stone-100 text-stone-600';
          }
        }

        const baseGroups = Array.isArray(lead.groups)
          ? lead.groups.filter((g: string) => !SYSTEM_GROUPS.includes(g))
          : [];
        const statusToGroup: Record<string, string> = {
          'Meeting Scheduled': 'Meeting Scheduled',
          Interested: 'Interested',
          'Not Interested': 'Not Interested',
          'No Answer': 'No Answer',
          'Closed Deal': 'Closed Deal',
          'Deal Lost': 'Deal Lost',
        };
        const maybeStatusGroup = statusToGroup[newStatus] || null;
        const nextGroups = maybeStatusGroup
          ? Array.from(new Set([maybeStatusGroup, ...baseGroups]))
          : baseGroups;

        return {
          ...lead,
          history: newHistory,
          status: newStatus,
          leadStatus: newLeadStatus,
          color: newColor,
          value: newValue,
          scheduledDate: newScheduledDate, // Resetting scheduled date as simpler approach, user can re-schedule if needed
          lastContact: newLastContact,
          groups: nextGroups,
        };
      }
      return lead;
    });

    const updated = updatedLeads.find(l => l.id === leadId);
    if (updated) {
      const { error } = await supabase
        .from('leads')
        .update(buildLeadUpdatePayload(updated))
        .eq('id', updated.id);
      if (error) {
        toast({
          title: "Delete Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    // Remove the matching row from lead_logs as well so it doesn't return after refresh.
    if (removedEntry) {
      let deletedLeadLog = false;
      let leadLogDeleteError: string | null = null;
      if (removedEntry.leadLogId) {
        const { error: deleteByIdErr } = await supabase
          .from('lead_logs')
          .delete()
          .eq('id', String(removedEntry.leadLogId));
        if (!deleteByIdErr) {
          deletedLeadLog = true;
        } else {
          leadLogDeleteError = deleteByIdErr.message;
        }
      }

      // 1) Try precise match in a short created_at window around the entry timestamp.
      const ts = Date.parse(removedEntry.timestamp || removedEntry.date || '');
      let lookup = supabase
        .from('lead_logs')
        .select('id, created_at')
        .eq('lead_id', leadId)
        .eq('action', String(removedEntry.result || ''))
        .eq('note', String(removedEntry.note || ''));
      if (removedEntry.actor_name) {
        lookup = lookup.eq('actor_name', String(removedEntry.actor_name));
      }
      if (Number.isFinite(ts)) {
        lookup = lookup
          .gte('created_at', new Date(ts - 2 * 60 * 1000).toISOString())
          .lte('created_at', new Date(ts + 2 * 60 * 1000).toISOString());
      }

      const { data: matchedRows, error: lookupErr } = await lookup
        .order('created_at', { ascending: false })
        .limit(1);
      if (lookupErr) {
        leadLogDeleteError = lookupErr.message;
      }

      const matchedId = matchedRows?.[0]?.id;
      if (matchedId) {
        const { error: deleteMatchedErr } = await supabase
          .from('lead_logs')
          .delete()
          .eq('id', matchedId);
        if (!deleteMatchedErr) {
          deletedLeadLog = true;
        } else {
          leadLogDeleteError = deleteMatchedErr.message;
        }
      }

      // 2) Fallback: delete most-recent row for same action+note if timestamp format was not parseable.
      if (!deletedLeadLog) {
        const { data: fallbackRows, error: fallbackLookupErr } = await supabase
          .from('lead_logs')
          .select('id, created_at')
          .eq('lead_id', leadId)
          .eq('action', String(removedEntry.result || ''))
          .eq('note', String(removedEntry.note || ''))
          .order('created_at', { ascending: false })
          .limit(1);
        if (fallbackLookupErr) {
          leadLogDeleteError = fallbackLookupErr.message;
        }

        const fallbackId = fallbackRows?.[0]?.id;
        if (fallbackId) {
          const { error: fallbackDeleteErr } = await supabase
            .from('lead_logs')
            .delete()
            .eq('id', fallbackId);
          if (!fallbackDeleteErr) {
            deletedLeadLog = true;
          } else {
            leadLogDeleteError = fallbackDeleteErr.message;
          }
        }
      }

      if (!deletedLeadLog) {
        toast({
          title: "Lead Log Delete Failed",
          description: leadLogDeleteError || "Could not delete row in lead_logs.",
          variant: "destructive",
        });
      }
    }

    setLeads(updatedLeads);
    setDeleteDialogOpen(false);
    setLogToDelete(null);
    
    toast({
      title: "Log Deleted",
      description: "The interaction log has been removed and lead status updated."
    });
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupName: string) => {
    if (!teamCanEdit) return;
    e.stopPropagation();
    const updatedGroups = customGroups.filter(g => g !== groupName);
    setCustomGroups(updatedGroups);
    if (userId) {
      supabase.from('user_settings').upsert({ user_id: userId, custom_groups: updatedGroups });
    }
    
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
    updatedLeads.forEach((lead) => {
      supabase.from('leads').update({ groups: lead.groups }).eq('id', lead.id);
    });

    toast({
      title: "Category Deleted",
      description: `'${groupName}' has been removed.`
    });
  };

  const toggleGroupForLead = (leadId: string, group: string) => {
    if (!teamCanEdit) return;
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
    const target = updated.find(l => l.id === leadId);
    if (target) {
      supabase.from('leads').update({ groups: target.groups }).eq('id', target.id);
    }
  };

  return (
    <div className="flex h-screen app-shell-bg app-shell-text overflow-hidden">
      {/* List View (Left Panel) */}
      <div data-tutorial-id="logs-lead-list" className={`w-full md:w-[420px] border-r border-stone-200 bg-white flex flex-col transition-all duration-300 ${selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Total Count Header */}
        <div className="p-8 pb-4 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-2">Active Pipeline</p>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter leading-none">{activeLeads.length}</h1>
              <p className="mt-2 text-[10px] font-bold text-stone-400 uppercase tracking-[0.18em]">
                Total: {leads.length}
              </p>
              {teamRole === 'viewer' && (
                <Badge className="mt-2 bg-amber-100 text-amber-700 border-0">Viewer Mode</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!teamCanEdit} className="h-8 rounded-full border-dashed border-stone-300 text-stone-500 hover:text-stone-900 hover:border-stone-400 bg-white disabled:opacity-50">
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
              All Leads <span className="ml-1 opacity-70">({activeLeads.length})</span>
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
                <span className="text-[10px] opacity-70">({groupCounts[group] || 0})</span>
                {teamCanEdit && (
                  <span 
                    onClick={(e) => handleDeleteGroup(e, group)}
                    className={`ml-1 hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-black/10 ${activeGroup === group ? 'text-white/50' : 'text-stone-300'}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative mt-6 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
            <Input 
              placeholder="Filter leads..." 
              className="pl-12 bg-stone-50 border-none focus:bg-stone-100 focus:ring-0 h-12 rounded-2xl font-bold text-stone-900 placeholder:text-stone-300 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
          {paginatedLeads.map(lead => (
            <div 
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={`p-5 rounded-[2rem] cursor-pointer transition-all duration-300 group relative
                ${selectedLeadId === lead.id 
                  ? 'bg-stone-900 text-white shadow-xl shadow-stone-900/20' 
                  : 'bg-white border border-transparent hover:bg-stone-50'
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-4">
                  <Avatar className={cn(
                    "h-12 w-12 border-2",
                    selectedLeadId === lead.id ? "border-stone-800" : "border-stone-50"
                  )}>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.businessName || lead.correctedBusinessName || lead.name}`} />
                    <AvatarFallback className="bg-stone-50 font-black text-stone-400">{lead.avatar || (lead.businessName || lead.correctedBusinessName || lead.name || 'LE').substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className={cn(
                        "font-black text-base tracking-tight leading-tight",
                        selectedLeadId === lead.id ? "text-white" : "text-stone-900"
                    )}>{lead.businessName || lead.correctedBusinessName || lead.name || 'Unknown Business'}</h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          selectedLeadId === lead.id ? "text-stone-400" : "text-stone-300"
                      )}>{lead.contactName || lead.ownerName || 'No contact name'}</p>
                      {teamId && (
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
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2 pl-[52px]" />

              <div className="flex justify-between items-center mt-3 pl-[52px]">
                 {(() => {
                    const manualStatuses = ['Meeting Scheduled', 'Closed Deal', 'Deal Lost', 'Interested', 'Not Interested', 'No Answer', 'Closed', 'Sale Made', 'Lost'];
                    let displayStatus = lead.status;
                    const normalizedLeadStatus = String(lead.leadStatus || '').trim().toLowerCase();
                    const normalizedDisplayStatus = String(displayStatus || '').trim().toLowerCase();
                    
                    // Safety: If history is empty, an interaction status is invalid -> Reset to New
                    if ((!lead.history || lead.history.length === 0) && manualStatuses.includes(displayStatus)) {
                       displayStatus = 'New';
                    } 
                    // Otherwise, prefer manual status if present, else format leadStatus
                    else if (!manualStatuses.includes(lead.status) && lead.leadStatus) {
                      if (normalizedLeadStatus === 'closed-lost') {
                        displayStatus = 'Deal Lost';
                      } else if (normalizedLeadStatus === 'sale-made') {
                        displayStatus = 'Sale Made';
                      } else if (normalizedLeadStatus === 'meeting-scheduled') {
                        displayStatus = 'Meeting Scheduled';
                      } else if (normalizedLeadStatus === 'no-answer') {
                        displayStatus = 'No Answer';
                      } else if (normalizedLeadStatus === 'not-interested') {
                        displayStatus = 'Not Interested';
                      } else {
                        displayStatus = lead.leadStatus.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                      }
                    }

                    if (normalizedDisplayStatus === 'deal lost' || normalizedDisplayStatus === 'lost') {
                      displayStatus = 'Deal Lost';
                    }

                    // Initialize with default or stored color (only if status matches)
                    let badgeColor = 'bg-stone-100 text-stone-600 hover:bg-stone-200';
                    if (lead.color && displayStatus === lead.status) {
                       badgeColor = lead.color + ' hover:bg-stone-200';
                    }

                    // Apply specific colors based on the resolved display status
                    const resolvedStatus = String(displayStatus || '').trim().toLowerCase();
                    if (resolvedStatus === 'closed' || resolvedStatus === 'closed deal' || resolvedStatus === 'sale made') {
                        badgeColor = 'bg-green-100 text-green-700 hover:bg-green-500 hover:text-white';
                    } else if (resolvedStatus === 'deal lost' || resolvedStatus === 'lost' || normalizedLeadStatus === 'closed-lost') {
                        badgeColor = 'bg-red-100 text-red-700 hover:bg-red-500 hover:text-white';
                    } else if (resolvedStatus === 'not interested') {
                        badgeColor = 'bg-rose-100 text-rose-700 hover:bg-rose-500 hover:text-white';
                    } else if (resolvedStatus === 'no answer' || resolvedStatus === 'follow up') {
                        badgeColor = 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white';
                    } else if (resolvedStatus === 'meeting scheduled' || resolvedStatus === 'scheduled') {
                        badgeColor = 'bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white';
                    } else if (resolvedStatus === 'interested') {
                        badgeColor = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-400 hover:text-white';
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
      <div data-tutorial-id="logs-workspace" className={`flex-1 flex flex-col h-full app-shell-bg overflow-hidden ${!selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
        {activeLead ? (
          <>
          <div className="p-6 max-w-5xl mx-auto w-full space-y-6 h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Mobile Back Button */}
            <Button 
              variant="ghost" 
              className="md:hidden mb-4 -ml-2 text-stone-500" 
              onClick={() => setSelectedLeadId(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>

            {/* Active Lead Header Card */}
            <div className="bg-white rounded-[3rem] p-6 border-none shadow-sm relative overflow-hidden">
                {/* Accent background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full -mr-32 -mt-32 opacity-50" />
              <div className="flex flex-col md:flex-row justify-between items-start gap-5 mb-6 relative z-10">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-4 border-stone-50 shadow-xl">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeLead.businessName}`} />
                    <AvatarFallback className="bg-stone-100 font-black text-2xl text-stone-400">{activeLead.avatar || (activeLead.businessName || activeLead.name).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-3xl font-black text-stone-900 tracking-tighter">{activeLead.businessName || activeLead.correctedBusinessName || activeLead.name || 'Unknown Business'}</h2>
                    <div className="flex items-center gap-3 text-stone-400 mt-2">
                      <div className="bg-stone-50 px-3 py-1 rounded-full flex items-center gap-2 border border-stone-100">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{activeLead.contactName || activeLead.ownerName || 'No contact name'}</span>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest">Verified</Badge>
                      {teamId && (
                        <Badge
                          className={`border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest ${
                            activeLead.ownerUserId === currentUserId
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {activeLead.ownerUserId === currentUserId ? 'Mine' : 'Team'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500">
                      <span className="rounded-full bg-stone-50 px-3 py-1 border border-stone-100">
                        Time in Pipeline: {activeDurationMs === null ? '--:--:--' : formatDuration(activeDurationMs)}
                      </span>
                      {activeTimer?.start && (
                        <span className="rounded-full bg-stone-50 px-3 py-1 border border-stone-100">
                          Started: {format(new Date(activeTimer.start), 'MMM d, h:mm a')}
                        </span>
                      )}
                      {activeTimer?.stop && (
                        <span className="rounded-full bg-stone-50 px-3 py-1 border border-stone-100">
                          Closed: {format(new Date(activeTimer.stop), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button variant="outline" className="h-14 px-6 rounded-2xl border-stone-100 bg-white font-black uppercase text-[10px] tracking-widest hover:bg-stone-50 transition-all shadow-sm">
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
                             disabled={!teamCanEdit}
                             className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-stone-100 flex items-center justify-between transition-colors"
                           >
                             <span className="flex items-center gap-2">
                               {group}
                               <span className="text-[10px] text-stone-400">({groupCounts[group] || 0})</span>
                             </span>
                             {activeLead.groups?.includes(group) && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                           </button>
                         ))}
                         {customGroups.length === 0 && (
                            <p className="text-[10px] text-stone-400 p-2 italic text-center">No categories created.</p>
                         )}
                       </div>
                     </PopoverContent>
                   </Popover>
                   <Button disabled={!teamCanEdit} className="h-14 px-8 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-black/10 disabled:opacity-50">
                     <Phone className="w-4 h-4 mr-3" /> Start Call
                   </Button>
                   <Button 
                     variant="outline"
                     disabled={!teamCanEdit}
                     className="h-14 w-14 rounded-2xl border-stone-100 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm"
                     onClick={() => setReportDialogOpen(true)}
                   >
                     <Globe className="w-5 h-5" />
                   </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                <div className="p-5 bg-stone-50/50 rounded-3xl border border-stone-100/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-stone-300 mb-3">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Primary Location</span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 leading-relaxed">{activeLead.address || activeLead.notes || 'No address available'}</p>
                </div>
                <div className="p-5 bg-stone-50/50 rounded-3xl border border-stone-100/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-stone-300 mb-3">
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Contact</span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 tracking-tight">{activeLead.phone || activeLead.phoneNumber || activeLead.correctedPhoneNumber || 'No phone available'}</p>
                  <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-1">{activeLead.email || activeLead.website || 'No email available'}</p>
                </div>
              </div>
            </div>

            {lastReopen?.leadId === activeLead.id && (
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-100/80 px-4 py-3 text-stone-900">
                <div className="text-sm font-semibold">Lead reopened</div>
                <Button
                  variant="outline"
                  className="h-9 rounded-full border-stone-300 text-stone-900 bg-white hover:bg-amber-200/70 hover:text-stone-900"
                  onClick={handleUndoReopen}
                >
                  Undo Reopen
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Interaction Logger */}
              <div className="xl:col-span-2 space-y-8">
                <div className="bg-white rounded-[3rem] p-6 border-none shadow-sm relative overflow-hidden">
                  {isClosedLead && teamCanEdit && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[6px] bg-white/70">
                      <Button
                        onClick={handleReopenLead}
                        className="h-14 px-10 rounded-2xl bg-amber-500 text-white hover:bg-amber-600 font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-amber-500/30"
                      >
                        <RotateCcw className="w-4 h-4 mr-3" /> Reopen Lead
                      </Button>
                    </div>
                  )}
                  <h3 className="text-[10px] font-black text-stone-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-stone-300" /> Interaction Engine
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {conclusions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectConclusion(item.id)}
                        disabled={!teamCanEdit}
                        className={cn(
                          "flex flex-col items-center justify-center p-5 rounded-[2rem] border transition-all duration-300 gap-3 group relative overflow-hidden",
                          selectedConclusion === item.id 
                            ? `${item.color} border-current scale-[1.02] shadow-xl shadow-current/5` 
                            : "bg-stone-50 border-transparent text-stone-400 hover:bg-white hover:border-stone-100 hover:shadow-md"
                        )}
                      >
                        <item.icon className={cn(
                            "w-6 h-6 transition-transform duration-300",
                            selectedConclusion === item.id ? "scale-110" : "group-hover:scale-110"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center">{item.label}</span>
                        {selectedConclusion === item.id && (
                            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-current" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Date/Time Picker Area (Slides down when Meeting Scheduled is selected) */}
                  {(selectedConclusion === 'scheduled' || selectedConclusion === 'closed') && (
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
                      {(selectedConclusion === 'closed') && (
                        <div className="space-y-4">
                           <Label htmlFor="sale-amount" className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Final Deal Amount (Optional)</Label>
                           <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                             <Input
                               id="sale-amount"
                               type="number"
                               value={dealAmount}
                               onChange={(e) => setDealAmount(e.target.value)}
                               placeholder="0.00" 
                               className="pl-8 h-12 text-lg font-bold bg-white border-blue-200 text-stone-900"
                             />
                           </div>
                        </div>
                      )}
                    </div>
                  )}

                    <div className="space-y-5">
                    <div className="space-y-3">
                         <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] ml-2">Internal Notes</span>
                        <Textarea 
                        placeholder="Add specific insights or next steps for this lead..." 
                        className="resize-none bg-stone-50 border-none focus:bg-white focus:ring-2 focus:ring-stone-100 min-h-[96px] text-stone-900 font-bold p-6 rounded-[2rem] transition-all text-base placeholder:text-stone-300 shadow-inner"
                        value={note}
                        disabled={!teamCanEdit}
                        onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <Button 
                        onClick={handleSaveLog} 
                        disabled={!teamCanEdit}
                        className="w-full h-14 bg-stone-900 text-white hover:bg-stone-800 text-[11px] font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-2xl shadow-black/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      {selectedConclusion === 'closed' ? 'Close Lead' : 'Process Interaction Log'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div className="xl:col-span-1">
                <div className="bg-white/50 backdrop-blur rounded-[2rem] p-5 border border-stone-200/50 h-full shadow-sm">
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
                            {(() => {
                              const actor = log.actor_name || log.actorName || log.actor;
                              if (!actor) return null;
                              return <p className={`text-[10px] mt-2 font-semibold ${actorColorClass(actor)}`}>by {actor}</p>;
                            })()}
                            {teamCanEdit && (
                              <button 
                                onClick={(e) => initiateDeleteLog(e, activeLead.id, log.id)}
                                className="absolute top-2 right-2 text-stone-400 hover:text-red-600 hover:bg-red-100 p-2 rounded-full transition-all"
                                title="Delete Log"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
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
    <Suspense fallback={<div className="min-h-screen app-shell-bg app-shell-text" />}>
      <div className="flex min-h-screen app-shell-bg app-shell-text">
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
    </Suspense>
  );
}
