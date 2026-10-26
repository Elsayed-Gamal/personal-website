// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePagedData } from "../../src/components/admin/use-paged-data";
import type { PageResult } from "../../src/lib/admin/pagination";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("server-paged lists", () => {
  it("debounces search and ignores a stale response arriving after the latest results", async () => {
    vi.useFakeTimers();
    const pending: Array<(value: PageResult<string[]>) => void> = [];
    const load = vi.fn(
      () =>
        new Promise<PageResult<string[]>>((resolve) => pending.push(resolve)),
    );
    const { result, rerender } = renderHook(
      ({ search }) => usePagedData({ search }, ["initial"], load),
      { initialProps: { search: "" } },
    );
    expect(load).not.toHaveBeenCalled();
    rerender({ search: "o" });
    rerender({ search: "old" });
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenLastCalledWith({ search: "old" });
    rerender({ search: "new" });
    await act(() => vi.advanceTimersByTimeAsync(250));
    await act(async () => pending[1]({ ok: true, page: ["new result"] }));
    await act(async () => pending[0]({ ok: true, page: ["stale result"] }));
    expect(result.current.data).toEqual(["new result"]);
    expect(result.current.loading).toBe(false);
  });

  it("retains visible results on failure and allows an explicit retry", async () => {
    vi.useFakeTimers();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, page: ["refreshed"] });
    const { result } = renderHook(() =>
      usePagedData({ page: 1 }, ["initial"], load),
    );
    act(() => result.current.reload());
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(result.current.data).toEqual(["initial"]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
    act(() => result.current.reload());
    await act(() => vi.advanceTimersByTimeAsync(250));
    expect(result.current.data).toEqual(["refreshed"]);
    expect(result.current.error).toBe("");
  });
});
