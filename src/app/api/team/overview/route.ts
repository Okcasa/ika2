import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser, getPrimaryTeamForUser } from '@/app/api/team/_helpers';

export async function GET(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const primary = await getPrimaryTeamForUser(user.id);
    if (!primary) {
      return NextResponse.json({ team: null, role: null, members: [], invites: [], requests: [] }, { status: 200 });
    }

    const teamId = primary.team_id as string;
    const role = primary.role as string;
    const team = (primary as any).teams || null;

    const [{ data: members }, { data: invites }, { data: requests }] = await Promise.all([
      supabaseAdmin
        .from('team_members')
        .select('id, team_id, user_id, role, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('team_invites')
        .select('id, email, role, invite_code, status, token, created_at, expires_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('team_requests')
        .select('id, user_id, note, status, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const userIds = Array.from(
      new Set((members || []).map((m: any) => m.user_id).concat((requests || []).map((r: any) => r.user_id)))
    );
    const profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = p.full_name || '';
      });
    }

    return NextResponse.json(
      {
        team,
        role,
        members: (members || []).map((m: any) => ({
          ...m,
          full_name: profileMap[m.user_id] || null,
        })),
        invites: invites || [],
        requests: (requests || []).map((r: any) => ({
          ...r,
          full_name: profileMap[r.user_id] || null,
        })),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
