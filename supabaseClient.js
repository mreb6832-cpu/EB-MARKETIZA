import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wgzjqklwxsqqykysxwho.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_sNeM4jQUsRfnr84Wz5SnyA_3_je4sa7";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
