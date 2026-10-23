// @vitest-environment jsdom
import { StrictMode, createElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ path: "/ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => mock.path }));
import { PageViewTracker } from "../../src/components/analytics/page-view-tracker";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mock.path = "/ar";
});
describe("privacy-conscious page view tracking", () => {
  it("sends once per visible navigation even in StrictMode", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue({});
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const { rerender } = render(
      createElement(
        StrictMode,
        null,
        createElement(PageViewTracker, { enabled: true }),
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(1001));
    expect(fetcher).toHaveBeenCalledTimes(1);
    mock.path = "/en/about";
    rerender(
      createElement(
        StrictMode,
        null,
        createElement(PageViewTracker, { enabled: true }),
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(1001));
    expect(fetcher).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(Object.keys(payload).sort()).toEqual(["eventId", "path"]);
  });
  it("does not send when disabled or the page is hidden", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const { rerender } = render(
      createElement(PageViewTracker, { enabled: true }),
    );
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(fetcher).not.toHaveBeenCalled();
    rerender(createElement(PageViewTracker, { enabled: false }));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(fetcher).not.toHaveBeenCalled();
  });
});
