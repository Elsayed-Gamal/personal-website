import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  guard: vi.fn(),
  client: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mock.guard }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createAuthClient: mock.client,
}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
import {
  deleteMessage,
  setMessageRead,
} from "../../src/app/admin/(protected)/messages/actions";
const payload = {
  id: "527132ce-814c-4fe3-85f6-229e48d6df06",
  expectedReadAt: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  mock.guard.mockResolvedValue({});
});
describe("inbox authorization and mutations", () => {
  it("authorizes before reading input or touching the database", async () => {
    mock.guard.mockRejectedValue(new Error("unauthorized"));
    await expect(deleteMessage(payload)).rejects.toThrow("unauthorized");
    await expect(setMessageRead({ ...payload, read: true })).rejects.toThrow(
      "unauthorized",
    );
    expect(mock.client).not.toHaveBeenCalled();
  });
  it("updates only read state and detects stale/missing messages", async () => {
    const q = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { read_at: "2026-10-24T00:00:00Z" },
        error: null,
      }),
    };
    mock.client.mockResolvedValue({ from: vi.fn().mockReturnValue(q) });
    expect(await setMessageRead({ ...payload, read: true })).toMatchObject({
      ok: true,
      readAt: "2026-10-24T00:00:00Z",
    });
    expect(q.is).toHaveBeenCalledWith("read_at", null);
    expect(q.eq).toHaveBeenCalledWith("id", payload.id);
    expect(q.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/messages");
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/dashboard");
    q.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await setMessageRead({ ...payload, read: false })).ok).toBe(false);
  });
  it("deletes exactly the selected message with its loaded state", async () => {
    const q = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: payload.id }, error: null }),
    };
    mock.client.mockResolvedValue({ from: vi.fn().mockReturnValue(q) });
    expect(await deleteMessage(payload)).toEqual({ ok: true });
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/messages");
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/dashboard");
    expect(q.eq).toHaveBeenCalledWith("id", payload.id);
    expect(q.is).toHaveBeenCalledWith("read_at", null);
    expect((await deleteMessage({ id: "invalid" })).ok).toBe(false);
  });
});
