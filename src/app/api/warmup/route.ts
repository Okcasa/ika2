import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!cronHeader && cronSecret && bearer !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const start = Date.now();

    // Warm DB connection and the table used by checkout UI.
    const { count, error } = await supabaseAdmin
      .from('marketplace_leads')
      .select('*', { count: 'exact', head: true })
      .is('assigned_to', null)
      .eq('status', 'available');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        available: count || 0,
        warmedAt: new Date().toISOString(),
        elapsedMs: Date.now() - start,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
