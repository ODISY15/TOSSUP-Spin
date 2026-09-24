import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_NEXT_PUBLIC_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key');
export default supabase;
