import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import { measureAdminOperation } from "@/lib/admin/performance";

export async function createAuthClient() {
  const store = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient(url, key, {
    global: {
      fetch: (input, init) => {
        const request = () =>
          fetch(input, {
            ...init,
            cache: "no-store",
            signal: init?.signal ?? AbortSignal.timeout(10000),
          });
        const address =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        return new URL(address).pathname.startsWith("/rest/v1/")
          ? measureAdminOperation("database.response-headers", request)
          : request();
      },
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server Components cannot write cookies; proxy handles refresh. */
        }
      },
    },
  });
}
