'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ArrowUpRight, 
  Calendar,
  Wallet,
  Filter,
  History as HistoryIcon,
  Target
} from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';
import { supabase } from '@/lib/supabase';
import { getRoleCapabilities } from '@/lib/team-role';
import { useLeadScope } from '@/hooks/use-lead-scope';

// Storage Key
const LEADS_STORAGE_KEY = 'ika_leads_data';
const REVENUE_GOAL_KEY = 'ika_revenue_goal';
const MAX_HISTORY_ITEMS_PER_LEAD = 60;

function IncomePageContent() {
  const [leads, setLeads] = useState<any[]>([]);
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [goal, setGoal] = useState<number>(15000);
  const [goalInput, setGoalInput] = useState<string>('15000');
  const [isGoalSaving, setIsGoalSaving] = useState(false);
  const [isGoalLoading, setIsGoalLoading] = useState(true);
  const [teamCanEdit, setTeamCanEdit] = useState(true);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTeamContext, setIsTeamContext] = useState(false);
  const { isMineScope } = useLeadScope();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
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
            if (viewerOwnMode) {
              resolvedTeamId = null;
            }
            if (mounted) {
              setTeamCanEdit(viewerOwnMode ? true : caps.canEdit);
              setTeamRole(caps.role);
              setIsTeamContext(Boolean(resolvedTeamId) && !viewerOwnMode);
            }
          } catch {
            // Keep editable fallback.
          }

          const leadQuery = supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });
          const { data, error } = resolvedTeamId
            ? await leadQuery.eq('team_id', resolvedTeamId)
            : await leadQuery.eq('user_id', session.user.id);
          if (!error && mounted) {
            const mapped = (data || []).map((row: any) => ({
              id: row.id,
              businessName: row.business_name ?? row.businessName ?? row.name ?? '',
              name: row.business_name ?? row.name ?? row.businessName ?? '',
              contactName: row.contact_name ?? row.contactName ?? '',
              email: row.email ?? '',
              phone: row.phone ?? '',
              status: row.status ?? 'New',
              leadStatus: row.lead_status ?? row.leadStatus ?? 'new',
              value: row.value ?? '$0',
              history: Array.isArray(row.history) ? row.history.slice(0, MAX_HISTORY_ITEMS_PER_LEAD) : [],
              closedAt: row.closed_at ? Date.parse(row.closed_at) : row.closedAt,
              ownerUserId: row.user_id ?? null,
              teamId: row.team_id ?? null,
            }));
            setLeads(mapped);
          }
        } else {
          const saved = localStorage.getItem(LEADS_STORAGE_KEY);
          if (saved && mounted) {
            setLeads(JSON.parse(saved));
          }
        }
      } catch {
        const saved = localStorage.getItem(LEADS_STORAGE_KEY);
        if (saved && mounted) {
          setLeads(JSON.parse(saved));
        }
      } finally {
        if (mounted) setIsLoadingLeads(false);
      }
    };

    loadData();

    const savedGoal = localStorage.getItem(REVENUE_GOAL_KEY);
    if (savedGoal && mounted) {
      const parsed = parseFloat(savedGoal);
      if (Number.isFinite(parsed) && parsed > 0) {
        setGoal(parsed);
        setGoalInput(String(parsed));
      }
    }

    const timer = setTimeout(() => setIsGoalLoading(false), 450);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isMineScope]);

  const inSelectedWindow = (ts: any) => {
    const parsed = typeof ts === 'number' ? ts : Date.parse(String(ts || ''));
    if (!Number.isFinite(parsed)) return false;
    if (periodDays === 0) return true;
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    return parsed >= cutoff;
  };

  const closedEvents = useMemo(() => {
    const events: Array<{
      id: string;
      company: string;
      amount: number;
      amountLabel: string;
      closedAt: any;
      contact: string;
      ownerUserId: string | null;
    }> = [];

    leads.forEach((l) => {
      const amount = parseFloat(String(l.value || '$0').replace(/[$,]/g, '')) || 0;
      const company = l.businessName || l.name || 'Unknown Company';
      const contact = l.phone || l.email || 'N/A';
      const ownerUserId = l.ownerUserId ?? null;

      const historyClosed = (Array.isArray(l.history) ? l.history : [])
        .filter((h: any) => h?.result === 'Closed Deal' && inSelectedWindow(h?.timestamp || h?.date))
        .map((h: any, idx: number) => ({
          id: `${l.id}-h-${idx}-${h?.timestamp || h?.date || Date.now()}`,
          company,
          amount,
          amountLabel: l.value || `$${amount.toLocaleString()}`,
          closedAt: h?.timestamp || h?.date,
          contact,
          ownerUserId,
        }));

      if (historyClosed.length > 0) {
        events.push(...historyClosed);
        return;
      }

      const status = String(l.status || '').toLowerCase();
      const leadStatus = String(l.leadStatus || '').toLowerCase();
      const isClosedLead =
        status === 'closed' ||
        status === 'closed deal' ||
        status === 'sale made' ||
        leadStatus === 'sale-made' ||
        leadStatus === 'closed-won';
      if (isClosedLead && inSelectedWindow(l.closedAt)) {
        events.push({
          id: `${l.id}-fallback`,
          company,
          amount,
          amountLabel: l.value || `$${amount.toLocaleString()}`,
          closedAt: l.closedAt,
          contact,
          ownerUserId,
        });
      }
    });

    return events;
  }, [leads, periodDays]);

  const lostEvents = useMemo(() => {
    const events: Array<{ at: any }> = [];

    leads.forEach((l) => {
      const historyLost = (Array.isArray(l.history) ? l.history : [])
        .filter((h: any) => (h?.result === 'Deal Lost' || h?.result === 'Not Interested') && inSelectedWindow(h?.timestamp || h?.date))
        .map((h: any) => ({ at: h?.timestamp || h?.date }));

      if (historyLost.length > 0) {
        events.push(...historyLost);
        return;
      }

      const status = String(l.status || '').toLowerCase();
      const leadStatus = String(l.leadStatus || '').toLowerCase();
      const isLost = status === 'deal lost' || status === 'lost' || leadStatus === 'closed-lost' || leadStatus === 'not-interested';
      if (isLost && inSelectedWindow(l.closedAt)) {
        events.push({ at: l.closedAt });
      }
    });

    return events;
  }, [leads, periodDays]);

  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Initial data structure
    const dataMap: { [key: string]: { revenue: number, closed: number, lost: number } } = {
      'Mon': { revenue: 0, closed: 0, lost: 0 },
      'Tue': { revenue: 0, closed: 0, lost: 0 },
      'Wed': { revenue: 0, closed: 0, lost: 0 },
      'Thu': { revenue: 0, closed: 0, lost: 0 },
      'Fri': { revenue: 0, closed: 0, lost: 0 },
      'Sat': { revenue: 0, closed: 0, lost: 0 },
      'Sun': { revenue: 0, closed: 0, lost: 0 }
    };

    closedEvents.forEach((e) => {
      if (!e.closedAt) return;
      const dayName = format(new Date(e.closedAt), 'EEE');
      if (dataMap[dayName]) {
        dataMap[dayName].revenue += e.amount;
        dataMap[dayName].closed += 1;
      }
    });

    lostEvents.forEach((e) => {
      if (!e.at) return;
      const dayName = format(new Date(e.at), 'EEE');
      if (dataMap[dayName]) dataMap[dayName].lost += 1;
    });

    return days.map(name => ({
      name,
      ...dataMap[name]
    }));
  }, [closedEvents, lostEvents]);

  const stats = useMemo(() => {
    const totalRevenue = closedEvents.reduce((acc, e) => acc + (e.amount || 0), 0);
    return {
      totalRevenue,
    };
  }, [closedEvents]);

  const goalProgress = useMemo(() => {
    if (!goal || goal <= 0) return 0;
    return Math.max(0, Math.min(100, (stats.totalRevenue / goal) * 100));
  }, [stats.totalRevenue, goal]);

  const recentClosedDeals = useMemo(() => {
    return [...closedEvents]
      .sort((a, b) => {
        const ta = a.closedAt ? new Date(a.closedAt).getTime() : 0;
        const tb = b.closedAt ? new Date(b.closedAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10)
      .map((e) => ({ ...e, status: 'Paid' }));
  }, [closedEvents]);

  const handleSaveGoal = async () => {
    if (!teamCanEdit) return;
    const next = parseFloat(goalInput);
    if (!Number.isFinite(next) || next <= 0) return;
    setIsGoalSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setGoal(next);
    localStorage.setItem(REVENUE_GOAL_KEY, String(next));
    setIsGoalSaving(false);
  };

  return (
    <div className="p-8 space-y-8 app-shell-bg app-shell-text min-h-screen font-poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Income Overview</h1>
          <p className="text-base text-stone-700 mt-1 font-semibold">Real-time performance analytics and revenue tracking.</p>
        </div>
        <div className="flex gap-3">
          {teamRole === 'viewer' && (
            <Badge className="bg-amber-100 text-amber-700 border-0">Viewer Mode</Badge>
          )}
          <NotificationBell />
          <Button
            variant="outline"
            className="bg-white border-stone-300 text-stone-900 hover:bg-stone-100 hover:text-stone-900 rounded-xl h-11 font-semibold select-none"
            onClick={() => setPeriodDays((prev) => (prev === 7 ? 30 : prev === 30 ? 0 : 7))}
          >
             <Calendar className="w-4 h-4 mr-2" />
             {periodDays === 7 ? 'Last 7 Days' : periodDays === 30 ? 'Last 30 Days' : 'All Time'}
          </Button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tutorial-id="income-summary">
        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-stone-50 rounded-lg text-stone-400">
                 <Wallet className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 flex items-center">
                 <ArrowUpRight className="w-3 h-3 mr-1" /> +12.5%
              </Badge>
            </div>
            <p className="text-sm font-extrabold text-stone-400 uppercase tracking-widest mt-4">Total Revenue</p>
            <p className="text-4xl font-extrabold text-stone-900 mt-1">
              {isLoadingLeads ? 'Loading...' : `$${stats.totalRevenue.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                <Target className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-violet-700 bg-violet-50 border-violet-100">
                Target: ${goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-stone-400">
                <span>Progress</span>
                <span>{goalProgress.toFixed(1)}%</span>
              </div>
              {isGoalLoading ? (
                <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full w-1/3 animate-pulse bg-violet-300 rounded-full" />
                </div>
              ) : (
                <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                disabled={!teamCanEdit}
                className="h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-base font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Set revenue goal"
              />
              <Button
                onClick={handleSaveGoal}
                disabled={isGoalSaving || !teamCanEdit}
                className="h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 text-base font-bold"
              >
                {isGoalSaving ? 'Saving...' : 'Save Goal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2.15fr_1fr] gap-8 items-stretch">
        {/* Performance Chart */}
        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden min-h-[520px]" data-tutorial-id="income-chart">
          <CardHeader className="p-8 pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl font-extrabold tracking-tight text-stone-900">Revenue Performance</CardTitle>
                <CardDescription className="text-base text-stone-600 font-semibold">Daily revenue trends for the current period</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full text-stone-900 hover:text-stone-900 hover:bg-stone-100 font-semibold select-none">
                 <Filter className="w-4 h-4 mr-2" /> Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[430px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#57534E', fontSize: 12, fontWeight: 600}} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#57534E', fontSize: 12, fontWeight: 600}} tickFormatter={(val) => `$${val}`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#57534E', fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: '#F5F5F4'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Poppins, sans-serif'}}
                    itemStyle={{fontWeight: '700', fontSize: '12px'}}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#1C1917" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                  <Bar yAxisId="right" dataKey="closed" fill="#10B981" radius={[4, 4, 0, 0]} name="Closed Deals" />
                  <Bar yAxisId="right" dataKey="lost" fill="#EF4444" radius={[4, 4, 0, 0]} name="Lost/Disinterested" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Feed */}
        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden flex flex-col min-h-[520px]" data-tutorial-id="income-recent">
           <CardHeader className="p-8">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-stone-900">Recent Closed Deals</CardTitle>
              <CardDescription className="text-base text-stone-600 font-semibold">Company, amount, close time, and status.</CardDescription>
           </CardHeader>
           <CardContent className="p-8 pt-0 flex-1">
              <div className="space-y-4">
                {recentClosedDeals.length > 0 && (
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.7fr] gap-2 px-2 text-[10px] font-extrabold uppercase tracking-widest text-stone-500">
                    <span>Company</span>
                    <span>Amount</span>
                    <span>Closed</span>
                    <span>Status</span>
                  </div>
                )}

                <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
                  {recentClosedDeals.map((deal) => (
                    <div key={deal.id} className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.7fr] gap-2 items-center rounded-2xl border border-stone-100 bg-stone-50 px-3 py-3">
                      <div>
                        <p className="text-base font-bold text-stone-900 leading-tight">{deal.company}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-[10px] text-stone-500 font-medium truncate">{deal.contact}</p>
                          {isTeamContext && (
                            <Badge
                              className={`h-5 border-0 px-2 text-[9px] font-black uppercase tracking-wider ${
                                deal.ownerUserId === currentUserId
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {deal.ownerUserId === currentUserId ? 'Mine' : 'Team'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-base font-extrabold text-stone-900">{deal.amountLabel || `$${deal.amount.toLocaleString()}`}</p>
                      <p className="text-sm font-semibold text-stone-600">
                        {deal.closedAt
                          ? `${formatDistanceToNow(new Date(deal.closedAt), { addSuffix: true })}`
                          : 'Unknown'}
                      </p>
                      <div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">Paid</Badge>
                      </div>
                    </div>
                  ))}

                  {recentClosedDeals.length === 0 && (
                   <div className="text-center py-12 text-stone-600">
                      <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-10" />
                      <p className="text-sm">No closed deals found yet.</p>
                   </div>
                  )}
                </div>
              </div>
              
              <Button variant="ghost" className="w-full mt-8 rounded-2xl h-11 border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50">
                 View Transaction Log
              </Button>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RootIncomePage() {
  return (
    <div className="flex min-h-screen app-shell-bg app-shell-text">
      <div className="hidden md:block fixed left-0 top-0 h-full z-50">
        <Sidebar />
      </div>
      <main 
        className="flex-1 p-0 min-h-screen relative z-0 transition-[margin] duration-75"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <IncomePageContent />
      </main>
    </div>
  );
}
