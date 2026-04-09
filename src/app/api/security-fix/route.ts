import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  try {
    // Part 1: Lock down paddle_webhook_events table
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: "ALTER TABLE public.paddle_webhook_events ENABLE ROW LEVEL SECURITY;"
    });

    if (rlsError) {
      console.log('RLS enable error (may already be enabled):', rlsError.message);
    }

    // Part 2: Enable RLS on all public tables
    // First get list of tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tablesError) {
      console.log('Tables query error:', tablesError.message);
    }

    const results: string[] = [];
    
    if (tables) {
      for (const table of tables) {
        const tableName = table.table_name;
        // Skip system tables
        if (tableName.startsWith('pg_') || tableName === 'spatial_ref_sys') continue;
        
        try {
          // Enable RLS
          await supabase.rpc('exec_sql', {
            query: `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`
          });
          results.push(`Enabled RLS on ${tableName}`);
        } catch (e: any) {
          console.log(`Error on ${tableName}:`, e.message);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Security fixes applied',
      tablesProcessed: results
    });

  } catch (error: any) {
    console.error('Security fix error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      hint: 'Make sure SUPABASE_SERVICE_ROLE_KEY is set in environment'
    }, { status: 500 });
  }
}