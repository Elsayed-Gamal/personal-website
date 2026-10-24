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
import { article, project } from "../fixtures/admin-content";
const mock = vi.hoisted(() => ({
  save: vi.fn(),
  remove: vi.fn(),
  load: vi.fn(),
}));
vi.mock("@/app/admin/(protected)/content/read-actions", () => ({
  loadContent: mock.load,
}));
vi.mock("@/app/admin/(protected)/content/actions", () => ({
  saveContent: mock.save,
  deleteContent: mock.remove,
}));
import { ContentManager } from "../../src/components/admin/content-manager";
import { ContentEditor } from "../../src/components/admin/content-editor";
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
  vi.restoreAllMocks();
  mock.save.mockReset();
  mock.remove.mockReset();
  mock.load.mockReset();
});
describe("content manager", () => {
  it("fetches complete content only when editing and keeps the list on failure", async () => {
    const { contentSummarySchema } =
      await import("../../src/lib/admin/content");
    const summary = contentSummarySchema.parse(article);
    render(createElement(ContentManager, { initialEntries: [summary] }));
    expect(mock.load).not.toHaveBeenCalled();
    mock.load.mockResolvedValueOnce({ ok: false, message: "تعذر التحميل" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "تعديل " + article.translations[0].title,
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("تعذر"),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "تعديل " + article.translations[0].title,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    mock.load.mockResolvedValueOnce({ ok: true, entry: article });
    fireEvent.click(
      screen.getByRole("button", {
        name: "تعديل " + article.translations[0].title,
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("نص المقال (Markdown)")).toBeTruthy(),
    );
    expect(
      (screen.getByLabelText("نص المقال (Markdown)") as HTMLTextAreaElement)
        .value,
    ).toBe(article.translations[0].body);
    expect(mock.load).toHaveBeenCalledWith({
      kind: article.kind,
      id: article.id,
    });
  });
  it("filters by kind and search and requires confirmation before deleting", async () => {
    render(
      createElement(ContentManager, { initialEntries: [article, project] }),
    );
    expect(screen.getByText(article.translations[0].title)).toBeTruthy();
    expect(screen.queryByText(project.translations[0].title)).toBeNull();
    fireEvent.change(screen.getByLabelText("البحث في المحتوى"), {
      target: { value: "not-found" },
    });
    expect(screen.getByText("لا توجد نتائج مطابقة")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("البحث في المحتوى"), {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "حذف " + article.translations[0].title,
      }),
    );
    expect(mock.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
    mock.remove.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "حذف نهائي" }));
    await waitFor(() =>
      expect(mock.remove).toHaveBeenCalledWith({
        kind: article.kind,
        id: article.id,
        updated_at: article.updated_at,
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("تم حذف"),
    );
  });
  it("adds a second language, previews Markdown, and retains drafts on save failure", async () => {
    render(
      createElement(ContentEditor, {
        entry: article,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "+ إضافة الترجمة الثانية" }),
    );
    fireEvent.change(screen.getByLabelText("العنوان"), {
      target: { value: "English article" },
    });
    fireEvent.change(screen.getByLabelText("رابط المقال"), {
      target: { value: "english-article" },
    });
    fireEvent.change(screen.getByLabelText("نص المقال (Markdown)"), {
      target: { value: "# Preview heading" },
    });
    fireEvent.click(screen.getByRole("button", { name: "معاينة المحتوى" }));
    expect(
      screen.getByRole("heading", { name: "Preview heading" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "العودة للتحرير" }));
    mock.save.mockResolvedValue({
      ok: false,
      message: "تعارض في الحفظ",
      conflict: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ ونشر" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("تعارض"),
    );
    expect((screen.getByLabelText("العنوان") as HTMLInputElement).value).toBe(
      "English article",
    );
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.arrayContaining([
          expect.objectContaining({ locale: "en", slug: "english-article" }),
        ]),
      }),
    );
  });
  it("keeps project identity immutable and preserves separate language fields", () => {
    render(
      createElement(ContentEditor, {
        entry: project,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(
      (screen.getByLabelText("رابط المشروع") as HTMLInputElement).readOnly,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("العنوان"), {
      target: { value: "عنوان عربي جديد" },
    });
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect((screen.getByLabelText("العنوان") as HTMLInputElement).value).toBe(
      "Test project",
    );
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect((screen.getByLabelText("العنوان") as HTMLInputElement).value).toBe(
      "عنوان عربي جديد",
    );
  });
});
