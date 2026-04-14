'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthDialog } from '@/components/auth-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const GATED_PATHS = new Set(['/shop', '/leads', '/customers', '/products', '/logs', '/promote', '/income']);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const starterCheckedRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const isGated = useMemo(() => GATED_PATHS.has(pathname), [pathname]);

  const ensureStarterGrant = async (session: { user: { id: string }; access_token: string } | null) => {
    if (!session) return;
    const userId = session.user.id;
    if (!userId || starterCheckedRef.current.has(userId)) return;

    // Guard immediately to avoid duplicate concurrent grant checks.
    starterCheckedRef.current.add(userId);
    try {
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) return;
      if ((count ?? 0) > 0) return;

      const res = await fetch('/api/signup-grant', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json().catch(() => ({} as { granted?: boolean; leadCount?: number }));
      if (res.ok && json?.granted) {
        const leadCount = Number(json?.leadCount || 0);
        toast({
          title: 'Starter leads unlocked',
          description: leadCount > 0 ? `${leadCount} new leads were added to your account.` : 'New leads were added to your account.',
        });
      } else if (res.ok && json && json.granted === false) {
        const reason = String(json.reason || 'unknown');
        toast({
          title: 'Starter leads not granted',
          description: `Reason: ${reason}`,
          variant: 'destructive',
        });
      }
    } catch {
      // Non-blocking best effort.
    }
  };

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      void ensureStarterGrant(session as { user: { id: string }; access_token: string } | null);

      if (!isGated) {
        setAuthOpen(false);
        setAuthChecked(true);
        return;
      }

      setIsAuthed(!!session);
      setAuthOpen(!session);
      setAuthChecked(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void ensureStarterGrant(session as { user: { id: string }; access_token: string } | null);
      if (!isGated) {
        setIsAuthed(!!session);
        setAuthChecked(true);
        return;
      }
      setIsAuthed(!!session);
      setAuthOpen(!session);
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isGated]);

  useEffect(() => {
    if (!isGated) return;
    if (searchParams?.get('auth') === 'true') {
      setAuthOpen(true);
    }
  }, [isGated, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const type = hashParams.get('type') || searchParams?.get('type') || '';
    const accessToken = hashParams.get('access_token') || searchParams?.get('access_token');

    if (type === 'signup' || type === 'recovery' || accessToken) {
      toast({
        title: 'Email confirmed',
        description: 'Your email is confirmed. Redirecting to your dashboard...',
      });
      const timer = setTimeout(() => {
        router.replace('/shop');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [router, searchParams, toast]);

  useEffect(() => {
    const handleOpen = () => {
      if (authChecked) setAuthOpen(true);
    };
    window.addEventListener('auth:open', handleOpen);
    return () => window.removeEventListener('auth:open', handleOpen);
  }, [authChecked]);

  return (
    <>
      <div className={cn('min-h-screen', authChecked && isGated && !isAuthed && 'blur-sm pointer-events-none select-none')}>
        {children}
      </div>
      <AuthDialog
        open={authChecked && isGated && !isAuthed}
        onOpenChange={(open) => {
          if (!isGated) {
            setAuthOpen(open);
            return;
          }
          if (isAuthed) setAuthOpen(open);
        }}
      />
    </>
  );
}
