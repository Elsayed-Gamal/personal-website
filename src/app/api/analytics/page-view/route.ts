import { NextRequest, NextResponse } from "next/server";
import {
  analyticsEnabled,
  countryFromHeaders,
  pageViewSchema,
  shouldIgnoreAnalytics,
} from "@/lib/analytics";
import { createContentClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const response = (status: number) =>
    new NextResponse(null, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (!analyticsEnabled() || shouldIgnoreAnalytics(request.headers))
    return response(204);
  // Next's standalone server can construct nextUrl with its internal hostname.
  // The browser's Host identifies the requested site, not that internal address.
  const origin = request.headers.get("origin");
  try {
    const url = new URL(origin ?? "");
    if (
      url.origin !== origin ||
      url.protocol !== request.nextUrl.protocol ||
      url.host !== (request.headers.get("host") ?? request.nextUrl.host)
    )
      return response(403);
  } catch {
    return response(403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response(415);
  if (!request.body) return response(400);
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) {
        await reader.cancel();
        return response(413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const parsed = pageViewSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    if (!parsed.success) return response(400);
    const { data, error } = await createContentClient().rpc(
      "record_page_view",
      {
        p_event_id: parsed.data.eventId,
        p_path: parsed.data.path,
        p_country: countryFromHeaders(request.headers),
      },
    );
    return response(error ? 503 : data ? 204 : 429);
  } catch {
    return response(400);
  }
}
