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
const COMPLETED_TRANSACTION_STATUSES = new Set(['completed', 'paid', 'billed']);

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

const extractTransactionLabel = (tx: any) => {
  const productName =
    tx?.payload?.data?.details?.line_items?.[0]?.product?.name ||
    tx?.payload?.details?.line_items?.[0]?.product?.name ||
    tx?.payload?.data?.items?.[0]?.price?.name ||
    tx?.payload?.items?.[0]?.price?.name;
  if (typeof productName === 'string' && productName.trim().length > 0) return productName.trim();
  return 'Lead package purchase';
};

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
  const [paymentEvents, setPaymentEvents] = useState<any[]>([]);
  const { isMineScope } = useLeadScope();

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mounted) setCurrentUserId(session.user.id);
          let resolvedTeamId: string | null = null;
          let scopedUserIds: string[] = [session.user.id];
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
            const memberIds = [
              ...new Set(
                (Array.isArray(teamJson?.members) ? teamJson.members : [])
                  .map((member: any) => String(member?.user_id || '').trim())
                  .filter((id: string) => id.length > 0)
              ),
            ] as string[];
            scopedUserIds = resolvedTeamId && !viewerOwnMode
              ? (memberIds.length > 0 ? memberIds : [session.user.id])
              : [session.user.id];
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

          const { data: fulfillmentRows, error: fulfillmentErr } = await supabase
            .from('paddle_fulfillments')
            .select('id, transaction_id, user_id, lead_count, package_id, created_at')
            .in('user_id', scopedUserIds)
            .order('created_at', { ascending: false })
            .limit(400);

          if (!fulfillmentErr) {
            const txIds = Array.from(
              new Set(
                (fulfillmentRows || [])
                  .map((row: any) => String(row?.transaction_id || '').trim())
                  .filter((id: string) => id.length > 0)
              )
            );

            let txById = new Map<string, any>();
            if (txIds.length > 0) {
              const { data: txRows } = await supabase
                .from('paddle_transactions')
                .select('id, status, payload, created_at, updated_at')
                .in('id', txIds);
              txById = new Map((txRows || []).map((row: any) => [String(row?.id || ''), row]));
            }

            const merged = (fulfillmentRows || [])
              .map((row: any) => {
                const txId = String(row?.transaction_id || '').trim();
                const tx = txId ? txById.get(txId) : null;
                const txStatus = String(tx?.status || '').toLowerCase();
                return {
                  ...row,
                  tx,
                  txStatus,
                  amount: extractTransactionAmount(tx),
                  occurredAt: row?.created_at || tx?.updated_at || tx?.created_at || null,
                };
              })
              .filter((row: any) => COMPLETED_TRANSACTION_STATUSES.has(String(row?.txStatus || '')));

            if (mounted) setPaymentEvents(merged);
          }
        } else {
          const saved = localStorage.getItem(LEADS_STORAGE_KEY);
          if (saved && mounted) {
            setLeads(JSON.parse(saved));
          }
          if (mounted) setPaymentEvents([]);
        }
      } catch {
        const saved = localStorage.getItem(LEADS_STORAGE_KEY);
        if (saved && mounted) {
          setLeads(JSON.parse(saved));
        }
        if (mounted) setPaymentEvents([]);
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

  const scopedPayments = useMemo(() => {
    return paymentEvents.filter((event: any) => inSelectedWindow(event?.occurredAt));
  }, [paymentEvents, periodDays]);

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

    scopedPayments.forEach((e: any) => {
      if (!e?.occurredAt) return;
      const dayName = format(new Date(e.occurredAt), 'EEE');
      if (dataMap[dayName]) {
        dataMap[dayName].revenue += Number(e?.amount) || 0;
        dataMap[dayName].closed += 1;
      }
    });

    return days.map(name => ({
      name,
      ...dataMap[name]
    }));
  }, [scopedPayments]);

  const stats = useMemo(() => {
    const totalRevenue = scopedPayments.reduce((acc, e: any) => acc + (Number(e?.amount) || 0), 0);
    return {
      totalRevenue,
    };
  }, [scopedPayments]);

  const goalProgress = useMemo(() => {
    if (!goal || goal <= 0) return 0;
    return Math.max(0, Math.min(100, (stats.totalRevenue / goal) * 100));
  }, [stats.totalRevenue, goal]);

  const recentClosedDeals = useMemo(() => {
    return [...scopedPayments]
      .sort((a, b) => {
        const ta = a?.occurredAt ? new Date(a.occurredAt).getTime() : 0;
        const tb = b?.occurredAt ? new Date(b.occurredAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10)
      .map((e: any) => {
        const amount = Number(e?.amount);
        return {
          id: String(e?.id || `${e?.transaction_id || 'tx'}-${e?.occurredAt || Date.now()}`),
          company: extractTransactionLabel(e?.tx),
          amount: Number.isFinite(amount) ? amount : 0,
          amountLabel: formatUsdAmount(Number.isFinite(amount) ? amount : null) || '$0.00',
          closedAt: e?.occurredAt,
          contact: String(e?.transaction_id || 'Transaction'),
          ownerUserId: e?.user_id || null,
          status: 'Paid',
        };
      });
  }, [scopedPayments]);

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
