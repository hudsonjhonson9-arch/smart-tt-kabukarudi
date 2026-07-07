import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function makeClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[SMART TT] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diset. ' +
      'Tambahkan ke file .env.local dan Vercel Environment Variables.'
    );
  }
  try {
    return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
  } catch {
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
}

export const supabase = makeClient();
