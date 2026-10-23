// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ mark: vi.fn(), remove: vi.fn() }));
vi.mock("@/app/admin/(protected)/messages/actions", () => ({
  setMessageRead: mock.mark,
  deleteMessage: mock.remove,
}));
import { MessageInbox } from "../../src/components/admin/message-inbox";
const message = {
  id: "527132ce-814c-4fe3-85f6-229e48d6df06",
  name: "Test Sender",
  email: "test@example.com",
  message: "A message with <script>alert(1)</script> rendered as plain text.",
  locale: "en" as const,
  read_at: null,
  created_at: "2026-10-24T00:00:00Z",
};
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe("private message inbox", () => {
  it("marks opened messages as read, supports unread, and deletes only after confirmation", async () => {
    mock.mark.mockResolvedValue({ ok: true, readAt: "2026-10-24T01:00:00Z" });
    render(createElement(MessageInbox, { initialMessages: [message] }));
    fireEvent.click(screen.getByRole("button", { name: /Test Sender/ }));
    await waitFor(() =>
      expect(mock.mark).toHaveBeenCalledWith({
        id: message.id,
        expectedReadAt: null,
        read: true,
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "تعليم كغير مقروءة" }),
      ).toBeTruthy(),
    );
    expect(document.querySelector(".inbox-message-text script")).toBeNull();
    mock.mark.mockResolvedValue({ ok: true, readAt: null });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "تعليم كغير مقروءة",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "تعليم كغير مقروءة" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "تعليم كمقروءة" }),
      ).toBeTruthy(),
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "حذف" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));
    expect(mock.remove).not.toHaveBeenCalled();
    mock.remove.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "حذف نهائي" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("تم حذف"),
    );
  });
});
