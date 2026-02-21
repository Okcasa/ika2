'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function ProfileNameDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;
      setUserId(session.user.id);

      const metaName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        (session.user.email ? session.user.email.split('@')[0] : '');
      if (metaName) setFullName(metaName);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile?.full_name) {
        setOpen(true);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!userId || !fullName.trim()) return;
    setLoading(true);
    try {
      await supabase.from('user_profiles').upsert({ user_id: userId, full_name: fullName.trim() });
      setOpen(false);
      toast({
        title: 'Profile saved',
        description: 'Your name has been updated.',
      });
    } catch (e: any) {
      toast({
        title: 'Could not save name',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Set your name</DialogTitle>
          <DialogDescription>
            This is how your teammates will see you in activity logs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <Button onClick={handleSave} disabled={loading || !fullName.trim()} className="w-full">
            {loading ? 'Saving...' : 'Save and continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
