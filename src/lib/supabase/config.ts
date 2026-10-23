export const SUPABASE_PROJECT_ID = "cdoaudugbjrkhyhivaaa";
export const SUPABASE_PROJECT_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== SUPABASE_PROJECT_URL) {
    throw new Error("Supabase must point to the Personal website project.");
  }
  if (!key?.startsWith("sb_publishable_")) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }
  return { url, key };
}
