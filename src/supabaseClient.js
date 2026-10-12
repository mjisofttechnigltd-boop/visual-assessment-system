import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and Anon public key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zfofchzitzfoypfhifuc.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KQ9QmqLuM79wdWSSqj3aMg_dt1Bi_6Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);