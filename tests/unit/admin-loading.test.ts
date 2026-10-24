// @vitest-environment jsdom
import { createElement, Suspense } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AdminLoading from "../../src/app/admin/(protected)/loading";

afterEach(cleanup);

it("announces page loading and hides the decorative spinner from assistive technology", () => {
  render(createElement(AdminLoading));
  const status = screen.getByRole("status");
  expect(status.textContent).toBe("جارٍ تحميل الصفحة…");
  expect(status.getAttribute("aria-live")).toBe("polite");
  expect(
    status.querySelector(".admin-loading-spinner")?.getAttribute("aria-hidden"),
  ).toBe("true");
});

it("replaces the loading fallback when page content is ready", () => {
  const pending = new Promise<void>(() => {});
  function Page({ ready }: { ready: boolean }) {
    if (!ready) throw pending;
    return createElement("h1", null, "إدارة المحتوى");
  }
  const view = (ready: boolean) =>
    createElement(
      Suspense,
      { fallback: createElement(AdminLoading) },
      createElement(Page, { ready }),
    );
  const { rerender } = render(view(false));
  expect(screen.getByRole("status")).toBeTruthy();
  rerender(view(true));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("heading", { name: "إدارة المحتوى" })).toBeTruthy();
});
