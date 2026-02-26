'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getRoleCapabilities } from '@/lib/team-role';

type TeamOverview = {
  team: { id: string; owner_id: string; name: string; invite_code?: string | null } | null;
  role: string | null;
  members: Array<{ id: string; team_id: string; user_id: string; role: string; full_name?: string | null; created_at: string }>;
  invites: Array<{ id: string; email: string | null; role: string; status: string; token: string; invite_code?: string | null; created_at: string; expires_at?: string | null }>;
  requests: Array<{ id: string; user_id: string; note?: string | null; status: string; full_name?: string | null; created_at: string }>;
};

const EMPTY_OVERVIEW: TeamOverview = {
  team: null,
  role: null,
  members: [],
  invites: [],
  requests: [],
};

export function useTeamOverview() {
  const [overview, setOverview] = useState<TeamOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const initializedRef = useRef(false);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!initializedRef.current) {
      setLoading(true);
    } else if (!silent) {
      setRefreshing(true);
    }
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setOverview(EMPTY_OVERVIEW);
        initializedRef.current = true;
        setLoading(false);
        return;
      }

      const res = await fetch('/api/team/overview', {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load team');
        setOverview(EMPTY_OVERVIEW);
      } else {
        setOverview({
          team: json?.team || null,
          role: json?.role || null,
          members: Array.isArray(json?.members) ? json.members : [],
          invites: Array.isArray(json?.invites) ? json.invites : [],
          requests: Array.isArray(json?.requests) ? json.requests : [],
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load team');
      if (!initializedRef.current) {
        setOverview(EMPTY_OVERVIEW);
      }
    } finally {
      initializedRef.current = true;
      setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true });
      }
    };
    const onFocus = () => {
      refresh({ silent: true });
    };
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refresh({ silent: true });
    });

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const teamId = overview?.team?.id;
    if (!teamId) return;

    const channel = supabase
      .channel(`team-requests-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_requests',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          refresh({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [overview?.team?.id, refresh]);

  return {
    overview,
    loading,
    refreshing,
    error,
    refresh,
    capabilities: getRoleCapabilities(overview.role as any),
  };
}
