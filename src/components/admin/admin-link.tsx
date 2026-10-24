"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ComponentProps } from "react";

export function AdminLink({
  children,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentRoute = `${pathname}${search ? `?${search}` : ""}`;

  if (pendingFrom !== null && pendingFrom !== currentRoute) {
    setPendingFrom(null);
  }
  const navigating = pendingFrom === currentRoute;

  return (
    <Link
      {...props}
      prefetch={false}
      aria-busy={navigating || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.currentTarget.target ||
          event.currentTarget.hasAttribute("download")
        ) {
          return;
        }
        const destination = new URL(event.currentTarget.href);
        if (
          destination.origin === window.location.origin &&
          `${destination.pathname}${destination.search}` !== currentRoute
        ) {
          setPendingFrom(currentRoute);
        }
      }}
    >
      {children}
      {navigating && (
        <>
          <span className="admin-link-pending-spinner" aria-hidden="true" />
          <span className="content-sr-only" role="status">
            جارٍ الانتقال…
          </span>
        </>
      )}
    </Link>
  );
}
