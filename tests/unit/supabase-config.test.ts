import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSupabaseConfig,
  SUPABASE_PROJECT_URL,
} from "../../src/lib/supabase/config";

afterEach(() => vi.unstubAllEnvs());
describe("Supabase project boundary", () => {
  it("allows only the approved project and publishable keys", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_PROJECT_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getSupabaseConfig().url).toBe(SUPABASE_PROJECT_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://other-project.supabase.co");
    expect(getSupabaseConfig).toThrow("Personal website");
  });
  it("rejects missing configuration and privileged keys", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_PROJECT_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_test");
    expect(getSupabaseConfig).toThrow("PUBLISHABLE_KEY");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(getSupabaseConfig).toThrow("Personal website");
  });
});
