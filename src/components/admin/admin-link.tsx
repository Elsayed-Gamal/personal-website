"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

// Warm the complete dynamic page on intent, not just its loading boundary.
// Next owns expiry and invalidation; no custom cache of private page data.
export function AdminLink({
  children,
  onMouseEnter,
  onFocus,
  onTouchStart,
  prefetch,
  ...props
}: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={prefetch ?? intent}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (!event.defaultPrevented) setIntent(true);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented) setIntent(true);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        if (!event.defaultPrevented) setIntent(true);
      }}
    >
      {children}
    </Link>
  );
}
