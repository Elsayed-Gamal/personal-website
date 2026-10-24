// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const navigationState = vi.hoisted(() => ({
  pathname: "/admin/dashboard",
  search: "",
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
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));
import { AdminLink } from "../../src/components/admin/admin-link";
afterEach(() => {
  cleanup();
  navigationState.pathname = "/admin/dashboard";
  navigationState.search = "";
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

it("shows immediate navigation feedback and clears it when the route changes", () => {
  const { rerender } = render(
    createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"),
  );
  const link = screen.getByRole("link");

  fireEvent.click(link);

  expect(link.getAttribute("aria-busy")).toBe("true");
  expect(screen.getByRole("status").textContent).toBe("جارٍ الانتقال…");
  expect(link.querySelector(".admin-link-pending-spinner")).not.toBeNull();

  navigationState.pathname = "/admin/messages";
  rerender(createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"));

  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("link").hasAttribute("aria-busy")).toBe(false);
});

it("does not show navigation feedback for prevented, modified, or external clicks", () => {
  const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
  const { rerender } = render(
    createElement(AdminLink, { href: "/admin/messages", onClick }, "الرسائل"),
  );
  const link = screen.getByRole("link");

  fireEvent.click(link);
  expect(onClick).toHaveBeenCalledOnce();
  expect(screen.queryByRole("status")).toBeNull();

  rerender(createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"));
  fireEvent.click(screen.getByRole("link"), { ctrlKey: true });
  expect(screen.queryByRole("status")).toBeNull();

  rerender(
    createElement(AdminLink, { href: "https://example.com/admin" }, "خارجي"),
  );
  fireEvent.click(screen.getByRole("link"));
  expect(screen.queryByRole("status")).toBeNull();
});
