
import { createClient } from '@supabase/supabase-js';

// Fallback to provided credentials if env vars are missing (fixes CI build error)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ioficbeabgjuwtjfzndz.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GllteEt17tKZEhaGGJOATg_d1tXQhYG';

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
