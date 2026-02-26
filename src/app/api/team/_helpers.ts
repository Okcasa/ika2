import { supabaseAdmin } from '@/lib/supabase-admin';

export const readBearer = (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
};

export const getAuthedUser = async (request: Request) => {
  const token = readBearer(request);
  if (!token) return { user: null as any, error: 'Unauthorized' };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { user: null as any, error: 'Unauthorized' };
  return { user: data.user, error: null };
};

export const getPrimaryTeamForUser = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('team_id, role, teams:team_id(id, owner_id, name, invite_code)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
};

export const isTeamManager = (role?: string | null) => {
  const r = String(role || '').toLowerCase();
  return r === 'owner' || r === 'admin';
};
