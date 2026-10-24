"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function AdminLinkStatus() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <>
      <span className="admin-link-pending-spinner" aria-hidden="true" />
      <span className="content-sr-only" role="status" aria-busy="true">
        جارٍ الانتقال…
      </span>
    </>
  );
}

export function AdminLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} prefetch={false}>
      {children}
      <AdminLinkStatus />
    </Link>
  );
}
