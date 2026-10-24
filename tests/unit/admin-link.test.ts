// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const linkStatus = vi.hoisted(() => ({
  pending: false,
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    onClick,
    ...props
  }: {
    children: ReactNode;
    prefetch: boolean;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) =>
    createElement(
      "a",
      {
        ...props,
        "data-prefetch": String(prefetch),
        onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event);
          event.preventDefault();
        },
      },
      children,
    ),
  useLinkStatus: () => linkStatus,
}));
import { AdminLink } from "../../src/components/admin/admin-link";
afterEach(() => {
  cleanup();
  linkStatus.pending = false;
});

it("keeps prefetch disabled on hover, focus and touch", () => {
  const onMouseEnter = vi.fn();
  render(
    createElement(
      AdminLink,
      { href: "/admin/content", onMouseEnter },
      "المحتوى",
    ),
  );
  const link = screen.getByRole("link");
  fireEvent.mouseEnter(link);
  fireEvent.focus(link);
  fireEvent.touchStart(link);
  expect(onMouseEnter).toHaveBeenCalledOnce();
  expect(link.getAttribute("data-prefetch")).toBe("false");
  expect(screen.queryByRole("status")).toBeNull();
});

it("shows Next.js link pending feedback and clears it when navigation completes", () => {
  const { rerender } = render(
    createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"),
  );
  const link = screen.getByRole("link");

  expect(screen.queryByRole("status")).toBeNull();
  linkStatus.pending = true;
  rerender(createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"));
  expect(screen.getByRole("status").textContent).toBe("جارٍ الانتقال…");
  expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
  expect(link.querySelector(".admin-link-pending-spinner")).not.toBeNull();

  linkStatus.pending = false;
  rerender(createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"));

  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("link").querySelector(".admin-link-pending-spinner"))
    .toBeNull();
});

it("keeps the existing click handler and disables link prefetch", () => {
  const onClick = vi.fn();
  render(
    createElement(AdminLink, { href: "/admin/messages", onClick }, "الرسائل"),
  );
  const link = screen.getByRole("link");

  fireEvent.click(link);
  expect(onClick).toHaveBeenCalledOnce();
  expect(link.getAttribute("data-prefetch")).toBe("false");
  expect(screen.queryByRole("status")).toBeNull();
});
