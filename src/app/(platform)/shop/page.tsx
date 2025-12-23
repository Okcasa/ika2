'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { generateMockLeads } from '@/lib/mock-leads';
import { ProcessedLead } from '@/lib/types';
import { Search, ShoppingCart, Star, TrendingUp, CheckCircle, Zap } from 'lucide-react';
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
    description: 'Perfect for testing the waters. 50 high-quality leads.',
    color: 'bg-blue-500',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    count: 100,
    price: 16,
    originalPrice: 49,
    description: 'Scale your outreach with 100 verified leads.',
    color: 'bg-purple-500',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro Bundle',
    count: 250,
    price: 35,
    originalPrice: 99,
    description: 'Serious volume for serious closers. 250 leads.',
    color: 'bg-orange-500',
    popular: false,
  },
];

// Generate a few leads for the preview
const PREVIEW_LEADS = generateMockLeads(6).map(l => ({ ...l, website: '' })); // Ensure they have no website as requested

export default function ShopPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (pkg: typeof PACKAGES[0]) => {
    setLoading(pkg.id);

    // Check auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a purchase.",
        variant: "destructive"
      });
      router.push('/');
      setLoading(null);
      return;
    }

    const userId = session.user.id;

    // Simulate API call / Payment
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get leads
    const newLeads = generateMockLeads(pkg.count);

    // Store in localStorage (keyed by user)
    const storageKey = `leadsorter_leads_${userId}`;
    const existingLeadsJson = localStorage.getItem(storageKey);
    let existingLeads: ProcessedLead[] = existingLeadsJson ? JSON.parse(existingLeadsJson) : [];

    // Add new leads to existing
    const allLeads = [...existingLeads, ...newLeads];
    localStorage.setItem(storageKey, JSON.stringify(allLeads));

    toast({
      title: "Purchase Successful!",
      description: `You've added ${pkg.count} leads to your dashboard.`,
    });

    setLoading(null);
    router.push('/leads');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Marketplace</h1>
          <p className="text-muted-foreground mt-1">Buy high-quality, verified leads for your business.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search industries..."
              className="pl-8 bg-background"
            />
          </div>
          <Button size="icon" variant="outline" className="rounded-full">
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hero / Banner */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <TrendingUp className="h-64 w-64" />
          </div>
          <CardContent className="p-8 relative z-10 flex flex-col h-full justify-center">
             <Badge className="w-fit mb-4 bg-white/20 hover:bg-white/30 text-white border-none">
                <Zap className="h-3 w-3 mr-1" fill="currentColor" /> New Arrivals
             </Badge>
             <h2 className="text-4xl font-bold mb-2">Fresh Leads Drop</h2>
             <p className="text-indigo-100 mb-6 max-w-md">
               Over 3,000 new leads added today. Verified phone numbers, no websites (high potential), and ready for outreach.
             </p>
             <div className="flex gap-3">
               <Button className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold" size="lg">
                 Browse All
               </Button>
               <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                 Learn More
               </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-dashed border-2 flex flex-col items-center justify-center p-6 text-center space-y-4">
             <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-8 w-8 text-primary" fill="currentColor" />
             </div>
             <div>
               <h3 className="font-bold text-xl">Premium Quality</h3>
               <p className="text-sm text-muted-foreground mt-2">
                 All leads are verified for active phone numbers. We filter out the junk so you don't have to.
               </p>
             </div>
        </Card>
      </div>

      {/* Packages */}
      <div className="grid md:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => (
          <Card key={pkg.id} className={`flex flex-col relative transition-all duration-300 hover:shadow-xl ${pkg.popular ? 'border-primary/50 shadow-md scale-105 z-10' : ''}`}>
             {pkg.popular && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                 MOST POPULAR
               </div>
             )}
             <CardHeader>
               <CardTitle className="flex justify-between items-center">
                 <span>{pkg.name}</span>
                 {pkg.popular && <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />}
               </CardTitle>
               <CardDescription>{pkg.description}</CardDescription>
             </CardHeader>
             <CardContent className="flex-1">
               <div className="flex items-baseline gap-1 mb-6">
                 <span className="text-3xl font-bold">${pkg.price}</span>
                 <span className="text-sm text-muted-foreground line-through">${pkg.originalPrice}</span>
                 <span className="text-sm text-green-500 font-medium ml-2">Save {Math.round((1 - pkg.price/pkg.originalPrice) * 100)}%</span>
               </div>

               <ul className="space-y-2 text-sm">
                 <li className="flex items-center gap-2">
                   <CheckCircle className="h-4 w-4 text-green-500" />
                   <span>{pkg.count} Verified Leads</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle className="h-4 w-4 text-green-500" />
                   <span>Random Industry Mix</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle className="h-4 w-4 text-green-500" />
                   <span>Phone Numbers Included</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle className="h-4 w-4 text-green-500" />
                   <span>No Website (High Potential)</span>
                 </li>
               </ul>
             </CardContent>
             <CardFooter>
               <Button
                 className="w-full"
                 variant={pkg.popular ? 'default' : 'outline'}
                 onClick={() => handleBuy(pkg)}
                 disabled={!!loading}
               >
                 {loading === pkg.id ? 'Processing...' : 'Buy Now'}
               </Button>
             </CardFooter>
          </Card>
        ))}
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Live Preview</h2>
          <Button variant="ghost" className="text-primary">View All Products</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Leads (No Website)</CardTitle>
            <CardDescription>
              These are real examples of leads currently in our pool. Purchase a bundle to unlock full details.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {PREVIEW_LEADS.map((lead, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-lg border p-4 hover:border-primary/50 transition-colors">
                     {/* Overlay for blur effect */}

                     <div className="flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                         <Badge variant="secondary">{lead.businessType}</Badge>
                         <span className="text-xs text-muted-foreground">New</span>
                       </div>

                       <div className="space-y-1">
                          {/* Visible part */}
                          <div className="font-semibold text-lg">{lead.businessName.split(' ')[0]}...</div>

                          {/* Blurred part */}
                          <div className="relative">
                            <div className="filter blur-sm select-none opacity-60">
                               <p className="text-sm">📞 {lead.phoneNumber}</p>
                               <p className="text-sm">📍 {lead.notes}</p>
                               <p className="text-sm">👤 {lead.ownerName}</p>
                            </div>

                            {/* Lock icon overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium shadow-sm border flex items-center gap-1">
                                  🔒 Purchase to unlock
                               </div>
                            </div>
                          </div>
                       </div>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
