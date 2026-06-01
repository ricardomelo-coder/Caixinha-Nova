import { createBrowserClient } from '@supabase/ssr';

const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const key = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;

export const supabase = createBrowserClient(
  url || 'https://placeholder-url.supabase.co',
  key || 'placeholder-key'
);

export function createClient() {
  return supabase;
}

