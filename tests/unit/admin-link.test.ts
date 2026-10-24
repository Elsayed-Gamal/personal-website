// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: {
    children: ReactNode;
    prefetch: boolean;
  }) =>
    createElement(
      "a",
      { ...props, "data-prefetch": String(prefetch) },
      children,
    ),
}));
import { AdminLink } from "../../src/components/admin/admin-link";
afterEach(cleanup);

it.each(["mouseEnter", "focus", "touchStart"] as const)(
  "enables full prefetch on %s without showing a link spinner",
  (event) => {
    render(createElement(AdminLink, { href: "/admin/messages" }, "الرسائل"));
    const link = screen.getByRole("link");
    expect(link.getAttribute("data-prefetch")).toBe("false");
    fireEvent[event](link);
    expect(link.getAttribute("data-prefetch")).toBe("true");
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.querySelector(".admin-loading")).toBeNull();
  },
);

it("preserves event handlers, prevented intent and explicit prefetch opt-out", () => {
  const onMouseEnter = vi.fn((event: React.MouseEvent) =>
    event.preventDefault(),
  );
  const { rerender } = render(
    createElement(
      AdminLink,
      { href: "/admin/content", onMouseEnter },
      "المحتوى",
    ),
  );
  fireEvent.mouseEnter(screen.getByRole("link"));
  expect(onMouseEnter).toHaveBeenCalledOnce();
  expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("false");
  rerender(
    createElement(
      AdminLink,
      { href: "/admin/content", prefetch: false },
      "المحتوى",
    ),
  );
  fireEvent.focus(screen.getByRole("link"));
  expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("false");
});
