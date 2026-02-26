import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

const FREE_LEADS_COUNT = parseInt(process.env.FREE_SIGNUP_LEADS || '5', 10);
const ADMIN_SECRET = process.env.ADMIN_BACKFILL_SECRET || '';

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-admin-secret') || '';
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let page = 1;
    const perPage = 1000;
    let processed = 0;
    let granted = 0;
    let skipped = 0;

    while (true) {
      const { data: usersRes, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (usersErr) {
        return NextResponse.json({ error: usersErr.message }, { status: 500 });
      }

      const users = usersRes?.users || [];
      if (users.length === 0) break;

      for (const user of users) {
        processed += 1;
        const userId = user.id;

        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('starter_grant_claimed')
          .eq('user_id', userId)
          .maybeSingle();

        const { data: existingGrant } = await supabaseAdmin
          .from('signup_grants')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.starter_grant_claimed || existingGrant) {
          skipped += 1;
          continue;
        }

        const { data: availableLeads, error: availableErr } = await supabaseAdmin
          .from('marketplace_leads')
          .select('*')
          .eq('status', 'available')
          .limit(FREE_LEADS_COUNT);

        if (availableErr) {
          return NextResponse.json({ error: availableErr.message }, { status: 500 });
        }

        if (!availableLeads || availableLeads.length < FREE_LEADS_COUNT) {
          return NextResponse.json({
            processed,
            granted,
            skipped,
            stoppedReason: 'insufficient_inventory',
          });
        }

        const now = new Date().toISOString();
        const leadRows = availableLeads.map((lead) => ({
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

        const marketplaceIds = availableLeads.map((l) => l.id);
        await supabaseAdmin
          .from('marketplace_leads')
          .update({ status: 'assigned', assigned_to: userId, assigned_at: now })
          .in('id', marketplaceIds);

        const ipHash = crypto.createHash('sha256').update(`backfill:${userId}`).digest('hex');
        await supabaseAdmin
          .from('signup_grants')
          .insert({ user_id: userId, ip_hash: ipHash, lead_count: leadIds.length });

        await supabaseAdmin
          .from('user_profiles')
          .upsert({ user_id: userId, starter_grant_claimed: true });

        granted += 1;
      }

      if (users.length < perPage) break;
      page += 1;
    }

    return NextResponse.json({ processed, granted, skipped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
