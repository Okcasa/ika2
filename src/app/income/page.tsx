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
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Wallet,
  ArrowRightLeft,
  Filter,
  History as HistoryIcon
} from 'lucide-react';

// Storage Key
const LEADS_STORAGE_KEY = 'ika_leads_data';

function IncomePageContent() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(LEADS_STORAGE_KEY);
    if (saved) {
      setLeads(JSON.parse(saved));
    }
  }, []);

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

    // Get Current Day Index (0-6)
    const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday
    const nextWeekDayIndex = (currentDayIndex === 0) ? 6 : currentDayIndex - 1; // Map to our days array index
    
    // Process all leads with real timestamps
    leads.forEach((l) => {
      if (!l.history || l.history.length === 0) return;
      
      // Look at history to find when it was Closed or Lost
      l.history.forEach((h: any) => {
        if (!h.timestamp) return;
        
        const dateObj = new Date(h.timestamp);
        const dayName = format(dateObj, 'EEE'); // Mon, Tue, etc.
        const val = parseFloat(l.value?.replace(/[$,]/g, '') || '0') || 0;

        if (h.result === 'Closed Deal') {
          if (dataMap[dayName]) {
            dataMap[dayName].revenue += val;
            dataMap[dayName].closed += 1;
          }
        } else if (h.result === 'Not Interested' || h.result === 'Deal Lost') {
          if (dataMap[dayName]) {
            dataMap[dayName].lost += 1;
          }
        }
      });
    });

    return days.map(name => ({
      name,
      ...dataMap[name]
    }));
  }, [leads]);

  const stats = useMemo(() => {
    // Only count leads as closed if they have history supporting it (prevents counting deleted logs)
    const closedLeads = leads.filter(l => (l.status === 'Closed' || l.status === 'Closed Deal') && (l.history && l.history.length > 0));
    const totalRevenue = closedLeads.reduce((acc, l) => {
      const val = parseFloat(l.value?.replace(/[$,]/g, '') || '0') || 0;
      return acc + val;
    }, 0);

    // Filter out $0 deals for average calculation to avoid skewing stats with test entries
    const meaningfulDeals = closedLeads.filter(l => parseFloat(l.value.replace(/[$,]/g, '')) > 0);
    const totalMeaningfulRevenue = meaningfulDeals.reduce((acc, l) => acc + (parseFloat(l.value.replace(/[$,]/g, '')) || 0), 0);

    return {
      totalRevenue,
      closedCount: closedLeads.length,
      avgDeal: meaningfulDeals.length > 0 ? totalMeaningfulRevenue / meaningfulDeals.length : 0,
      // Closing rate based on a realistic total pipeline (including some mock baseline)
      conversionRate: leads.length > 0 ? (closedLeads.length / (leads.length + 50)) * 100 : 0
    };
  }, [leads]);

  return (
    <div className="p-8 space-y-8 bg-[#E5E4E2] min-h-screen text-stone-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Income Overview</h1>
          <p className="text-stone-500 mt-1">Real-time performance analytics and revenue tracking.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl h-11">
             <Calendar className="w-4 h-4 mr-2" />
             Last 7 Days
          </Button>
          <Button className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl h-11 px-6 font-bold shadow-lg shadow-black/10">
            Add Credits
          </Button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mt-4">Total Revenue</p>
            <p className="text-3xl font-black text-stone-900 mt-1">${stats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-stone-50 rounded-lg text-stone-400">
                 <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mt-4">Average Sale</p>
            <p className="text-3xl font-black text-stone-900 mt-1">${stats.avgDeal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-stone-50 rounded-lg text-stone-400">
                 <TrendingUp className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-stone-600 bg-stone-100 border-stone-200">
                 Top 5%
              </Badge>
            </div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mt-4">Closing Rate</p>
            <p className="text-3xl font-black text-stone-900 mt-1">{stats.conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-stone-900 text-white overflow-hidden shadow-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/10 rounded-lg text-stone-300">
                 <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mt-4">Available Balance</p>
            <p className="text-3xl font-black text-white mt-1">$1,240</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <Card className="lg:col-span-2 rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold">Revenue Performance</CardTitle>
                <CardDescription>Daily revenue trends for the current period</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full text-stone-400 hover:text-stone-900">
                 <Filter className="w-4 h-4 mr-2" /> Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A8A29E', fontSize: 12}} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#A8A29E', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#A8A29E', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#F5F5F4'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontWeight: 'bold', fontSize: '12px'}}
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
        <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden flex flex-col">
           <CardHeader className="p-8">
              <CardTitle className="text-xl font-bold">Recent Sales</CardTitle>
              <CardDescription>Last interactions converted.</CardDescription>
           </CardHeader>
           <CardContent className="p-8 pt-0 flex-1">
              <div className="space-y-6">
                {leads.filter(l => (l.status === 'Closed' || l.status === 'Closed Deal') && (l.history && l.history.length > 0)).slice(0, 5).map((lead, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.businessName}`} alt="" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900 group-hover:text-stone-600 transition-colors">{lead.businessName}</p>
                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-tight">Closed Deal</p>
                      </div>
                    </div>
                    <div className="text-right text-sm font-black text-stone-900">
                       {lead.value}
                    </div>
                  </div>
                ))}
                {leads.filter(l => (l.status === 'Closed' || l.status === 'Closed Deal') && (l.history && l.history.length > 0)).length === 0 && (
                   <div className="text-center py-12 text-stone-400">
                      <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-10" />
                      <p className="text-xs">No transactions found.</p>
                   </div>
                )}
              </div>
              
              <Button variant="ghost" className="w-full mt-8 rounded-2xl h-11 border border-stone-100 text-stone-400 hover:text-stone-900 hover:bg-stone-50">
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
    <div className="flex min-h-screen bg-[#E5E4E2]">
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
