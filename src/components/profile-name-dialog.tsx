'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const MAX_EDITS = 2;
const COOLDOWN_HOURS = 48;

export function ProfileNameDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [oldestEditTime, setOldestEditTime] = useState<Date | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

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

      // Load name edit history
      const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
      const { data: edits } = await supabase
        .from('name_edits')
        .select('edited_at')
        .eq('user_id', session.user.id)
        .gte('edited_at', cutoff.toISOString())
        .order('edited_at', { ascending: true });

      if (edits && edits.length > 0) {
        setEditCount(edits.length);
        setOldestEditTime(new Date(edits[0].edited_at));

        if (edits.length >= MAX_EDITS) {
          const oldest = new Date(edits[0].edited_at);
          const cooldownEnd = new Date(oldest.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
          const remaining = cooldownEnd.getTime() - Date.now();
          if (remaining > 0) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            setCooldownRemaining(`${hours}h ${minutes}m`);
          }
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!userId || !fullName.trim()) return;

    if (editCount >= MAX_EDITS && cooldownRemaining) {
      toast({
        title: 'Name change limit reached',
        description: `You can change your name 2 times every ${COOLDOWN_HOURS} hours. Please wait ${cooldownRemaining} before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await supabase.from('user_profiles').upsert({ user_id: userId, full_name: fullName.trim() });

      // Record this edit
      await supabase.from('name_edits').insert({ user_id: userId });

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

  const isOnCooldown = editCount >= MAX_EDITS && !!cooldownRemaining;

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
              disabled={isOnCooldown}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You can change your name {MAX_EDITS} times every {COOLDOWN_HOURS} hours.
            {editCount > 0 && (
              <span className="block mt-1">
                Edits used: {editCount}/{MAX_EDITS}
                {cooldownRemaining && <span className="text-amber-500"> · Cooldown: {cooldownRemaining}</span>}
              </span>
            )}
          </p>
          <Button onClick={handleSave} disabled={loading || !fullName.trim() || isOnCooldown} className="w-full">
            {loading ? 'Saving...' : isOnCooldown ? `Wait ${cooldownRemaining}` : 'Save and continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
