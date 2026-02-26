import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

const FREE_LEADS_COUNT = parseInt(process.env.FREE_SIGNUP_LEADS || '5', 10);
const IP_WINDOW_HOURS = parseInt(process.env.SIGNUP_IP_WINDOW_HOURS || '24', 10);

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') || '';
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userRes.user.id;
    const { count: existingLeadCount } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((existingLeadCount || 0) > 0) {
      return NextResponse.json({ granted: false, reason: 'already_has_leads' }, { status: 200 });
    }

    const { data: existingGrantByUser } = await supabaseAdmin
      .from('signup_grants')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (existingGrantByUser?.id) {
      return NextResponse.json({ granted: false, reason: 'already_granted' }, { status: 200 });
    }

    const ip = getClientIp(request);
    const salt = process.env.IP_HASH_SALT || 'ika_leads_salt';
    const ipHash = crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex');

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('starter_grant_claimed')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.starter_grant_claimed) {
      return NextResponse.json({ granted: false, reason: 'already_granted' }, { status: 200 });
    }

    const windowStart = new Date(Date.now() - IP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentIpGrant } = await supabaseAdmin
      .from('signup_grants')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentIpGrant) {
      return NextResponse.json({ granted: false, reason: 'ip_recent' }, { status: 200 });
    }

    const { data: availableLeads, error: availableErr } = await supabaseAdmin
      .from('marketplace_leads')
      .select('*')
      .eq('status', 'available')
      .limit(FREE_LEADS_COUNT);

    if (availableErr) {
      return NextResponse.json({ error: availableErr.message }, { status: 500 });
    }

    if (!availableLeads || availableLeads.length === 0) {
      return NextResponse.json({ granted: false, reason: 'no_inventory' }, { status: 200 });
    }

    const leadsToGrant = availableLeads.slice(0, FREE_LEADS_COUNT);
    const now = new Date().toISOString();

    const leadRows = leadsToGrant.map((lead) => ({
      user_id: userId,
      business_name: lead.business_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      website: lead.website,
      business_type: lead.business_type,
      lead_status: 'new',
      status: 'New',
      color: 'bg-stone-100 text-stone-600',
      last_contact: 'Never',
      scheduled_date: '-',
    }));

    const { data: insertedLeads, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert(leadRows)
      .select('id');

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const leadIds = (insertedLeads || []).map((l) => l.id);

    if (leadIds.length > 0) {
      await supabaseAdmin
        .from('dispensed_leads')
        .insert(leadIds.map((leadId) => ({ user_id: userId, lead_id: leadId })));
    }

    const marketplaceIds = leadsToGrant.map((l) => l.id);
    if (marketplaceIds.length > 0) {
      await supabaseAdmin
        .from('marketplace_leads')
        .update({ status: 'assigned', assigned_to: userId, assigned_at: now })
        .in('id', marketplaceIds);
    }

    await supabaseAdmin
      .from('signup_grants')
      .insert({ user_id: userId, ip_hash: ipHash, lead_count: leadIds.length });

    await supabaseAdmin
      .from('user_profiles')
      .upsert({ user_id: userId, starter_grant_claimed: true });

    return NextResponse.json({ granted: true, leadCount: leadIds.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
