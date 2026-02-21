import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser, getPrimaryTeamForUser, isTeamManager } from '@/app/api/team/_helpers';

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const memberId = String(body?.memberId || '').trim();
    if (!memberId) return NextResponse.json({ error: 'Missing member id' }, { status: 400 });

    const primary = await getPrimaryTeamForUser(user.id);
    if (!primary || !isTeamManager(primary.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('team_members')
      .select('id, team_id, user_id, role')
      .eq('id', memberId)
      .maybeSingle();
    if (targetErr || !target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.team_id !== primary.team_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (String(target.role).toLowerCase() === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });
    }

    const { error: removeErr } = await supabaseAdmin.from('team_members').delete().eq('id', target.id);
    if (removeErr) return NextResponse.json({ error: removeErr.message }, { status: 500 });

    await supabaseAdmin.from('leads').update({ team_id: null }).eq('user_id', target.user_id).eq('team_id', target.team_id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
