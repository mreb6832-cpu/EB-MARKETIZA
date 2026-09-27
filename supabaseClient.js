import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://wgzjqklwxsqqykysxwho.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "YOUR_PUBLISHABLE_KEY_HERE";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
