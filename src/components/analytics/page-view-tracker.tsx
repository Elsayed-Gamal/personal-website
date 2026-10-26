"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { publicAnalyticsPath } from "@/lib/analytics-path";
export function PageViewTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    const path = publicAnalyticsPath(pathname);
    if (
      !enabled ||
      !path ||
      navigator.webdriver ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl ||
      lastSent.current === path
    )
      return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      if (document.visibilityState !== "visible" || lastSent.current === path)
        return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState !== "visible" || lastSent.current === path)
          return;
        lastSent.current = path;
        void fetch("/api/analytics/page-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: crypto.randomUUID(), path }),
          keepalive: true,
        }).catch(() => {});
      }, 1000);
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [pathname, enabled]);
  return null;
}
