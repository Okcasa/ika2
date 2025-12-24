import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
        } else if (typeof window !== 'undefined' && localStorage.getItem('demo_mode')) {
          setUserId('demo-user');
        }
      } catch (e) {
        // Fallback for demo if auth fails completely
        if (typeof window !== 'undefined' && localStorage.getItem('demo_mode')) {
          setUserId('demo-user');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { userId, loading };
}
