import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthedUser } from '@/app/api/team/_helpers';

const generateTeamCode = async () => {
  for (let i = 0; i < 30; i++) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const { data: existing } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('invite_code', code)
      .limit(1)
      .maybeSingle();
    if (!existing?.id) return code;
  }
  throw new Error('Unable to generate team invite code');
};

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim() || 'My Team';

    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existingMember?.team_id) {
      return NextResponse.json({ error: 'You are already in a team.' }, { status: 400 });
    }

    const inviteCode = await generateTeamCode();

    const { data: createdTeam, error: teamErr } = await supabaseAdmin
      .from('teams')
      .insert({ owner_id: user.id, name, invite_code: inviteCode })
      .select('id, owner_id, name, invite_code')
      .single();
    if (teamErr || !createdTeam) {
      return NextResponse.json({ error: teamErr?.message || 'Failed to create team' }, { status: 500 });
    }

    const { error: memberErr } = await supabaseAdmin.from('team_members').insert({
      team_id: createdTeam.id,
      user_id: user.id,
      role: 'owner',
    });
    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    // Share owner's existing leads with team.
    await supabaseAdmin
      .from('leads')
      .update({ team_id: createdTeam.id })
      .eq('user_id', user.id)
      .is('team_id', null);

    return NextResponse.json({ team: createdTeam }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
