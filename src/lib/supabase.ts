import { createClient } from '@supabase/supabase-js';

// Fallback placeholders allow the build to succeed in CI environments
// where env vars are not set. Actual API calls will fail gracefully at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
