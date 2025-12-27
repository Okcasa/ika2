'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Gift, Share2, Mail, Trophy, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/use-user-id';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/sidebar';

function PromotePageContent() {
  const { userId } = useUserId();
  const { toast } = useToast();

  // Use generic or user-specific referral link
  const referralLink = userId ? `https://leadsmarketplace.com/r/${userId}` : "https://leadsmarketplace.com/r/join-now";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Sharing not available",
      description: "Social sharing integration is coming soon! Please copy your link manually.",
    });
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Join me on Leads Marketplace");
    const body = encodeURIComponent(`Check out this platform for buying high quality leads: ${referralLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleApply = () => {
    toast({
      title: "Application Sent",
      description: "We have received your affiliate application. We will contact you shortly.",
    });
  };

  return (
    <div className="p-8 space-y-8 bg-[#E5E4E2] min-h-screen text-stone-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Promote & Earn</h1>
          <p className="text-stone-500 mt-1">Share the platform and earn free leads for every referral.</p>
        </div>
        <Button className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl h-11 px-6 font-bold shadow-lg shadow-black/10">
           <Trophy className="w-4 h-4 mr-2" /> Leaderboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Referral Link & Stats */}
        <div className="lg:col-span-2 space-y-8">
           {/* Referral Link Card */}
           <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden">
             <CardHeader className="p-8 pb-4">
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-stone-100 rounded-xl">
                   <Gift className="h-6 w-6 text-stone-900" />
                 </div>
                 <CardTitle className="text-xl font-bold text-stone-900">Your Referral Link</CardTitle>
               </div>
               <CardDescription className="text-stone-500 text-base">
                 Share this unique link. For every friend who signs up and purchases a pack, you get <span className="font-bold text-stone-900">50 free leads</span>.
               </CardDescription>
             </CardHeader>
             <CardContent className="p-8 pt-0 space-y-6">
                <div className="flex gap-3">
                   <div className="relative flex-1">
                     <Input 
                        value={referralLink} 
                        readOnly 
                        className="h-12 rounded-xl border-stone-200 bg-stone-50 text-stone-900 font-medium pl-4 pr-12 text-base"
                     />
                   </div>
                   <Button 
                      className="h-12 px-6 rounded-xl bg-stone-900 text-white hover:bg-stone-800 font-bold" 
                      onClick={copyToClipboard}
                   >
                      <Copy className="h-4 w-4 mr-2" /> Copy
                   </Button>
                </div>

                <div className="flex gap-3">
                   <Button variant="outline" className="flex-1 h-11 rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-semibold" onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" /> Share on Social
                   </Button>
                   <Button variant="outline" className="flex-1 h-11 rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-semibold" onClick={handleEmail}>
                      <Mail className="mr-2 h-4 w-4" /> Email Invite
                   </Button>
                </div>
             </CardContent>
           </Card>

           {/* Stats Row */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden p-6 flex flex-col justify-center items-center text-center">
                 <div className="p-3 bg-stone-50 rounded-full mb-3 text-stone-400">
                    <Users className="w-6 h-6" />
                 </div>
                 <h3 className="text-3xl font-black text-stone-900">0</h3>
                 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Friends Invited</p>
              </Card>
              <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden p-6 flex flex-col justify-center items-center text-center">
                 <div className="p-3 bg-stone-50 rounded-full mb-3 text-stone-400">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <h3 className="text-3xl font-black text-stone-900">0</h3>
                 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Signups</p>
              </Card>
              <Card className="rounded-3xl border border-stone-200 shadow-sm bg-white overflow-hidden p-6 flex flex-col justify-center items-center text-center">
                 <div className="p-3 bg-emerald-50 rounded-full mb-3 text-emerald-600">
                    <Gift className="w-6 h-6" />
                 </div>
                 <h3 className="text-3xl font-black text-stone-900">0</h3>
                 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Leads Earned</p>
              </Card>
           </div>
        </div>

        {/* Right Column: Affiliate Program */}
        <div className="lg:col-span-1">
           <Card className="h-full rounded-3xl border border-stone-200 shadow-sm bg-stone-900 text-white overflow-hidden flex flex-col">
              <CardHeader className="p-8 pb-4">
                 <Badge className="w-fit bg-white/20 text-white border-0 mb-4 hover:bg-white/30">Pro Partner</Badge>
                 <CardTitle className="text-2xl font-bold">Become an Affiliate</CardTitle>
                 <CardDescription className="text-stone-400 text-base">
                    Want to earn cash commissions instead of leads? Join our partner program.
                 </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 flex-1">
                 <ul className="space-y-6">
                    <li className="flex gap-4">
                       <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">1</div>
                       <div>
                          <p className="font-bold text-lg">20% Commission</p>
                          <p className="text-sm text-stone-400">Earn recurring revenue on every payment your referrals make.</p>
                       </div>
                    </li>
                    <li className="flex gap-4">
                       <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">2</div>
                       <div>
                          <p className="font-bold text-lg">Monthly Payouts</p>
                          <p className="text-sm text-stone-400">Get paid directly to your bank account via Stripe every month.</p>
                       </div>
                    </li>
                    <li className="flex gap-4">
                       <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">3</div>
                       <div>
                          <p className="font-bold text-lg">Marketing Kit</p>
                          <p className="text-sm text-stone-400">Access exclusive banners, copy, and assets to help you promote.</p>
                       </div>
                    </li>
                 </ul>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                 <Button className="w-full h-12 bg-white text-stone-900 hover:bg-stone-200 rounded-xl font-bold text-base" onClick={handleApply}>
                    Apply for Partner Program <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              </CardFooter>
           </Card>
        </div>

      </div>
    </div>
  );
}

export default function RootPromotePage() {
  return (
    <div className="flex min-h-screen bg-[#E5E4E2]">
      <div className="hidden md:block fixed left-0 top-0 h-full z-50">
        <Sidebar />
      </div>
      <main 
        className="flex-1 p-0 min-h-screen relative z-0 transition-[margin] duration-75"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <PromotePageContent />
      </main>
    </div>
  );
}
