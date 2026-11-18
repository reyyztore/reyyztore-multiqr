import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qlyprkuozmmrmyewndag.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_OeF0rPKUS-nkso_leHb0yg_ODQF1vV1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
