import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from('marketplace_leads')
      .select('*', { count: 'exact', head: true })
      .is('assigned_to', null)
      .eq('status', 'available');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ available: count || 0 }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

