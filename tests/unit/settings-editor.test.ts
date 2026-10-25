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
import { emptySeo } from "../../src/lib/seo";

const records = (["ui", "home", "about", "contact"] as const).flatMap((key) =>
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
  it("edits about icons and tools, and saves contact form text for the selected language", async () => {
    render(createElement(SettingsEditor, { records }));
    fireEvent.click(screen.getByRole("button", { name: "من أنا" }));
    expect(
      screen.getByRole("link", { name: "عرض الموقع" }).getAttribute("href"),
    ).toBe("/ar/about");
    expect(
      (screen.getAllByLabelText("الأيقونة")[0] as HTMLSelectElement).value,
    ).toBe("compass");
    fireEvent.change(screen.getAllByLabelText("الأيقونة")[0], {
      target: { value: "code" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إضافة أداة" }));
    fireEvent.change(screen.getByLabelText("الأداة 9"), {
      target: { value: "Docker" },
    });
    fireEvent.click(screen.getByRole("button", { name: "حذف الأداة 1" }));
    mock.save.mockImplementation(async (input) => ({
      ok: true,
      record: {
        key: input.key,
        locale: input.locale,
        value: input.value,
        updated_at: "2026-10-25T00:00:00Z",
      },
    }));
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "تواصل" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    expect(mock.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        key: "about",
        locale: "ar",
        value: expect.objectContaining({
          stack: [...seed.about.ar.stack.slice(1), "Docker"],
          values: expect.arrayContaining([
            expect.objectContaining({
              icon: "code",
              title: seed.about.ar.values[0].title,
            }),
          ]),
        }),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "تواصل" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(
      screen.getByRole("link", { name: "عرض الموقع" }).getAttribute("href"),
    ).toBe("/en/contact");
    fireEvent.change(screen.getByLabelText("رسالة نجاح الإرسال"), {
      target: { value: "Thank you for your message." },
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));
    await waitFor(() =>
      expect(mock.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          key: "contact",
          locale: "en",
          value: expect.objectContaining({
            form: expect.objectContaining({
              success: "Thank you for your message.",
            }),
          }),
        }),
      ),
    );
  });
  it("edits localized SEO together with site settings and preserves unrelated fields", async () => {
    const withSeo = records.map((row) =>
      row.key === "ui"
        ? { ...row, value: { ...row.value, seo: { ...emptySeo } } }
        : row,
    );
    render(createElement(SettingsEditor, { records: withSeo }));
    fireEvent.change(screen.getByLabelText("عنوان الموقع لمحركات البحث"), {
      target: { value: "عنوان نتائج البحث" },
    });
    fireEvent.change(screen.getByLabelText("رابط الموقع الأساسي"), {
      target: { value: "https://portfolio.example" },
    });
    mock.save.mockImplementation(async (input) => ({
      ok: true,
      record: {
        key: input.key,
        locale: input.locale,
        value: input.value,
        updated_at: "2026-10-24T00:00:00Z",
      },
    }));
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("تم حفظ"),
    );
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "ui",
        locale: "ar",
        value: expect.objectContaining({
          brandName: seed.ui.ar.brandName,
          seo: {
            ...emptySeo,
            title: "عنوان نتائج البحث",
            siteUrl: "https://portfolio.example",
          },
        }),
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "English" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(
      (screen.getByLabelText("عنوان الموقع لمحركات البحث") as HTMLInputElement)
        .value,
    ).toBe("");
  });
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
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "حفظ التغييرات",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true),
    );
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
