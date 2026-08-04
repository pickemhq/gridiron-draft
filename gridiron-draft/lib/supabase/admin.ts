import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Bypasses RLS — never import this into client components. Only use inside
 * API routes / server actions / Edge Functions, and only where the calling
 * user's permission has already been checked in code (e.g. "is it actually
 * their turn to pick").
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
