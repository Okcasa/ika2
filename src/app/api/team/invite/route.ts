import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser, getPrimaryTeamForUser, isTeamManager } from '@/app/api/team/_helpers';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const code = String(url.searchParams.get('code') || '').trim();
    if (!token && !code) return NextResponse.json({ error: 'Missing token or code' }, { status: 400 });

    if (token) {
      const { data: invite, error } = await supabaseAdmin
        .from('team_invites')
        .select('id, team_id, email, role, status, created_at, expires_at, teams:team_id(id, name, invite_code)')
        .eq('token', token)
        .maybeSingle();
      if (error || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      const expired = !!invite.expires_at && Date.parse(invite.expires_at) < Date.now();
      return NextResponse.json({ invite: { ...invite, invite_code: (invite as any)?.teams?.invite_code || null, expired } }, { status: 200 });
    }

    if (!/^\d{5}$/.test(code)) {
      return NextResponse.json({ error: 'Invite code must be 5 digits' }, { status: 400 });
    }

    const { data: team, error: teamErr } = await supabaseAdmin
      .from('teams')
      .select('id, name, invite_code')
      .eq('invite_code', code)
      .maybeSingle();
    if (teamErr || !team) return NextResponse.json({ error: 'Invite code not found' }, { status: 404 });

    return NextResponse.json(
      {
        invite: {
          id: `code-${team.id}`,
          team_id: team.id,
          email: null,
          role: 'viewer',
          invite_code: team.invite_code,
          status: 'pending',
          created_at: null,
          expires_at: null,
          teams: { id: team.id, name: team.name, invite_code: team.invite_code },
          expired: false,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const requestedRole = String(body?.role || 'viewer').toLowerCase();
    const teamId = String(body?.teamId || '').trim();
    if (!teamId) return NextResponse.json({ error: 'Missing team id' }, { status: 400 });

    const role = ['admin', 'editor', 'viewer'].includes(requestedRole) ? requestedRole : 'viewer';

    const primary = await getPrimaryTeamForUser(user.id);
    if (!primary || primary.team_id !== teamId || !isTeamManager(primary.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id, invite_code')
      .eq('id', teamId)
      .maybeSingle();
    const teamCode = team?.invite_code || null;

    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('team_invites')
      .insert({
        team_id: teamId,
        email: null,
        role,
        token,
        status: 'pending',
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select('id, team_id, email, role, token, status, expires_at')
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: inviteErr?.message || 'Failed to create invite' }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    const inviteUrl = `${origin}/accept-invite?token=${token}`;
    return NextResponse.json({ invite, inviteCode: teamCode, inviteUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
