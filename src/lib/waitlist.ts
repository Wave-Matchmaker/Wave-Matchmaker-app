import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Waitlist persistence via Supabase (Postgres + RLS).
 *
 * The anon key is safe to ship to the browser because RLS only allows
 * inserts — see supabase/setup.sql. Without VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY the form falls back to a clear "not configured"
 * message instead of pretending to save.
 */

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey);
  return client;
}

/**
 * Simple email sanity check. Used to validate the form in JS so bad
 * addresses are rejected even when native browser validation is bypassed.
 */
export function emailIsValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export type JoinResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "duplicate" | "error"; message?: string };

export async function joinWaitlist(email: string): Promise<JoinResult> {
  const c = getClient();
  if (!c) return { ok: false, reason: "not-configured" };
  const { error } = await c.from("waitlist").insert({ email: email.trim().toLowerCase() });
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: false, reason: "duplicate" }; // unique email
  return { ok: false, reason: "error", message: error.message };
}
