import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://spfilbdiuiykqnkcxqzu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZmlsYmRpdWl5a3Fua2N4cXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTQ1MDMsImV4cCI6MjA2NTI5MDUwM30.6N6rHt2XPdNZ2ceQrlXcJprg_DP-_f8_0w3dvUeVoZs";

export type AppRole = 'admin' | 'treasurer' | 'member';
export type MemberStatus = 'active' | 'suspended' | 'pending';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
