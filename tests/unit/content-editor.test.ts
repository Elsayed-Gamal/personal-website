// @vitest-environment jsdom
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { article, project } from "../fixtures/admin-content";
vi.mock("@/app/admin/(protected)/media/actions", () => ({
  loadMedia: vi.fn(),
  deleteMedia: vi.fn(),
}));
const mock = vi.hoisted(() => ({
  save: vi.fn(),
  remove: vi.fn(),
  load: vi.fn(),
  list: vi.fn(),
  mediaLoad: vi.fn(),
  uploadImage: vi.fn(),
}));
vi.mock("@/app/admin/(protected)/content/read-actions", () => ({
  loadContent: mock.load,
  loadContentPage: mock.list,
}));
vi.mock("@/app/admin/(protected)/media/actions", () => ({
  loadMedia: mock.mediaLoad,
  deleteMedia: vi.fn(),
}));
vi.mock("@/lib/admin/upload-image", () => ({
  uploadContentImage: mock.uploadImage,
}));
vi.mock("@/app/admin/(protected)/content/actions", () => ({
  saveContent: mock.save,
  deleteContent: mock.remove,
}));
import { ContentManager } from "../../src/components/admin/content-manager";
import { ContentEditor } from "../../src/components/admin/content-editor";
import { contentImageUrl } from "../../src/lib/content-images";
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
  mock.list.mockReset();
  mock.mediaLoad.mockReset();
  mock.uploadImage.mockReset();
});
describe("content manager", () => {
  it("replaces old rows and pagination with a spinner while switching content tabs", async () => {
    const counts = { article: 1, project: 1, published: 1, draft: 0 };
    let finish!: () => void;
    mock.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              ok: true,
              page: { items: [project], total: 1, counts },
            });
        }),
    );
    const { container } = render(
      createElement(ContentManager, {
        initialPage: { items: [article], total: 1, counts },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /المشاريع/ }));
    expect(screen.queryByText(article.translations[0].title)).toBeNull();
    expect(
      screen.getByRole("status").querySelector(".admin-loading-spinner"),
    ).toBeTruthy();
    expect(container.querySelector(".content-pagination")).toBeNull();
    expect(container.querySelector(".content-summary")).toBeNull();
    await waitFor(() => expect(mock.list).toHaveBeenCalledTimes(1));
    await act(async () => finish());
    expect(screen.getByText(project.translations[0].title)).toBeTruthy();
    expect(screen.queryByText("جارٍ تحميل القائمة…")).toBeNull();
    expect(container.querySelector(".content-pagination")).toBeTruthy();

    mock.list.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: /المقالات/ }));
    expect(screen.queryByText(project.translations[0].title)).toBeNull();
    expect(screen.getByText("جارٍ تحميل القائمة…")).toBeTruthy();
  });
  it("fetches complete content only when editing and keeps the list on failure", async () => {
    const { contentSummarySchema } =
      await import("../../src/lib/admin/content");
    const summary = contentSummarySchema.parse(article);
    render(
      createElement(ContentManager, {
        initialPage: {
          items: [summary],
          total: 1,
          counts: { article: 1, project: 0, published: 1, draft: 0 },
        },
      }),
    );
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
      createElement(ContentManager, {
        initialPage: {
          items: [article],
          total: 1,
          counts: { article: 1, project: 1, published: 1, draft: 0 },
        },
      }),
    );
    expect(screen.getByText(article.translations[0].title)).toBeTruthy();
    expect(screen.queryByText(project.translations[0].title)).toBeNull();
    mock.list.mockResolvedValueOnce({
      ok: true,
      page: {
        items: [],
        total: 0,
        counts: { article: 1, project: 1, published: 1, draft: 0 },
      },
    });
    fireEvent.change(screen.getByLabelText("البحث في المحتوى"), {
      target: { value: "not-found" },
    });
    expect(await screen.findByText("لا توجد نتائج مطابقة")).toBeTruthy();
    expect(mock.list).toHaveBeenCalledWith({
      kind: "article",
      page: 1,
      search: "not-found",
      status: "all",
    });
    mock.list.mockResolvedValue({
      ok: true,
      page: {
        items: [article],
        total: 1,
        counts: { article: 1, project: 1, published: 1, draft: 0 },
      },
    });
    fireEvent.change(screen.getByLabelText("البحث في المحتوى"), {
      target: { value: "" },
    });
    fireEvent.click(
      await screen.findByRole("button", {
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
      await screen.findByRole("heading", { name: "Preview heading" }),
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
  it("previews project details as sanitized Markdown", async () => {
    render(
      createElement(ContentEditor, {
        entry: project,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    fireEvent.change(screen.getByLabelText("تفاصيل المشروع (Markdown)"), {
      target: {
        value:
          "## النتيجة\n\n- أداء أفضل\n- تجربة أوضح\n\n<script>alert('unsafe')</script>",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "معاينة المحتوى" }));
    expect(
      await screen.findByRole("heading", { name: "النتيجة" }),
    ).toBeTruthy();
    expect(screen.getByText("أداء أفضل").closest("li")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });
  it("formats selected Markdown text and inserts templates at the cursor", () => {
    render(
      createElement(ContentEditor, {
        entry: article,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    const body = screen.getByLabelText(
      "نص المقال (Markdown)",
    ) as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "نص محدد" } });
    body.setSelectionRange(0, body.value.length);
    const bold = screen.getByRole("button", { name: "عريض" });
    fireEvent.mouseDown(bold);
    fireEvent.click(bold);
    expect(body.value).toBe("**نص محدد**");
    expect(body.selectionStart).toBe(2);
    expect(body.selectionEnd).toBe(2 + "نص محدد".length);

    body.setSelectionRange(body.value.length, body.value.length);
    const heading = screen.getByRole("button", { name: "عنوان فرعي" });
    fireEvent.mouseDown(heading);
    fireEvent.click(heading);
    expect(body.value).toBe("**نص محدد**## عنوان");
    expect(body.selectionStart).toBe(body.value.length - "عنوان".length);
    expect(body.selectionEnd).toBe(body.value.length);
  });
  it("inserts GFM task lists, inline code, images, footnotes, and horizontal rules", () => {
    render(
      createElement(ContentEditor, {
        entry: article,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    const body = screen.getByLabelText(
      "نص المقال (Markdown)",
    ) as HTMLTextAreaElement;

    for (const [label, expected] of [
      ["قائمة مهام", "- [ ] مهمة"],
      ["كود داخل السطر", "`كود`"],
      ["صورة", "![وصف الصورة](https://image-url)"],
      ["فاصل أفقي", "---"],
    ]) {
      fireEvent.change(body, { target: { value: "" } });
      const button = screen.getByRole("button", { name: label });
      fireEvent.mouseDown(button);
      fireEvent.click(button);
      expect(body.value).toBe(expected);
    }

    fireEvent.change(body, { target: { value: "" } });
    const footnote = screen.getByRole("button", { name: "حاشية سفلية" });
    fireEvent.mouseDown(footnote);
    fireEvent.click(footnote);
    expect(body.value).toBe("[^1]\n\n[^1]: نص الحاشية");
    expect(body.selectionStart).toBe(body.value.length - "نص الحاشية".length);

    body.setSelectionRange(body.value.length, body.value.length);
    fireEvent.mouseDown(footnote);
    fireEvent.click(footnote);
    expect(body.value).toContain("[^2]\n\n[^2]: نص الحاشية");

    fireEvent.change(body, { target: { value: "سطر أول\nسطر ثان" } });
    body.setSelectionRange(0, body.value.length);
    const strike = screen.getByRole("button", { name: "يتوسطه خط" });
    fireEvent.mouseDown(strike);
    fireEvent.click(strike);
    expect(body.value).toBe("~~سطر أول\nسطر ثان~~");

    fireEvent.change(body, { target: { value: "" } });
    const heading = screen.getByRole("button", { name: "عنوان مستوى 6" });
    fireEvent.mouseDown(heading);
    fireEvent.click(heading);
    expect(body.value).toBe("###### عنوان");
  });
  it("previews GFM footnotes", async () => {
    render(
      createElement(ContentEditor, {
        entry: article,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    fireEvent.change(screen.getByLabelText("نص المقال (Markdown)"), {
      target: { value: "نص المقال[^1]\n\n[^1]: نص الحاشية" },
    });
    fireEvent.click(screen.getByRole("button", { name: "معاينة المحتوى" }));
    expect(await screen.findByText("نص الحاشية")).toBeTruthy();
  });
  it("selects an existing library image and inserts its Markdown URL", async () => {
    const image = {
      path: "articles/00000000-0000-4000-8000-000000000001.png",
      created_at: "2026-10-25T00:00:00Z",
      bytes: 1024,
      in_use: false,
      deleting: false,
    };
    mock.mediaLoad.mockResolvedValue({
      ok: true,
      page: { images: [image], hasMore: false },
    });
    render(
      createElement(ContentEditor, {
        entry: article,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    const body = screen.getByLabelText(
      "نص المقال (Markdown)",
    ) as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "مقدمة" } });
    body.setSelectionRange(body.value.length, body.value.length);
    fireEvent.click(
      screen.getByRole("button", {
        name: "اختيار صورة من المكتبة أو رفع صورة",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "اختيار الصورة" }),
    );
    expect(body.value).toBe(
      `مقدمة![وصف الصورة](${contentImageUrl(image.path)})`,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(body.selectionStart).toBe("مقدمة![".length);
  });
  it("uploads a new image to the library and inserts its Markdown URL", async () => {
    const path = "articles/00000000-0000-4000-8000-000000000002.webp";
    mock.mediaLoad.mockResolvedValue({
      ok: true,
      page: { images: [], hasMore: false },
    });
    mock.uploadImage.mockResolvedValue(path);
    render(
      createElement(ContentEditor, {
        entry: article,
        onSaved: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    const body = screen.getByLabelText(
      "نص المقال (Markdown)",
    ) as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: "اختيار صورة من المكتبة أو رفع صورة",
      }),
    );
    fireEvent.change(screen.getByLabelText("رفع صورة للمكتبة"), {
      target: {
        files: [new File(["image"], "photo.webp", { type: "image/webp" })],
      },
    });
    await waitFor(() =>
      expect(body.value).toBe(`![وصف الصورة](${contentImageUrl(path)})`),
    );
    expect(mock.uploadImage).toHaveBeenCalledWith(expect.any(File), "article");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
