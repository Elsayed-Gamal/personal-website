// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
}));

import { AdminNav } from "@/components/admin/admin-nav";

afterEach(cleanup);

it("shows the unread count only while unread messages exist", () => {
  const { rerender } = render(
    createElement(AdminNav, { unreadMessageCount: 3 }),
  );
  expect(screen.getByRole("status").textContent).toBe("3");
  expect(screen.getByRole("link", { name: /الرسائل/ })).toBeTruthy();

  rerender(
    createElement(AdminNav, { key: "zero", unreadMessageCount: 0 }),
  );
  expect(screen.queryByRole("status")).toBeNull();
});

it("updates the badge when messages are read or become unread", () => {
  render(createElement(AdminNav, { unreadMessageCount: 1 }));
  act(() => {
    window.dispatchEvent(
      new CustomEvent("admin:unread-messages", { detail: -1 }),
    );
  });
  expect(screen.queryByRole("status")).toBeNull();

  act(() => {
    window.dispatchEvent(
      new CustomEvent("admin:unread-messages", { detail: 1 }),
    );
  });
  expect(screen.getByRole("status").textContent).toBe("1");
});
