'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateMockLeads } from '@/lib/mock-leads';
import { ProcessedLead } from '@/lib/types';
import { Search, ShoppingCart, Bell, Plus, ArrowRight, User, TrendingUp, ChevronDown, Package, LogOut, Info, Rocket, Sparkles, Target, Calendar as CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getRoleCapabilities } from '@/lib/team-role';
import { getStoredNotifications, storeNotifications } from '@/lib/notifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, formatDistanceToNow, startOfWeek } from 'date-fns';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    count: 30,
    price: 3.5,
    originalPrice: 29,
    description: '30 Leads',
    color: 'bg-blue-100 text-blue-600',
    popular: false,
    status: 'Active'
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    count: 90,
    price: 7,
    originalPrice: 49,
    description: '90 Leads',
    color: 'bg-purple-100 text-purple-600',
    popular: true,
    status: 'Active'
  },
  {
    id: 'pro',
    name: 'Pro Bundle',
    count: 180,
    price: 15.35,
    originalPrice: 99,
    description: '180 Leads',
    color: 'bg-orange-100 text-orange-600',
    popular: false,
    status: 'Active'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    count: 280,
    price: 30,
    originalPrice: 299,
    description: '280 Leads',
    color: 'bg-green-100 text-green-600',
    popular: false,
    status: 'Active'
  },
];

interface DashboardViewProps {
  isGuest?: boolean;
  onAuthRequest?: () => void;
}

const formatUsdAmount = (amount: number | null) => {
  if (!Number.isFinite(Number(amount))) return null;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const extractTransactionAmount = (tx: any): number | null => {
  const rawCandidates = [
    tx?.amount,
    tx?.total,
    tx?.grand_total,
    tx?.details?.totals?.total,
    tx?.payload?.details?.totals?.total,
    tx?.payload?.data?.details?.totals?.total,
  ];

  for (const candidate of rawCandidates) {
    const parsed = Number(candidate);
    if (!Number.isFinite(parsed)) continue;
    if (Number.isInteger(parsed) && Math.abs(parsed) >= 100) {
      return parsed / 100;
    }
    return parsed;
  }
  return null;
};

export function DashboardView({ isGuest = false, onAuthRequest }: DashboardViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLeadsLoading, setIsLeadsLoading] = useState(true);
  const [myLeads, setMyLeads] = useState<ProcessedLead[]>([]);
  const [leadsCount, setLeadsCount] = useState<number>(0);
  const [newLeadsToday, setNewLeadsToday] = useState<number>(0);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [autoWeek, setAutoWeek] = useState(true);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [previewSource, setPreviewSource] = useState<'mine' | 'team'>('mine');
  const [isPreviewAutoPaused, setIsPreviewAutoPaused] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; at: number; read: boolean }>>([]);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const dismissedNotificationIdsRef = useRef<Set<string>>(new Set());
  const teamLeadIdsRef = useRef<Set<string>>(new Set());
  const effectiveGuest = isGuest || !isAuthed;
  const openAuth = () => {
    if (onAuthRequest) {
      onAuthRequest();
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:open'));
    }
  };

  // Disable scroll on body when dashboard is mounted to ensure full-screen feel
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = '';
      }
    };
  }, []);

  const ownLeads = useMemo(
    () => myLeads.filter((lead: any) => lead.user_id && lead.user_id === currentUserId),
    [myLeads, currentUserId]
  );

  const teamLeads = useMemo(
    () => (teamId ? myLeads : []),
    [myLeads, teamId]
  );

  const hasOtherTeamLeads = useMemo(
    () => teamLeads.some((lead: any) => currentUserId && lead.user_id && lead.user_id !== currentUserId),
    [teamLeads, currentUserId]
  );

  const canAlternateSources = Boolean(teamId && ownLeads.length > 0 && hasOtherTeamLeads);

  const previewState = useMemo(() => {
    if (effectiveGuest) {
      return {
        source: 'mine' as const,
        label: 'Your leads',
        pool: [] as any[],
      };
    }

    if (canAlternateSources) {
      const source = previewSource;
      return {
        source,
        label: source === 'mine' ? 'Your leads' : 'Team leads',
        pool: source === 'mine' ? ownLeads : teamLeads,
      };
    }

    if (ownLeads.length > 0) {
      return {
        source: 'mine' as const,
        label: 'Your leads',
        pool: ownLeads,
      };
    }

    return {
      source: teamId ? ('team' as const) : ('mine' as const),
      label: teamId ? 'Team leads' : 'Your leads',
      pool: teamLeads,
    };
  }, [canAlternateSources, effectiveGuest, ownLeads, previewSource, teamLeads, teamId]);

  const canAutoRotate = canAlternateSources || (!effectiveGuest && !canAlternateSources && previewState.pool.length > 6);

  // Switch between "Your leads" and "Team leads" every 10s when both exist.
  useEffect(() => {
    if (!canAlternateSources || effectiveGuest || isPreviewAutoPaused) return;
    const interval = setInterval(() => {
      setPreviewSource((prev) => (prev === 'mine' ? 'team' : 'mine'));
      setPreviewOffset(0);
    }, 10000);
    return () => clearInterval(interval);
  }, [canAlternateSources, effectiveGuest, isPreviewAutoPaused]);

  // If only one source is available, paginate every 10s when there are many leads.
  useEffect(() => {
    if (effectiveGuest || canAlternateSources || isPreviewAutoPaused) return;
    if (previewState.pool.length <= 6) return;

    const interval = setInterval(() => {
      setPreviewOffset((prev) => (prev + 1) % Math.max(1, Math.ceil(previewState.pool.length / 6)));
    }, 10000);

    return () => clearInterval(interval);
  }, [effectiveGuest, canAlternateSources, isPreviewAutoPaused, previewState.pool.length]);

  useEffect(() => {
    const checkSession = async () => {
      if (isGuest) {
        setIsAuthed(false);
        setIsAuthLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthed(!!session);
      setIsAuthLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isGuest) return;
      setIsAuthed(!!session);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  useEffect(() => {
    teamLeadIdsRef.current = new Set((myLeads || []).map((l: any) => String(l.id)));
  }, [myLeads]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('ika_dismissed_notifications');
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        dismissedNotificationIdsRef.current = new Set(ids.map((id) => String(id)));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = getStoredNotifications();
    if (stored.length > 0) {
      seenNotificationIdsRef.current = new Set(stored.map((item) => item.id));
      setNotifications(stored);
    }
  }, []);

  const persistDismissedNotifications = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'ika_dismissed_notifications',
        JSON.stringify(Array.from(dismissedNotificationIdsRef.current).slice(-300))
      );
    } catch {
      // ignore
    }
  }, []);

  const pushNotification = useCallback((id: string, text: string, at?: number, autoOpen = true) => {
    if (!id) return;
    if (dismissedNotificationIdsRef.current.has(id)) return;
    if (seenNotificationIdsRef.current.has(id)) return;
    seenNotificationIdsRef.current.add(id);

    const next = { id, text, at: at ?? Date.now(), read: false };
    setNotifications((prev) => [next, ...prev].slice(0, 40));
    if (autoOpen) {
      setNotificationsOpen(true);
    }
  }, []);

  useEffect(() => {
    const loadLeads = async () => {
      if (effectiveGuest) {
        // Guests see 0 leads and 0 credits
        setMyLeads([]);
        setLeadsCount(0);
        setNewLeadsToday(0);
        setIsLeadsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLeadsLoading(false);
        return;
      }
      setCurrentUserId(session.user.id);

      let resolvedTeamId: string | null = null;
      try {
        const teamRes = await fetch('/api/team/overview', {
          method: 'GET',
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const teamJson = await teamRes.json().catch(() => ({}));
        const caps = getRoleCapabilities(teamJson?.role || null);
        resolvedTeamId = teamJson?.team?.id || null;
        setTeamRole(caps.role);
        setTeamId(resolvedTeamId);
      } catch {
        // Keep personal mode fallback.
      }

      const leadQuery = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: leads, error } = resolvedTeamId
        ? await leadQuery.or(`team_id.eq.${resolvedTeamId},user_id.eq.${session.user.id}`)
        : await leadQuery.eq('user_id', session.user.id);
      
      if (leads && !error) {
        const parsedLeads: ProcessedLead[] = leads.map((row: any) => ({
          ...row,
          businessName: row.business_name ?? row.businessName ?? row.name ?? row.company ?? '',
          name: row.business_name ?? row.name ?? row.businessName ?? row.company ?? '',
          phone: row.phone ?? row.phoneNumber ?? '',
          email: row.email ?? '',
          status: row.status ?? 'New',
          leadStatus: row.lead_status ?? row.leadStatus ?? 'new',
        }));
        setMyLeads(parsedLeads);

        const activeCount = parsedLeads.filter((l: any) => {
          const status = (l.status || '').toLowerCase();
          const leadStatus = (l.leadStatus || '').toLowerCase();
          return !(
            ['closed deal', 'deal lost', 'closed', 'sale made'].includes(status) ||
            ['sale-made', 'closed-lost'].includes(leadStatus)
          );
        }).length;
        setLeadsCount(activeCount);
        
        const newToday = parsedLeads.filter((l: any) => {
           // If lead has history, it's not "new" for the welcome message list
           return !l.history || l.history.length === 0;
        }).length;
        setNewLeadsToday(newToday);

        if (typeof window !== 'undefined') {
          localStorage.setItem('ika_dashboard_leads', JSON.stringify(parsedLeads));
        }
      } else {
        setLeadsCount(0);
        setNewLeadsToday(0);
      }
      setIsLeadsLoading(false);
    };
    loadLeads();
  }, [effectiveGuest]);

  useEffect(() => {
    if (effectiveGuest || !currentUserId) return;

    let mounted = true;
    const loadInitialNotifications = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      let resolvedTeamId: string | null = null;
      try {
        const teamRes = await fetch('/api/team/overview', {
          method: 'GET',
          headers: { authorization: `Bearer ${accessToken}` },
        });
        const teamJson = await teamRes.json().catch(() => ({}));
        resolvedTeamId = teamJson?.team?.id || null;
      } catch {
        // ignore
      }

      const next: Array<{ id: string; text: string; at: number; read: boolean }> = [];

      if (resolvedTeamId) {
        const [invitesRes, logsRes] = await Promise.all([
          supabase
            .from('team_invites')
            .select('id, created_at, role')
            .eq('team_id', resolvedTeamId)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('lead_logs')
            .select('id, actor_id, actor_name, action, created_at')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        (invitesRes.data || []).forEach((row: any) => {
          next.push({
            id: `invite-${row.id}`,
            text: `A new ${row.role || 'viewer'} invite was created for the team.`,
            at: Date.parse(row.created_at) || Date.now(),
            read: true,
          });
        });

        const teamLeadIds = new Set((myLeads || []).map((l: any) => l.id));
        (logsRes.data || []).forEach((row: any) => {
          if (row.actor_id && row.actor_id === currentUserId) return;
          if (teamLeadIds.size === 0) return;
          next.push({
            id: `log-${row.id}`,
            text: `${row.actor_name || 'A teammate'} updated a lead: ${row.action || 'Log update'}.`,
            at: Date.parse(row.created_at) || Date.now(),
            read: true,
          });
        });
      }

      const { data: myRequests } = await supabase
        .from('team_requests')
        .select('id, status, created_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(8);

      (myRequests || [])
        .filter((row: any) => row.status === 'approved')
        .forEach((row: any) => {
          next.push({
            id: `request-${row.id}`,
            text: 'Your request to join a team was approved.',
            at: Date.parse(row.created_at) || Date.now(),
            read: true,
          });
        });

      const { data: fulfillmentRows } = await supabase
        .from('paddle_fulfillments')
        .select('id, transaction_id, lead_count, created_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      const txIds = Array.from(
        new Set(
          (fulfillmentRows || [])
            .map((row: any) => String(row?.transaction_id || '').trim())
            .filter((id) => id.length > 0)
        )
      );

      let transactionById = new Map<string, any>();
      if (txIds.length > 0) {
        const { data: txRows } = await supabase
          .from('paddle_transactions')
          .select('*')
          .in('id', txIds);
        transactionById = new Map((txRows || []).map((row: any) => [String(row.id), row]));
      }

      (fulfillmentRows || []).forEach((row: any) => {
        const leads = Math.max(1, Number(row?.lead_count) || 1);
        const txId = String(row?.transaction_id || '').trim();
        const tx = txId ? transactionById.get(txId) : null;
        const amount = extractTransactionAmount(tx);
        const amountLabel = formatUsdAmount(amount);
        const leadLabel = `${leads} lead${leads === 1 ? '' : 's'} added`;
        next.push({
          id: `payment-${row.id || txId || Date.now()}`,
          text: amountLabel
            ? `Payment completed • ${leadLabel} • ${amountLabel} paid`
            : `Payment completed • ${leadLabel}`,
          at: Date.parse(row?.created_at) || Date.now(),
          read: true,
        });
      });

      if (!mounted) return;
      const filtered = next.filter((item) => !dismissedNotificationIdsRef.current.has(item.id));
      seenNotificationIdsRef.current = new Set(filtered.map((item) => item.id));
      setNotifications(filtered.sort((a, b) => b.at - a.at).slice(0, 20));
    };

    loadInitialNotifications();
    return () => {
      mounted = false;
    };
  }, [effectiveGuest, currentUserId, myLeads]);

  useEffect(() => {
    if (effectiveGuest || !currentUserId) return;

    const channels: any[] = [];

    if (teamId) {
      const teamInvitesChannel = supabase
        .channel(`dashboard-notif-team-invites-${teamId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'team_invites', filter: `team_id=eq.${teamId}` },
          (payload) => {
            const role = (payload.new as any)?.role || 'viewer';
            pushNotification(
              `team-invite-${(payload.new as any)?.id || Date.now()}`,
              `New ${role} invite created for the team.`,
              (payload.new as any)?.created_at ? Date.parse((payload.new as any).created_at) : Date.now()
            );
          }
        )
        .subscribe();
      channels.push(teamInvitesChannel);

      const teamLeadsChannel = supabase
        .channel(`dashboard-notif-team-leads-${teamId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leads', filter: `team_id=eq.${teamId}` },
          (payload) => {
            const byMe = (payload.new as any)?.user_id === currentUserId;
            pushNotification(
              `team-lead-${(payload.new as any)?.id || Date.now()}`,
              byMe ? 'You added new leads to the team.' : 'A teammate added new leads to the team.',
              (payload.new as any)?.created_at ? Date.parse((payload.new as any).created_at) : Date.now()
            );
          }
        )
        .subscribe();
      channels.push(teamLeadsChannel);
    }

    const requestsChannel = supabase
      .channel(`dashboard-notif-my-requests-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_requests',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const status = String((payload.new as any)?.status || '').toLowerCase();
          if (status === 'approved') {
            pushNotification(
              `team-request-approved-${(payload.new as any)?.id || Date.now()}`,
              'Your request to join a team was approved.',
              (payload.new as any)?.created_at ? Date.parse((payload.new as any).created_at) : Date.now()
            );
          }
        }
      )
      .subscribe();
    channels.push(requestsChannel);

    const paymentChannel = supabase
      .channel(`dashboard-notif-payments-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paddle_fulfillments',
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          const leads = Math.max(1, Number(row?.lead_count) || 1);
          const txId = String(row?.transaction_id || '').trim();
          let amountLabel: string | null = null;

          if (txId) {
            const { data: tx } = await supabase
              .from('paddle_transactions')
              .select('*')
              .eq('id', txId)
              .maybeSingle();
            amountLabel = formatUsdAmount(extractTransactionAmount(tx));
          }

          const leadLabel = `${leads} lead${leads === 1 ? '' : 's'} added`;
          pushNotification(
            `payment-${row?.id || txId || Date.now()}`,
            amountLabel
              ? `Payment completed • ${leadLabel} • ${amountLabel} paid`
              : `Payment completed • ${leadLabel}`,
            row?.created_at ? Date.parse(row.created_at) : Date.now()
          );
        }
      )
      .subscribe();
    channels.push(paymentChannel);

    const leadLogsChannel = supabase
      .channel('dashboard-notif-lead-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_logs' }, async (payload) => {
        const leadId = String((payload.new as any)?.lead_id || '');
        const actorId = String((payload.new as any)?.actor_id || '');
        if (!leadId) return;
        if (actorId && actorId === currentUserId) return;

        if (teamId) {
          const { data: leadRow } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('team_id', teamId)
            .maybeSingle();
          if (!leadRow) return;
        } else if (!teamLeadIdsRef.current.has(leadId)) {
          return;
        }

        const actorName = (payload.new as any)?.actor_name || 'A teammate';
        const action = (payload.new as any)?.action || 'updated a lead';
        pushNotification(
          `lead-log-${(payload.new as any)?.id || leadId}-${(payload.new as any)?.created_at || Date.now()}`,
          `${actorName} ${action}.`,
          (payload.new as any)?.created_at ? Date.parse((payload.new as any).created_at) : Date.now()
        );
      })
      .subscribe();
    channels.push(leadLogsChannel);

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [effectiveGuest, currentUserId, teamId, pushNotification]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = localStorage.getItem('ika_dashboard_leads');
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMyLeads(parsed);
        const activeCount = parsed.filter((l: any) => {
          const status = (l.status || '').toLowerCase();
          const leadStatus = (l.leadStatus || '').toLowerCase();
          return !(
            ['closed deal', 'deal lost', 'closed', 'sale made'].includes(status) ||
            ['sale-made', 'closed-lost'].includes(leadStatus)
          );
        }).length;
        setLeadsCount(activeCount);
        const newToday = parsed.filter((l: any) => !l.history || l.history.length === 0).length;
        setNewLeadsToday(newToday);
        setIsLeadsLoading(false);
      }
    } catch {
      // ignore cache issues
    }
  }, []);

  const recentWeeks = useMemo(
    () => Array.from({ length: 8 }).map((_, i) => startOfWeek(addDays(new Date(), -7 * i), { weekStartsOn: 1 })),
    []
  );

  const weekLabel = useMemo(() => (autoWeek ? 'This week' : `Week of ${format(weekStart, 'MMM d')}`), [autoWeek, weekStart]);

  const weeklyClosedRevenue = useMemo(() => {
    const weekStartMs = weekStart.getTime();
    const weekEndMs = addDays(weekStart, 7).getTime();
    return myLeads.reduce((sum: number, lead: any) => {
      const status = (lead.status || '').toLowerCase();
      const leadStatus = (lead.leadStatus || '').toLowerCase();
      const isClosed =
        status === 'closed deal' ||
        status === 'sale made' ||
        leadStatus === 'sale-made';
      if (!isClosed) return sum;
      const closedAt = lead.closedAt
        ? Number(lead.closedAt)
        : (lead.closed_at ? Date.parse(lead.closed_at) : NaN);
      if (!Number.isFinite(closedAt) || closedAt < weekStartMs || closedAt >= weekEndMs) return sum;
      const valueStr = (lead.value || '').toString();
      const value = parseFloat(valueStr.replace(/[$,]/g, '')) || 0;
      return sum + value;
    }, 0);
  }, [myLeads, weekStart]);

  const recentWeekRevenues = useMemo(() => {
    return recentWeeks
      .slice(0, 5)
      .map((w) => {
        const startMs = w.getTime();
        const endMs = addDays(w, 7).getTime();
        const total = myLeads.reduce((sum: number, lead: any) => {
          const status = (lead.status || '').toLowerCase();
          const leadStatus = (lead.leadStatus || '').toLowerCase();
          const isClosed =
            status === 'closed deal' ||
            status === 'sale made' ||
            leadStatus === 'sale-made';
          if (!isClosed) return sum;
          const closedAt = lead.closedAt
            ? Number(lead.closedAt)
            : (lead.closed_at ? Date.parse(lead.closed_at) : NaN);
          if (!Number.isFinite(closedAt) || closedAt < startMs || closedAt >= endMs) return sum;
          const valueStr = (lead.value || '').toString();
          const value = parseFloat(valueStr.replace(/[$,]/g, '')) || 0;
          return sum + value;
        }, 0);
        return { weekStart: w, total };
      })
      .reverse();
  }, [myLeads, recentWeeks]);

  useEffect(() => {
    if (!autoWeek) return;
    const updateIfNeeded = () => {
      const currentStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      if (currentStart.getTime() !== weekStart.getTime()) {
        setWeekStart(currentStart);
      }
    };
    updateIfNeeded();
    const id = setInterval(updateIfNeeded, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoWeek, weekStart]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        setWeekStart(currentStart);
        setAutoWeek(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleBuy = async (pkg: typeof PACKAGES[0]) => {
    if (pkg.status === 'Offline') return;

    if (effectiveGuest) {
      openAuth();
      return;
    }
    if (teamRole === 'viewer') {
      toast({
        title: "Read-only access",
        description: "Viewer role can view/export only.",
        variant: "destructive",
      });
      return;
    }

    setLoading(pkg.id);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      onAuthRequest?.();
      setLoading(null);
      return;
    }

    const userId = session.user.id;

    // Simulate Network Request
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newLeadsData = generateMockLeads(pkg.count).map((lead) => ({
      user_id: userId,
      team_id: teamId,
      business_name: lead.correctedBusinessName ?? lead.businessName ?? null,
      contact_name: lead.ownerName ?? null,
      email: null,
      phone: lead.correctedPhoneNumber ?? lead.phoneNumber ?? null,
      address: null,
      status: 'New',
      lead_status: lead.leadStatus || 'new',
      value: '$0',
      scheduled_date: '-',
      last_contact: 'Never',
      color: 'bg-stone-100 text-stone-600',
      history: [],
      groups: [],
    }));

    const { error } = await supabase.from('leads').insert(newLeadsData);

    if (error) {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive"
      });
      setLoading(null);
      return;
    }

    const addedLeads = newLeadsData.map((lead: any) => ({
      ...lead,
      businessName: lead.business_name ?? lead.businessName ?? '',
      name: lead.business_name ?? lead.name ?? '',
      status: lead.status ?? 'New',
      leadStatus: lead.lead_status ?? 'new',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
    }));

    setMyLeads((prev) => [...addedLeads, ...prev]);
    setLeadsCount((prev) => prev + pkg.count);
    setNewLeadsToday((prev) => prev + pkg.count);

    toast({
      title: "Purchase Successful!",
      description: `${pkg.count} leads were added. Open "Leads" when you're ready to work them.`,
    });

    setLoading(null);
  };

  const handleRestrictedAction = () => {
    if (effectiveGuest) {
        openAuth();
    }
  }

  const unreadCount = useMemo(
    () => notifications.reduce((acc, item) => acc + (item.read ? 0 : 1), 0),
    [notifications]
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    dismissedNotificationIdsRef.current.add(id);
    persistDismissedNotifications();
  }, [persistDismissedNotifications]);

  useEffect(() => {
    storeNotifications(notifications);
  }, [notifications]);

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#1C1917]">Dashboard</h1>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="search"
              placeholder="Search anything..."
              className="pl-10 h-12 rounded-full border-none bg-white shadow-sm placeholder:text-stone-400 text-stone-800 focus-visible:ring-stone-200"
            />
          </div>


          <div className="flex items-center gap-2">
            <Popover
              open={notificationsOpen}
              onOpenChange={(next) => {
                setNotificationsOpen(next);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="relative rounded-full h-10 w-10 bg-white shadow-sm hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <Bell className="h-4 w-4 text-stone-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[360px] overflow-hidden rounded-[24px] border border-stone-200 bg-white p-0 text-stone-900 shadow-[0_18px_40px_rgba(28,25,23,0.14)]"
              >
                <div className="border-b border-stone-100 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-stone-900">Notifications</div>
                      <div className="text-[11px] font-medium text-stone-500">Team activity and lead updates</div>
                    </div>
                    {notifications.length > 0 && unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markNotificationsRead}
                        className="rounded-full border border-stone-200 px-2.5 py-1 text-[10px] font-semibold text-stone-700 transition hover:bg-stone-50"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto bg-white p-2">
                  {notifications.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-stone-200 bg-stone-50 px-3 py-6 text-center text-xs font-medium text-stone-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`mb-2 rounded-[18px] border px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.02)] ${
                          item.read ? 'border-stone-100 bg-white' : 'border-stone-200 bg-stone-50/70'
                        }`}
                      >
                        <div className="text-xs font-semibold leading-5 text-stone-800">{item.text}</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-[10px] text-stone-400">{formatDistanceToNow(new Date(item.at), { addSuffix: true })}</div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!item.read && (
                              <button
                                type="button"
                                onClick={() => markNotificationRead(item.id)}
                                className="rounded-full border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                Read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteNotification(item.id)}
                              className="rounded-full border border-red-200 px-2.5 py-1 text-[10px] font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="flex items-center gap-3 bg-white pl-1 pr-1 py-1 rounded-full shadow-sm border border-stone-100 ml-2 group transition-all hover:border-stone-300">
                <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
                    <DialogTrigger asChild>
                        <Avatar className="h-8 w-8 border border-stone-50 shadow-sm cursor-pointer transition-transform hover:scale-110 active:scale-95">
                            <AvatarFallback className="bg-stone-900 text-stone-200">
                                <Info className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Getting Started</DialogTitle>
                            <DialogDescription>Quick guide to using the Ika Platform dashboard.</DialogDescription>
                        </DialogHeader>
                        <div className="bg-[#1C1917] p-8 text-white relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-stone-800 rounded-full blur-3xl opacity-50" />
                            <h2 className="text-2xl font-bold flex items-center gap-2 relative z-10">
                                <Rocket className="h-6 w-6 text-stone-400" />
                                Getting Started
                            </h2>
                            <p className="text-stone-300 text-base mt-2 relative z-10 leading-relaxed font-medium">Follow these steps to maximize your experience on Ika Platform.</p>
                        </div>
                        <div className="p-8 space-y-8 bg-[#FAFAF9]">
                            <div className="flex gap-4">
                                <div className="h-11 w-11 min-w-[2.75rem] rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                                    <Search className="h-6 w-6 text-stone-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-900 text-lg">1. Explore the Marketplace</h4>
                                    <p className="text-stone-600 text-sm mt-1 leading-relaxed font-medium">Look around the dashboard to see the latest high-quality leads available in your niche.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-11 w-11 min-w-[2.75rem] rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                                    <Sparkles className="h-6 w-6 text-stone-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-900 text-lg">2. Claim Free Trial</h4>
                                    <p className="text-stone-600 text-sm mt-1 leading-relaxed font-medium">New users automatically get 5 free leads to test our data quality and platform features.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-11 w-11 min-w-[2.75rem] rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center">
                                    <Target className="h-6 w-6 text-stone-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-900 text-lg">3. Purchase Lead Bundles</h4>
                                    <p className="text-stone-600 text-sm mt-1 leading-relaxed font-medium">Once you're ready, select a package that fits your growth goals and scale your outreach instantly.</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                              <Button
                                className="w-full h-12 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl mt-2 shadow-lg shadow-stone-200"
                                onClick={() => setIsHelpDialogOpen(false)}
                              >
                                Got it, let's go!
                              </Button>
                              <div className="flex justify-center pt-1">
                                <Button
                                  type="button"
                                  className="h-11 rounded-full bg-[#121212] text-white border border-stone-700 px-4 gap-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_6px_16px_rgba(0,0,0,0.35)] hover:bg-black"
                                  onClick={() => {
                                    if (typeof window !== 'undefined') {
                                      window.dispatchEvent(
                                        new CustomEvent('tutorial:redo', { detail: { mode: 'full' } })
                                      );
                                    }
                                    setIsHelpDialogOpen(false);
                                  }}
                                  aria-label="Redo tutorial"
                                  title="Redo tutorial"
                                >
                                  <X className="h-4 w-4" />
                                  <span className="text-sm font-semibold">Redo tutorial</span>
                                </Button>
                              </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                
                {isAuthLoading ? (
                    <div className="h-8 w-20 rounded-full bg-stone-200 animate-pulse" />
                ) : effectiveGuest ? (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-4 text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 rounded-full transition-all flex items-center gap-2"
                        onClick={openAuth}
                    >
                        Sign In
                    </Button>
                ) : (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all flex items-center"
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/';
                        }}
                    >
                        <LogOut className="h-3 w-3 mr-2" />
                        Sign Out
                    </Button>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6 flex flex-col min-h-0">

          {/* Overview Cards */}
          <div className="grid md:grid-cols-2 gap-4" data-tutorial-id="dashboard-stats">
            {/* Customers / Leads Available */}
            <Card className="rounded-[32px] border border-white/5 shadow-sm hover:shadow-md transition-shadow bg-[#1f1f23] text-[#FAFAF9]">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-white/10 rounded-full">
                       <User className="h-5 w-5 text-stone-300" />
                     </div>
                     <span className="font-semibold text-stone-200">Leads Available</span>
                   </div>
                 </div>
                 <div className="flex items-baseline gap-4">
                   {isLeadsLoading ? (
                     <div className="h-12 w-24 rounded-xl bg-white/10 animate-pulse" />
                   ) : (
                     <span className="text-5xl font-bold tracking-tight">
                      {effectiveGuest ? '0' : leadsCount.toLocaleString()}
                     </span>
                   )}
                   <Badge variant="secondary" className="bg-[#2a2f3a] text-[#9fb4ff] hover:bg-[#323846] px-2 py-1">
                     <TrendingUp className="h-3 w-3 mr-1" /> {effectiveGuest ? '+36.8%' : 'Updated'}
                   </Badge>
                 </div>
                 <p className="text-sm text-stone-400 mt-2">vs last month</p>
              </CardContent>
            </Card>

          {/* Weekly Closed Deal Revenue */}
          <Card className="rounded-[32px] border border-white/5 shadow-sm hover:shadow-md transition-shadow bg-[#1f1f23] text-[#FAFAF9]">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-white/10 rounded-full">
                       <TrendingUp className="h-5 w-5 text-stone-300" />
                     </div>
                     <span className="font-semibold text-stone-200">Closed Deal Revenue</span>
                   </div>
                   <Popover open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
                     <PopoverTrigger asChild>
                       <Button variant="ghost" size="sm" className="h-8 text-xs text-stone-400 hover:text-stone-300">
                         {weekLabel} <ChevronDown className="h-3 w-3 ml-1"/>
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent align="end" className="w-72 p-3">
                       <div className="space-y-3">
                         <button
                           onClick={() => {
                             setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                             setAutoWeek(true);
                             setWeekPickerOpen(false);
                           }}
                           className="w-full text-left px-2 py-1.5 rounded-md text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800"
                         >
                           This week (auto)
                         </button>
                         <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recent weeks</div>
                         <div className="space-y-1">
                           {recentWeeks.map((w) => (
                             <button
                               key={w.toISOString()}
                               onClick={() => {
                                 setWeekStart(w);
                                 setAutoWeek(w.getTime() === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime());
                                 setWeekPickerOpen(false);
                               }}
                               className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-stone-100"
                             >
                               {`Week of ${format(w, 'MMM d')}`}
                             </button>
                           ))}
                         </div>
                         <div className="pt-3 border-t border-stone-200">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Pick a week</div>
                           <Calendar
                             mode="single"
                             selected={weekStart}
                             onSelect={(d) => {
                               if (!d) return;
                               setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
                               setAutoWeek(false);
                               setWeekPickerOpen(false);
                             }}
                             initialFocus
                           />
                         </div>
                       </div>
                     </PopoverContent>
                   </Popover>
                 </div>
                 <div className="flex items-baseline gap-4">
                   {isLeadsLoading ? (
                     <div className="h-12 w-24 rounded-xl bg-white/10 animate-pulse" />
                   ) : (
                     <span className="text-5xl font-bold tracking-tight">
                       ${weeklyClosedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                   )}
                   <Badge variant="secondary" className="bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60 px-2 py-1">
                     <TrendingUp className="h-3 w-3 mr-1" /> Weekly
                   </Badge>
                 </div>
                 <p className="text-sm text-stone-400 mt-2">Total closed deal value (selected week)</p>
              </CardContent>
            </Card>
          </div>

          {/* New Customers / Leads Avatars */}
          <div className="bg-transparent space-y-4" data-tutorial-id="dashboard-new-leads">
            <h3 className="font-semibold text-stone-700">
              {isLeadsLoading ? 'Loading leads…' : `${effectiveGuest ? '0' : newLeadsToday} new leads today!`}
            </h3>
            <p className="text-sm text-stone-500">Send a welcome message to all new potential clients.</p>

            <div className="flex items-center gap-4 flex-wrap">
               {isLeadsLoading ? (
                 [1,2,3,4,5].map((i) => (
                   <div key={i} className="flex flex-col items-center gap-2">
                     <div className="h-16 w-16 rounded-full bg-stone-200 animate-pulse" />
                     <div className="h-3 w-12 rounded bg-stone-200 animate-pulse" />
                   </div>
                 ))
               ) : effectiveGuest ? (
                 [1,2,3,4,5].map((i) => (
                   <button
                     key={i}
                     type="button"
                     onClick={openAuth}
                     className="flex flex-col items-center gap-2 rounded-xl p-1 transition hover:bg-stone-100"
                   >
                     <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                       <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} />
                       <AvatarFallback>U{i}</AvatarFallback>
                     </Avatar>
                     <span className="text-xs font-medium text-stone-600">Lead {i}</span>
                   </button>
                 ))
               ) : (
                 myLeads
                   .filter((l: any) => !l.history || l.history.length === 0)
                   .slice(0, 5)
                   .map((lead: any, i) => (
                   <button
                     key={i}
                     type="button"
                     onClick={() => router.push(`/logs?leadId=${lead.id}`)}
                     className="group flex flex-col items-center gap-2 rounded-xl p-1 transition hover:bg-stone-100"
                   >
                     <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                       <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.businessName || lead.name}`} />
                       <AvatarFallback>{(lead.businessName || lead.name || 'L').charAt(0)}</AvatarFallback>
                     </Avatar>
                     <span className="text-xs font-medium text-stone-600 w-16 truncate text-center group-hover:text-stone-800" title={lead.businessName || lead.name}>
                        {lead.businessName || lead.name}
                     </span>
                   </button>
                 ))
               )}
               {!isLeadsLoading && ((!effectiveGuest && myLeads.length > 5) || effectiveGuest) && (
                 <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-white text-[#1C1917] shadow-sm hover:bg-stone-50 border ml-2"
                    onClick={() => !effectiveGuest && router.push('/leads')}
                 >
                   <ArrowRight className="h-6 w-6" />
                 </Button>
               )}
               {!isLeadsLoading && (
                 <span className="text-sm font-medium text-stone-500 ml-2 cursor-pointer" onClick={() => !effectiveGuest && router.push('/leads')}>View all</span>
               )}
            </div>
          </div>

          {/* Product View - Blurred Preview */}
          <Card data-tutorial-id="dashboard-pipeline" className="rounded-[32px] border border-white/5 shadow-sm flex-1 min-h-0 bg-[#1f1f23] text-[#FAFAF9] overflow-hidden flex flex-col">
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Lead pipeline</h3>
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                  <span className="text-stone-500">Alternating selection</span>
                  <span className="inline-flex h-7 min-w-[110px] items-center justify-center rounded-full border border-stone-700 bg-stone-900 px-3 text-[11px] font-semibold text-stone-200">
                    <span
                      key={previewState.source}
                      className="inline-flex animate-in fade-in slide-in-from-bottom-1 duration-300"
                    >
                      {previewState.label}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPreviewAutoPaused((prev) => !prev)}
                    disabled={!canAutoRotate}
                    className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] font-semibold transition ${
                      canAutoRotate
                        ? 'border-stone-700 bg-stone-900 text-stone-200 hover:border-blue-500 hover:text-blue-200'
                        : 'cursor-not-allowed border-stone-800 bg-stone-900 text-stone-500'
                    }`}
                  >
                    {isPreviewAutoPaused ? 'Resume' : 'Pause'}
                  </button>
                  <ChevronDown className={`h-4 w-4 ${canAlternateSources ? 'animate-pulse text-violet-300' : ''}`} />
                </div>
              </div>

              {/* The "Real Data" Content */}
              <div
                key={`${previewState.source}-${previewOffset}`}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-right-2 duration-500"
              >
                 {isLeadsLoading ? (
                   Array.from({ length: 6 }).map((_, i) => (
                     <div key={i} className="bg-[#F5F5F4] rounded-2xl p-4 h-full border border-transparent">
                       <div className="flex items-center gap-3 mb-3">
                         <div className="h-10 w-10 rounded-full bg-stone-200 animate-pulse" />
                         <div className="space-y-2">
                           <div className="h-3 w-24 rounded bg-stone-200 animate-pulse" />
                           <div className="h-2 w-16 rounded bg-stone-200 animate-pulse" />
                         </div>
                       </div>
                       <div className="space-y-2 mt-4">
                         <div className="h-2 w-20 rounded bg-stone-200 animate-pulse" />
                         <div className="h-3 w-28 rounded bg-stone-200 animate-pulse" />
                       </div>
                     </div>
                   ))
                 ) : (
                   (() => {
                   const displayLeads: any[] = effectiveGuest 
                      ? generateMockLeads(6) 
                      : previewState.pool.slice(previewOffset * 6, (previewOffset * 6) + 6);
                    
                    return displayLeads.map((lead: any, i: number) => {
                      const status = (lead.status || '').toLowerCase();
                      const leadStatus = (lead.leadStatus || '').toLowerCase();
                      const isClosedDeal = status === 'closed deal' || leadStatus === 'sale-made';
                      const isDealLost = status === 'deal lost' || status === 'lost' || leadStatus === 'closed-lost';

                      return (
                      <div key={i} className="relative group overflow-visible">
                        {(isClosedDeal || isDealLost) && (
                          <div className={`pointer-events-none absolute right-[-34px] top-[22px] z-20 rotate-45 px-8 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-lg ${isClosedDeal ? 'bg-emerald-600' : 'bg-red-600'}`}>
                            {isClosedDeal ? 'Closed Deal' : 'Deal Lost'}
                          </div>
                        )}
                        <div className="bg-[#F5F5F4] rounded-2xl p-4 h-full border border-transparent hover:border-stone-200 transition-all text-[#1C1917] overflow-hidden">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-[#E7E5E4] flex items-center justify-center text-stone-600 font-bold">
                              {(lead.businessName || lead.name || 'L').charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#1C1917] truncate w-40" title={lead.businessName || lead.name || 'Unknown Business'}>
                                {lead.businessName || lead.name || 'Unknown Business'}
                              </div>
                              <div className="text-xs text-stone-500">{lead.status || 'Verified'}</div>
                            </div>
                          </div>

                          <div className="space-y-2 mt-4 select-none opacity-80">
                            <div className="text-[10px] font-bold uppercase tracking-tight text-stone-400">Contact Method</div>
                            <div className="text-xs font-semibold text-stone-600 truncate">{lead.phone || lead.email || 'Mobile / Email'}</div>
                          </div>
                        </div>

                        {/* Detail Action */}
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                          onClick={() => {
                            if (effectiveGuest) return;
                            if (lead?.id) {
                              router.push(`/logs?leadId=${lead.id}`);
                              return;
                            }
                            router.push('/logs');
                          }}
                        >
                            <div className="bg-[#1C1917]/90 backdrop-blur text-[#FAFAF9] px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                               View Interaction
                            </div>
                        </div>
                      </div>
                    );
                    });
                 })()
                 )}
                 {(!isLeadsLoading && !effectiveGuest && myLeads.length === 0) && (
                    <div className="col-span-full h-full flex flex-col items-center justify-center text-stone-500 space-y-4">
                       <Package className="h-12 w-12 opacity-20" />
                       <p className="text-sm font-medium">No leads purchased yet.</p>
                       <Button variant="outline" size="sm" onClick={() => router.push('/products')}>Visit Marketplace</Button>
                    </div>
                 )}
              </div>

              <div className="mt-8 pt-8 border-t border-stone-800 flex items-center justify-between">
                 <div className="text-4xl font-bold text-stone-200">
                   {isLeadsLoading ? '—' : `$${weeklyClosedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                 </div>
                 {/* Weekly revenue bars */}
                 <div className="flex items-end gap-2 h-16 opacity-40">
                    {(() => {
                      const totals = recentWeekRevenues.map((w) => w.total);
                      const max = Math.max(1, ...totals);
                      return recentWeekRevenues.map((w, i) => {
                        const height = Math.max(15, Math.round((w.total / max) * 100));
                        const isSelected = w.weekStart.getTime() === weekStart.getTime();
                        return (
                          <div
                            key={w.weekStart.toISOString()}
                            className={`w-8 rounded-t-sm relative ${isSelected ? 'bg-green-500' : 'bg-stone-500/80'}`}
                            style={{ height: `${height}%` }}
                            title={`Week of ${format(w.weekStart, 'MMM d')}: $${w.total.toLocaleString()}`}
                          >
                            {isSelected && (
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#FAFAF9] text-[#1C1917] text-[10px] px-2 py-1 rounded font-bold">
                                {`$${Math.round(w.total).toLocaleString()}`}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                 </div>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           {/* Popular Products */}
           <Card data-tutorial-id="dashboard-products" className="rounded-[32px] border border-white/5 shadow-sm h-full bg-[#1f1f23] text-[#FAFAF9]">
             <CardContent className="p-8">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">Popular products</h3>
               </div>

               <div className="space-y-6">
                 {PACKAGES.map((pkg) => (
                   <div
                     key={pkg.id}
                     className="flex items-center justify-between group cursor-pointer"
                     onClick={() => router.push(`/products?pkg=${pkg.id}`)}
                   >
                     <div className="flex items-center gap-4">
                       <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${pkg.color}`}>
                          <Package className="h-6 w-6" />
                       </div>
                       <div>
                        <div className="font-bold text-sm text-[#FAFAF9]">{pkg.name}</div>
                         <div className="text-xs text-stone-400">{pkg.description}</div>
                       </div>
                     </div>
                     <div className="text-right">
                      <div className="font-bold text-[#FAFAF9]">${pkg.price.toFixed(2)}</div>
                       <Badge variant={pkg.status === 'Active' ? 'secondary' : 'outline'} className={`mt-1 text-[10px] ${pkg.status === 'Active' ? 'text-green-600 bg-green-50' : 'text-stone-500 border-stone-700'}`}>
                         {pkg.status}
                       </Badge>
                     </div>
                   </div>
                 ))}
               </div>

               <Button 
                variant="outline" 
                className="w-full mt-8 rounded-full h-12 border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                onClick={() => router.push('/products')}
               >
                 All products
               </Button>
             </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
}
