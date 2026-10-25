"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function SiteLinkStatus({ overlay = false }: { overlay?: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <>
      <span
        className={
          overlay
            ? "site-link-pending-spinner site-link-pending-overlay-spinner"
            : "site-link-pending-spinner"
        }
        aria-hidden="true"
      />
      <span
        className="site-sr-only"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        جارٍ الانتقال… Loading…
      </span>
    </>
  );
}

export function SiteLink({
  children,
  className,
  pendingIndicator = "inline",
  ...props
}: ComponentProps<typeof Link> & {
  pendingIndicator?: "inline" | "overlay";
}) {
  const overlay = pendingIndicator === "overlay";
  return (
    <Link
      {...props}
      className={[
        "site-link",
        overlay && "site-link-pending-overlay",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      <SiteLinkStatus overlay={overlay} />
    </Link>
  );
}
