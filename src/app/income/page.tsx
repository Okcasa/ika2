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

// Mock Chart Data
const CHART_DATA = [
  { name: 'Mon', revenue: 4500 },
  { name: 'Tue', revenue: 5200 },
  { name: 'Wed', revenue: 4800 },
  { name: 'Thu', revenue: 6100 },
  { name: 'Fri', revenue: 5900 },
  { name: 'Sat', revenue: 4200 },
  { name: 'Sun', revenue: 3800 },
];

function IncomePageContent() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(LEADS_STORAGE_KEY);
    if (saved) {
      setLeads(JSON.parse(saved));
    }
  }, []);

  const stats = useMemo(() => {
    const closedLeads = leads.filter(l => l.status === 'Closed' || l.status === 'Closed Deal');
    const totalRevenue = closedLeads.reduce((acc, l) => {
      const val = parseFloat(l.value.replace(/[$,]/g, '')) || 0;
      return acc + val;
    }, 0);

    return {
      totalRevenue,
      closedCount: closedLeads.length,
      avgDeal: closedLeads.length > 0 ? totalRevenue / closedLeads.length : 0,
      conversionRate: leads.length > 0 ? (closedLeads.length / leads.length) * 100 : 0
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
            Request Payout
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
            <p className="text-sm font-bold text-stone-400 uppercase tracking-widest mt-4">Pending Credits</p>
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
                <AreaChart data={CHART_DATA}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1C1917" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1C1917" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A8A29E', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#A8A29E', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontWeight: 'bold', color: '#1C1917'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#1C1917" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
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
                {leads.filter(l => l.status === 'Closed' || l.status === 'Closed Deal').slice(0, 5).map((lead, i) => (
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
                {leads.filter(l => l.status === 'Closed' || l.status === 'Closed Deal').length === 0 && (
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
