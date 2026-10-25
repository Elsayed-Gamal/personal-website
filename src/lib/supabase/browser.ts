"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createBrowserAuthClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(60000),
        }),
    },
  });
}
