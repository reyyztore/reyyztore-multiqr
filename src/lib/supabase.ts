import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qlyprkuozmmrmyewndag.supabase.co';
const supabaseAnonKey = 'sb_publishable_OeF0rPKUS-nkso_leHb0yg_ODQF1vV1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
