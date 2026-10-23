// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import seed from "../../scripts/page-content-seed.json";
const mock = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("@/actions/contact", () => ({ submitContact: mock.submit }));
import { ContactForm } from "../../src/components/forms/contact-form";
afterEach(() => {
  cleanup();
  mock.submit.mockReset();
});
describe("contact form", () => {
  it("keeps typed input and retry identity on failure, then confirms delivery", async () => {
    render(
      createElement(ContactForm, {
        locale: "en",
        copy: seed.contact.en.form,
        requestId: "527132ce-814c-4fe3-85f6-229e48d6df06",
      }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test Visitor" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Your message"), {
      target: { value: "A complete message for testing." },
    });
    mock.submit.mockResolvedValue({ status: "error" });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    const first = mock.submit.mock.calls[0][0];
    expect(
      (screen.getByLabelText("Your message") as HTMLTextAreaElement).value,
    ).toBe(first.message);
    mock.submit.mockResolvedValue({ status: "sent" });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("received"),
    );
    expect(mock.submit.mock.calls[1][0].requestId).toBe(first.requestId);
    fireEvent.click(
      screen.getByRole("button", { name: "Send another message" }),
    );
    expect(
      (screen.getByLabelText("Your message") as HTMLTextAreaElement).value,
    ).toBe("");
  });
});
