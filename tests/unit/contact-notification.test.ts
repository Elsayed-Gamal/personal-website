import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  constructor: vi.fn(),
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mock.send };

    constructor(apiKey: string) {
      mock.constructor(apiKey);
    }
  },
}));

import { sendContactNotification } from "../../src/lib/email/contact-notification";

const originalEnv = { ...process.env };
const input = {
  requestId: "527132ce-814c-4fe3-85f6-229e48d6df06",
  name: "Test\nVisitor",
  email: "visitor@example.com",
  message: "A complete message for testing.",
  locale: "en" as const,
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...originalEnv };
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_NOTIFICATION_FROM;
  delete process.env.CONTACT_NOTIFICATION_TO;
  delete process.env.SUPABASE_ADMIN_EMAIL;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("contact email notifications", () => {
  it("stays disabled when server-only email settings are incomplete", async () => {
    expect(await sendContactNotification(input)).toBe("disabled");
    expect(mock.constructor).not.toHaveBeenCalled();
  });

  it("sends a replyable, idempotent notification to the owner", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_NOTIFICATION_FROM =
      "Personal Website <notifications@example.com>";
    process.env.SUPABASE_ADMIN_EMAIL = "owner@example.com";
    mock.send.mockResolvedValue({ data: { id: "email-id" }, error: null });

    expect(await sendContactNotification(input)).toBe("sent");
    expect(mock.constructor).toHaveBeenCalledWith("re_test");
    expect(mock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Personal Website <notifications@example.com>",
        to: ["owner@example.com"],
        replyTo: "visitor@example.com",
        subject: "New message from Test Visitor",
        text: expect.stringContaining(input.message),
      }),
      { idempotencyKey: `contact-message/${input.requestId}` },
    );
  });

  it("reports provider rejections without exposing their details", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_NOTIFICATION_FROM = "notifications@example.com";
    process.env.CONTACT_NOTIFICATION_TO = "alerts@example.com";
    mock.send.mockResolvedValue({ data: null, error: { message: "rejected" } });

    expect(await sendContactNotification(input)).toBe("failed");
  });
});
