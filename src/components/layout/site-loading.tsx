"use client";

import { useParams } from "next/navigation";

export function SiteLoading() {
  const params = useParams<{ locale?: string }>();
  const arabic = params.locale === "ar";

  return (
    <div className="site-loading" role="status" aria-live="polite">
      <span className="site-loading-spinner" aria-hidden="true" />
      <p>{arabic ? "جارٍ تحميل الصفحة…" : "Loading page…"}</p>
    </div>
  );
}
