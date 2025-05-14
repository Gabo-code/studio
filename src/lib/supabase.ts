import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not defined in environment variables.');
  // Depending on your application's needs, you might want to throw an error or handle this differently
}

export const supabase = createClient(
  supabaseUrl as string, // Cast to string, assuming process.env will provide a string or undefined
  supabaseAnonKey as string
);