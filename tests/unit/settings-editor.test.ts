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
import type { SettingsRecord } from "../../src/lib/admin/settings";
const mock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/app/admin/(protected)/settings/actions", () => ({
  saveSettings: mock.save,
}));
import { SettingsEditor } from "../../src/components/admin/settings-editor";

const records = (["ui", "home"] as const).flatMap((key) =>
  (["ar", "en"] as const).map((locale) => ({
    key,
    locale,
    value: seed[key][locale],
    updated_at: "2026-10-23T00:00:00Z",
  })),
) as SettingsRecord[];
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mock.save.mockReset();
});
describe("settings editor", () => {
  it("shows both languages and homepage groups, retaining drafts after a failed save", async () => {
    render(createElement(SettingsEditor, { records }));
    expect(
      (screen.getByLabelText("الاسم المعروض") as HTMLInputElement).value,
    ).toBe(seed.ui.ar.brandName);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(
      (screen.getByLabelText("الاسم المعروض") as HTMLInputElement).value,
    ).toBe(seed.ui.en.brandName);
    fireEvent.click(screen.getByRole("button", { name: "محتوى الرئيسية" }));
    expect(screen.getByText("المقدمة الرئيسية")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("الجزء المميز من العنوان"), {
      target: { value: "Updated headline" },
    });
    mock.save.mockResolvedValue({ ok: false, message: "تعذر الحفظ" });
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("تعذر الحفظ"),
    );
    expect(
      (screen.getByLabelText("الجزء المميز من العنوان") as HTMLInputElement)
        .value,
    ).toBe("Updated headline");
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({ key: "home", locale: "en" }),
    );
  });
  it("confirms discarding unsaved changes and updates the saved version after success", async () => {
    render(createElement(SettingsEditor, { records }));
    fireEvent.change(screen.getByLabelText("الاسم المعروض"), {
      target: { value: "اسم جديد" },
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(
      (screen.getByLabelText("الاسم المعروض") as HTMLInputElement).value,
    ).toBe("اسم جديد");
    const value = { ...seed.ui.ar, brandName: "اسم جديد" };
    mock.save.mockResolvedValue({
      ok: true,
      record: {
        key: "ui",
        locale: "ar",
        value,
        updated_at: "2026-10-24T00:00:00Z",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("تم حفظ"),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "حفظ التغييرات",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("الاسم المعروض"), {
      target: { value: "تحديث آخر" },
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));
    await waitFor(() =>
      expect(mock.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ version: "2026-10-24T00:00:00Z" }),
      ),
    );
  });
});
