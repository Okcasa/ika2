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
        }
      } catch (e) {
        console.error("User ID hook failed", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { userId, loading };
}
