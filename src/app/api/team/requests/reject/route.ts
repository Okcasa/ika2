import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser, getPrimaryTeamForUser, isTeamManager } from '@/app/api/team/_helpers';

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || '').trim();
    if (!requestId) return NextResponse.json({ error: 'Missing request id' }, { status: 400 });

    const primary = await getPrimaryTeamForUser(user.id);
    if (!primary || !isTeamManager(primary.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: joinRequest, error: reqErr } = await supabaseAdmin
      .from('team_requests')
      .select('id, team_id, status')
      .eq('id', requestId)
      .maybeSingle();
    if (reqErr || !joinRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (joinRequest.team_id !== primary.team_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (joinRequest.status !== 'pending') return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });

    const { error: updateErr } = await supabaseAdmin
      .from('team_requests')
      .update({ status: 'rejected' })
      .eq('id', joinRequest.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

