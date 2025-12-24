'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProcessedLead } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react';
import { useUserId } from '@/hooks/use-user-id';

export default function IncomePage() {
  const { userId, loading } = useUserId();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    conversionRate: 0,
    totalLeads: 0
  });

  const [chartData, setChartData] = useState<{name: string, sales: number}[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Use the same key logic as DashboardView
    const LEADS_KEY = `leadsorter_leads_${userId}`;
    const storedLeads = localStorage.getItem(LEADS_KEY);

    if (storedLeads) {
      const allLeads: ProcessedLead[] = JSON.parse(storedLeads);
      const sales = allLeads.filter(l => l.leadStatus === 'sale-made').length;
      const total = allLeads.length;

      // Assume $99 per sale for demo
      const revenue = sales * 99;

      setStats({
        totalRevenue: revenue,
        totalSales: sales,
        conversionRate: total > 0 ? (sales / total) * 100 : 0,
        totalLeads: total
      });

      // Mock chart data based on sales
      setChartData([
        { name: 'Mon', sales: Math.floor(sales * 0.1) * 99 },
        { name: 'Tue', sales: Math.floor(sales * 0.2) * 99 },
        { name: 'Wed', sales: Math.floor(sales * 0.15) * 99 },
        { name: 'Thu', sales: Math.floor(sales * 0.3) * 99 },
        { name: 'Fri', sales: Math.floor(sales * 0.25) * 99 },
        { name: 'Sat', sales: 0 },
        { name: 'Sun', sales: 0 },
      ]);
    }
  }, [userId]);

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Income & Analytics</h1>
        <p className="text-muted-foreground">Track your performance and revenue.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Made</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="sales" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
