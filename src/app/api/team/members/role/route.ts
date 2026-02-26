import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser, getPrimaryTeamForUser, isTeamManager } from '@/app/api/team/_helpers';

const normalizeRole = (input: string) => {
  const role = String(input || '').toLowerCase();
  if (role === 'member') return 'editor';
  if (['admin', 'editor', 'viewer'].includes(role)) return role;
  return null;
};

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const memberId = String(body?.memberId || '').trim();
    const nextRole = normalizeRole(String(body?.role || ''));
    if (!memberId || !nextRole) return NextResponse.json({ error: 'Missing member/role' }, { status: 400 });

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
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('team_members')
      .update({ role: nextRole })
      .eq('id', target.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
