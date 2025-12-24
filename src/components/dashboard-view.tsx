'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateMockLeads } from '@/lib/mock-leads';
import { ProcessedLead } from '@/lib/types';
import { Search, ShoppingCart, Bell, MessageSquare, Plus, ArrowRight, User, TrendingUp, ChevronDown, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    count: 50,
    price: 9,
    originalPrice: 29,
    description: '50 Leads',
    color: 'bg-blue-100 text-blue-600',
    popular: false,
    status: 'Active'
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    count: 100,
    price: 16,
    originalPrice: 49,
    description: '100 Leads',
    color: 'bg-purple-100 text-purple-600',
    popular: true,
    status: 'Active'
  },
  {
    id: 'pro',
    name: 'Pro Bundle',
    count: 250,
    price: 35,
    originalPrice: 99,
    description: '250 Leads',
    color: 'bg-orange-100 text-orange-600',
    popular: false,
    status: 'Active'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    count: 1000,
    price: 120,
    originalPrice: 299,
    description: '1000 Leads',
    color: 'bg-green-100 text-green-600',
    popular: false,
    status: 'Offline'
  },
];

const PREVIEW_LEADS = generateMockLeads(6).map(l => ({ ...l, website: '' }));

interface DashboardViewProps {
  isGuest?: boolean;
  onAuthRequest?: () => void;
}

export function DashboardView({ isGuest = false, onAuthRequest }: DashboardViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [myLeads, setMyLeads] = useState<ProcessedLead[]>([]);
  const [leadsCount, setLeadsCount] = useState<number>(0);
  const [newLeadsToday, setNewLeadsToday] = useState<number>(0);

  useEffect(() => {
    if (isGuest) return;

    const loadLeads = async () => {
      let userId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        userId = session.user.id;
      } else if (typeof window !== 'undefined' && localStorage.getItem('demo_mode')) {
        userId = 'demo-user';
      }

      if (userId) {
        const storageKey = `leadsorter_leads_${userId}`;
        const storedLeads = localStorage.getItem(storageKey);
        if (storedLeads) {
          const parsedLeads: ProcessedLead[] = JSON.parse(storedLeads);
          setMyLeads(parsedLeads);
          setLeadsCount(parsedLeads.length);
          // Just a simulation for "new today" - maybe random or last 24h if we had dates
          setNewLeadsToday(Math.min(parsedLeads.length, Math.floor(Math.random() * 20) + 1));
        }
      }
    };
    loadLeads();
  }, [isGuest]);

  const handleBuy = async (pkg: typeof PACKAGES[0]) => {
    if (pkg.status === 'Offline') return;

    if (isGuest) {
      onAuthRequest?.();
      return;
    }

    setLoading(pkg.id);
    let userId: string | null = null;
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      userId = session.user.id;
    } else if (typeof window !== 'undefined' && localStorage.getItem('demo_mode')) {
      userId = 'demo-user';
    }

    if (!userId) {
      // Should not happen if isGuest logic is used correctly, but safeguard
      onAuthRequest?.();
      setLoading(null);
      return;
    }

    // Simulate Network Request
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newLeads = generateMockLeads(pkg.count);
    const storageKey = `leadsorter_leads_${userId}`;
    const existingLeadsJson = localStorage.getItem(storageKey);
    let existingLeads: ProcessedLead[] = existingLeadsJson ? JSON.parse(existingLeadsJson) : [];

    const allLeads = [...existingLeads, ...newLeads];
    localStorage.setItem(storageKey, JSON.stringify(allLeads));

    // Update state to reflect immediate change
    setMyLeads(allLeads);
    setLeadsCount(allLeads.length);

    toast({
      title: "Purchase Successful!",
      description: `You've added ${pkg.count} leads to your dashboard.`,
    });

    setLoading(null);
    router.push('/leads');
  };

  const handleRestrictedAction = () => {
    if (isGuest) {
        onAuthRequest?.();
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-[#1C1917]">Dashboard</h1>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="search"
              placeholder="Search anything..."
              className="pl-10 h-12 rounded-full border-none bg-white shadow-sm placeholder:text-stone-400 text-stone-800"
            />
          </div>

          <Button
            className="h-12 px-6 rounded-full bg-[#1C1917] hover:bg-stone-800 text-[#E5E4E2] font-medium"
            onClick={handleRestrictedAction}
          >
            Create
          </Button>

          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-white shadow-sm hover:bg-stone-50">
              <Bell className="h-4 w-4 text-stone-600" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-white shadow-sm hover:bg-stone-50">
              <MessageSquare className="h-4 w-4 text-stone-600" />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm cursor-pointer" onClick={handleRestrictedAction}>
              <AvatarImage src={isGuest ? "" : "https://github.com/shadcn.png"} />
              <AvatarFallback>{isGuest ? "?" : "CN"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* Overview Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customers / Leads Available */}
            <Card className="rounded-[32px] border-none shadow-sm hover:shadow-md transition-shadow bg-[#1C1917] text-[#FAFAF9]">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-stone-800/50 rounded-full">
                       <User className="h-5 w-5 text-stone-300" />
                     </div>
                     <span className="font-semibold text-stone-200">Leads Available</span>
                   </div>
                 </div>
                 <div className="flex items-baseline gap-4">
                   <span className="text-5xl font-bold tracking-tight">
                     {isGuest ? '3,493' : leadsCount.toLocaleString()}
                   </span>
                   <Badge variant="secondary" className="bg-[#E5E4E2] text-[#1C1917] hover:bg-white px-2 py-1">
                     <TrendingUp className="h-3 w-3 mr-1" /> {isGuest ? '+36.8%' : 'Updated'}
                   </Badge>
                 </div>
                 <p className="text-sm text-stone-400 mt-2">vs last month</p>
              </CardContent>
            </Card>

            {/* Balance / Credits */}
            <Card className="rounded-[32px] border-none shadow-sm hover:shadow-md transition-shadow bg-[#1C1917] text-[#FAFAF9]">
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-stone-800/50 rounded-full">
                       <ShoppingCart className="h-5 w-5 text-stone-300" />
                     </div>
                     <span className="font-semibold text-stone-200">Bundle Price</span>
                   </div>
                   <Button variant="ghost" size="sm" className="h-8 text-xs text-stone-400 hover:text-stone-300">Last month <ChevronDown className="h-3 w-3 ml-1"/></Button>
                 </div>
                 <div className="flex items-baseline gap-4">
                   <span className="text-5xl font-bold tracking-tight">$9.00</span>
                   <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1">
                     <TrendingUp className="h-3 w-3 mr-1" /> Low Price
                   </Badge>
                 </div>
                 <p className="text-sm text-stone-400 mt-2">Starting at</p>
              </CardContent>
            </Card>
          </div>

          {/* New Customers / Leads Avatars */}
          <div className="bg-transparent space-y-4">
            <h3 className="font-semibold text-stone-700">
              {isGuest ? '857' : newLeadsToday} new leads today!
            </h3>
            <p className="text-sm text-stone-500">Send a welcome message to all new potential clients.</p>

            <div className="flex items-center gap-4 flex-wrap">
               {isGuest ? (
                 [1,2,3,4,5].map((i) => (
                   <div key={i} className="flex flex-col items-center gap-2">
                     <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                       <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} />
                       <AvatarFallback>U{i}</AvatarFallback>
                     </Avatar>
                     <span className="text-xs font-medium text-stone-600">Lead {i}</span>
                   </div>
                 ))
               ) : (
                 myLeads.slice(0, 5).map((lead, i) => (
                   <div key={i} className="flex flex-col items-center gap-2">
                     <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                       {/* Using first letter as avatar seed to be consistent */}
                       <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.businessName}`} />
                       <AvatarFallback>{lead.businessName.charAt(0)}</AvatarFallback>
                     </Avatar>
                     <span className="text-xs font-medium text-stone-600 w-16 truncate text-center" title={lead.businessName}>
                        {lead.businessName}
                     </span>
                   </div>
                 ))
               )}
               {((!isGuest && myLeads.length > 5) || isGuest) && (
                 <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-white text-[#1C1917] shadow-sm hover:bg-stone-50 border ml-2"
                    onClick={() => !isGuest && router.push('/leads')}
                 >
                   <ArrowRight className="h-6 w-6" />
                 </Button>
               )}
               <span className="text-sm font-medium text-stone-500 ml-2 cursor-pointer" onClick={() => !isGuest && router.push('/leads')}>View all</span>
            </div>
          </div>

          {/* Product View - Blurred Preview */}
          <Card className="rounded-[32px] border-none shadow-sm min-h-[400px] bg-[#1C1917] text-[#FAFAF9]">
            <CardContent className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Product view</h3>
                <Button variant="ghost" size="sm" className="text-stone-400 hover:text-stone-300">Last 7 days <ChevronDown className="h-4 w-4 ml-2"/></Button>
              </div>

              {/* The "Blurry" Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                 {/* Overlay that forces login/buy */}

                 {PREVIEW_LEADS.map((lead, i) => (
                   <div key={i} className="relative group">
                     {/* Using lighter cream background for inner cards for contrast against dark card */}
                     <div className="bg-[#F5F5F4] rounded-2xl p-4 h-full border border-transparent hover:border-stone-200 transition-all text-[#1C1917]">
                       <div className="flex items-center gap-3 mb-3">
                         <div className="h-10 w-10 rounded-full bg-[#E7E5E4] flex items-center justify-center text-stone-600 font-bold">
                           {lead.businessName.charAt(0)}
                         </div>
                         <div>
                           <div className="font-bold text-sm text-[#1C1917]">{lead.businessName}</div>
                           <div className="text-xs text-stone-500">Verified • Mobile</div>
                         </div>
                       </div>

                       {/* Blurred details */}
                       <div className="space-y-2 mt-4 select-none filter blur-sm opacity-50">
                         <div className="h-4 bg-stone-300 rounded w-3/4"></div>
                         <div className="h-4 bg-stone-300 rounded w-1/2"></div>
                         <div className="h-4 bg-stone-300 rounded w-full"></div>
                       </div>
                     </div>

                     {/* Hover Action */}
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer" onClick={() => handleBuy(PACKAGES[0])}>
                        <div className="bg-[#1C1917]/90 backdrop-blur text-[#FAFAF9] px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                           Buy Bundle to Reveal
                        </div>
                     </div>
                   </div>
                 ))}
              </div>

              <div className="mt-8 pt-8 border-t border-stone-800 flex items-center justify-between">
                 <div className="text-4xl font-bold text-stone-200">$10.2m</div>
                 {/* Fake bars */}
                 <div className="flex items-end gap-2 h-16 opacity-30">
                    <div className="w-8 bg-stone-500 h-[40%] rounded-t-sm"></div>
                    <div className="w-8 bg-stone-500 h-[70%] rounded-t-sm"></div>
                    <div className="w-8 bg-green-500 h-[100%] rounded-t-sm relative">
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#FAFAF9] text-[#1C1917] text-[10px] px-2 py-1 rounded font-bold">2.2m</div>
                    </div>
                    <div className="w-8 bg-stone-500 h-[60%] rounded-t-sm"></div>
                    <div className="w-8 bg-stone-500 h-[80%] rounded-t-sm"></div>
                 </div>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           {/* Popular Products */}
           <Card className="rounded-[32px] border-none shadow-sm h-full bg-[#1C1917] text-[#FAFAF9]">
             <CardContent className="p-8">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">Popular products</h3>
               </div>

               <div className="space-y-6">
                 {PACKAGES.map((pkg) => (
                   <div key={pkg.id} className="flex items-center justify-between group cursor-pointer" onClick={() => handleBuy(pkg)}>
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

               <Button variant="outline" className="w-full mt-8 rounded-full h-12 border-stone-700 text-stone-400 hover:bg-stone-800 hover:text-stone-200">
                 All products
               </Button>
             </CardContent>
           </Card>

           {/* Comments / Activity */}
           <div className="px-4">
             <h3 className="text-lg font-bold mb-4 text-[#1C1917]">Comments</h3>
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
               <div className="flex gap-4">
                 <Avatar className="h-10 w-10">
                   <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" />
                   <AvatarFallback>FL</AvatarFallback>
                 </Avatar>
                 <div>
                   <div className="flex items-baseline gap-2">
                     <span className="font-bold text-sm text-[#1C1917]">Joyce</span>
                     <span className="text-xs text-stone-400">on Starter Pack</span>
                   </div>
                   <div className="text-[10px] text-stone-300 mb-2">09:00 AM</div>
                   <p className="text-sm text-stone-600 leading-relaxed">
                     Great quality leads! When will the HTML industry pack be available? ⚡
                   </p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
