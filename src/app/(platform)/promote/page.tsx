'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Gift, Share2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/use-user-id';

export default function PromotePage() {
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
    <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promote & Earn</h1>
        <p className="text-muted-foreground">Share the platform and earn free leads for every referral.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <Gift className="h-5 w-5 text-primary" />
               Referral Program
            </CardTitle>
            <CardDescription>
               Get 50 free leads for every friend who purchases a Starter Pack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="bg-muted p-6 rounded-lg text-center">
                <div className="text-4xl font-bold text-primary mb-2">50</div>
                <div className="font-medium">Free Leads per Referral</div>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Your Referral Link</label>
                <div className="flex gap-2">
                   <Input value={referralLink} readOnly />
                   <Button size="icon" variant="outline" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                   </Button>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex gap-2">
             <Button className="flex-1" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" /> Share on Social
             </Button>
             <Button variant="outline" className="flex-1" onClick={handleEmail}>
                <Mail className="mr-2 h-4 w-4" /> Email Invite
             </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-none">
           <CardHeader>
              <CardTitle>Affiliate Partner</CardTitle>
              <CardDescription className="text-indigo-200">
                 Want to earn cash instead of leads? Join our affiliate partner program.
              </CardDescription>
           </CardHeader>
           <CardContent>
              <ul className="space-y-4">
                 <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">1</div>
                    <span>Earn 20% recurring commission</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">2</div>
                    <span>Monthly payouts via Stripe</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">3</div>
                    <span>Exclusive marketing assets</span>
                 </li>
              </ul>
           </CardContent>
           <CardFooter>
              <Button variant="secondary" className="w-full font-bold" onClick={handleApply}>Apply Now</Button>
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}
