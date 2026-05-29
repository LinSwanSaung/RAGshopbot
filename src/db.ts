// Supabase client. Uses the service_role key — bypasses RLS, server-side only.
// NEVER expose this to a browser or commit the key.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
