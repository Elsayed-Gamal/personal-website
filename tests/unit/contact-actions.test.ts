import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  client: vi.fn(),
  rpc: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createContentClient: mock.client }));
vi.mock("@/lib/email/contact-notification", () => ({
  sendContactNotification: mock.notify,
}));
import { submitContact } from "../../src/actions/contact";
import { contactSubmissionSchema } from "../../src/lib/contact";
const payload = {
  requestId: "527132ce-814c-4fe3-85f6-229e48d6df06",
  name: "Test Visitor",
  email: "test@example.com",
  message: "A complete message for testing.",
  locale: "en",
  website: "",
};
beforeEach(() => {
  vi.resetAllMocks();
  mock.client.mockReturnValue({ rpc: mock.rpc });
  mock.notify.mockResolvedValue("sent");
});
describe("public contact submission", () => {
  it("validates inputs without querying and normalizes the email", async () => {
    expect((await submitContact({ ...payload, email: "invalid" })).status).toBe(
      "invalid",
    );
    expect(
      (await submitContact({ ...payload, message: "x".repeat(5001) })).status,
    ).toBe("invalid");
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(
      contactSubmissionSchema.parse({ ...payload, email: " Test@Example.com " })
        .email,
    ).toBe("test@example.com");
  });
  it("silently discards the honeypot without writing a message", async () => {
    expect(await submitContact({ ...payload, website: "spam" })).toEqual({
      status: "sent",
    });
    expect(mock.client).not.toHaveBeenCalled();
    expect(mock.notify).not.toHaveBeenCalled();
  });
  it("passes only allowed fields and a stable retry id to the bounded RPC", async () => {
    mock.rpc.mockResolvedValue({ data: "sent", error: null });
    expect(await submitContact(payload)).toEqual({ status: "sent" });
    expect(mock.rpc).toHaveBeenCalledWith("submit_contact", {
      p_request_id: payload.requestId,
      p_name: payload.name,
      p_email: payload.email,
      p_message: payload.message,
      p_locale: payload.locale,
    });
    expect(mock.notify).toHaveBeenCalledWith({
      requestId: payload.requestId,
      name: payload.name,
      email: payload.email,
      message: payload.message,
      locale: payload.locale,
    });
  });

  it("keeps a stored message successful when notification delivery fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mock.rpc.mockResolvedValue({ data: "sent", error: null });
    mock.notify.mockRejectedValue(new Error("provider unavailable"));

    expect(await submitContact(payload)).toEqual({ status: "sent" });
    expect(consoleError).toHaveBeenCalledWith(
      "Contact notification delivery failed.",
    );
    consoleError.mockRestore();
  });
  it("reports rate limits and failures without claiming delivery", async () => {
    mock.rpc.mockResolvedValue({ data: "rate_limited", error: null });
    expect(await submitContact(payload)).toEqual({ status: "rate_limited" });
    expect(mock.notify).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({
      data: null,
      error: { message: "secret database details" },
    });
    expect(await submitContact(payload)).toEqual({ status: "error" });
    mock.rpc.mockRejectedValue(new Error("offline"));
    expect(await submitContact(payload)).toEqual({ status: "error" });
  });
});
