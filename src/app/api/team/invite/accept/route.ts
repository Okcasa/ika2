import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser } from '@/app/api/team/_helpers';

const readInviteRole = (note?: string | null) => {
  const raw = String(note || '');
  const match = raw.match(/role:([a-z-]+)/i);
  const role = (match?.[1] || 'editor').toLowerCase();
  if (role === 'member') return 'editor';
  if (['owner', 'admin', 'editor', 'viewer'].includes(role)) return role;
  return 'editor';
};

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    const code = String(body?.code || '').trim();
    if (!token && !code) return NextResponse.json({ error: 'Missing token or code' }, { status: 400 });

    let teamId = '';
    let requestedRole = 'viewer';
    let inviteId = '';
    if (token) {
      const { data: invite, error: inviteErr } = await supabaseAdmin
        .from('team_invites')
        .select('id, team_id, role, status, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (inviteErr || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

      const expired = !!invite.expires_at && Date.parse(invite.expires_at) < Date.now();
      if (expired) return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
      if (invite.status !== 'pending') {
        return NextResponse.json({ error: `Invite is ${invite.status}` }, { status: 400 });
      }

      teamId = invite.team_id;
      requestedRole = String(invite.role || 'viewer').toLowerCase();
      inviteId = invite.id;
    } else {
      if (!/^\d{5}$/.test(code)) {
        return NextResponse.json({ error: 'Invite code must be 5 digits' }, { status: 400 });
      }
      const { data: team, error: teamErr } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('invite_code', code)
        .maybeSingle();
      if (teamErr || !team) return NextResponse.json({ error: 'Invite code not found' }, { status: 404 });
      teamId = team.id;
      requestedRole = 'viewer';
      inviteId = `code-${code}`;
    }

    if (requestedRole === 'member') requestedRole = 'editor';
    if (!['owner', 'admin', 'editor', 'viewer'].includes(requestedRole)) {
      requestedRole = 'viewer';
    }

    const { data: existingMembership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership?.id) {
      return NextResponse.json(
        {
          ok: true,
          teamId,
          requestedRole,
          requestStatus: 'member',
          message: 'You are already a member of this team.',
        },
        { status: 200 }
      );
    }

    const note = `invite:${inviteId}|role:${requestedRole}`;
    const { data: existingRequest } = await supabaseAdmin
      .from('team_requests')
      .select('id, status, note')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRequest?.id) {
      // Always re-open as pending when accepting an invite and user is not yet a member.
      const nextStatus = 'pending';
      await supabaseAdmin
        .from('team_requests')
        .update({ status: nextStatus, note })
        .eq('id', existingRequest.id);
    } else {
      await supabaseAdmin
        .from('team_requests')
        .insert({ team_id: teamId, user_id: user.id, status: 'pending', note });
    }
    if (token) {
      await supabaseAdmin.from('team_invites').update({ status: 'accepted' }).eq('token', token);
    }

    return NextResponse.json(
      {
        ok: true,
        teamId,
        requestedRole: readInviteRole(note),
        requestStatus: 'pending',
        message: 'Invite accepted and pending admin approval.',
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
