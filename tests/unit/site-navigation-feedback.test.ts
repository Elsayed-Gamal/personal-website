// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ locale: "ar", pending: false }));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement("a", props, children),
  useLinkStatus: () => ({ pending: state.pending }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: state.locale }),
}));

import { SiteLink } from "../../src/components/layout/site-link";
import { SiteLoading } from "../../src/components/layout/site-loading";

afterEach(() => {
  cleanup();
  state.locale = "ar";
  state.pending = false;
});

it("shows pending feedback inside a public link while preserving its styling", () => {
  const { rerender } = render(
    createElement(
      SiteLink,
      { href: "/ar/work", className: "primary-button" },
      "المشاريع",
    ),
  );
  const link = screen.getByRole("link");
  expect(link.className).toContain("site-link");
  expect(link.className).toContain("primary-button");
  expect(screen.queryByRole("status")).toBeNull();

  state.pending = true;
  rerender(
    createElement(
      SiteLink,
      { href: "/ar/work", className: "primary-button" },
      "المشاريع",
    ),
  );
  expect(link.querySelector(".site-link-pending-spinner")).not.toBeNull();
  expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
});

it("localizes the public route loading state", () => {
  const { rerender } = render(createElement(SiteLoading));
  expect(screen.getByRole("status").textContent).toContain(
    "جارٍ تحميل الصفحة…",
  );

  state.locale = "en";
  rerender(createElement(SiteLoading));
  expect(screen.getByRole("status").textContent).toContain("Loading page…");
});
