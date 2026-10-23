import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";
import { isAdminUser } from "@/lib/auth/admin-access";

export async function adminProxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const client = createServerClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: init?.signal ?? AbortSignal.timeout(10000),
        }),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  const allowed = !error && isAdminUser(data.user);
  const login = request.nextUrl.pathname === "/admin/login";
  if ((!allowed && !login) || (allowed && login)) {
    const target = request.nextUrl.clone();
    target.pathname = allowed ? "/admin/dashboard" : "/admin/login";
    target.search = "";
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
