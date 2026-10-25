// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { article, project } from "../fixtures/admin-content";
const mock = vi.hoisted(() => ({
  upload: vi.fn(),
  save: vi.fn(),
  loadMedia: vi.fn(),
}));
vi.mock("@/app/admin/(protected)/media/actions", () => ({
  loadMedia: mock.loadMedia,
  deleteMedia: vi.fn(),
}));
vi.mock("@/lib/admin/upload-image", () => ({
  uploadContentImage: mock.upload,
}));
vi.mock("@/app/admin/(protected)/content/actions", () => ({
  saveContent: mock.save,
}));
import { ContentEditor } from "@/components/admin/content-editor";
const path = "articles/00000000-0000-4000-8000-000000000001.webp";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("blocks saving during upload, then saves the image and localized description", async () => {
  let finish!: (path: string) => void;
  mock.upload.mockReturnValue(
    new Promise<string>((resolve) => {
      finish = resolve;
    }),
  );
  mock.save.mockImplementation(async (entry) => ({ ok: true, entry }));
  render(
    createElement(ContentEditor, {
      entry: article,
      onSaved: vi.fn(),
      onClose: vi.fn(),
    }),
  );
  const file = new File(["image"], "cover.webp", { type: "image/webp" });
  fireEvent.change(screen.getByLabelText("اختيار صورة الغلاف"), {
    target: { files: [file] },
  });
  expect(
    (screen.getByRole("button", { name: "حفظ ونشر" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(mock.upload).toHaveBeenCalledWith(file, "article");
  finish(path);
  await screen.findByLabelText("وصف الصورة بالعربية");
  fireEvent.change(screen.getByLabelText("وصف الصورة بالعربية"), {
    target: { value: "وصف الغلاف" },
  });
  fireEvent.click(screen.getByRole("button", { name: "حفظ ونشر" }));
  await waitFor(() =>
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cover_image_path: path,
        cover_image_alt: { ar: "وصف الغلاف", en: "" },
      }),
    ),
  );
});

it("retains the existing cover on failed replacement and allows unlinking it", async () => {
  const entry = {
    ...project,
    cover_image_path: path.replace("articles/", "projects/"),
  };
  mock.upload.mockRejectedValue(new Error("تعذر رفع الصورة"));
  mock.save.mockImplementation(async (entry) => ({ ok: true, entry }));
  render(
    createElement(ContentEditor, { entry, onSaved: vi.fn(), onClose: vi.fn() }),
  );
  fireEvent.change(screen.getByLabelText("اختيار صورة الغلاف"), {
    target: { files: [new File(["x"], "x.png", { type: "image/png" })] },
  });
  await screen.findByRole("alert");
  expect(screen.getByRole("img").getAttribute("src")).toContain(
    entry.cover_image_path,
  );
  expect(mock.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "إزالة الصورة" }));
  expect(screen.queryByRole("img")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "حفظ المسودة" }));
  await waitFor(() =>
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({ cover_image_path: null }),
    ),
  );
});

it("applies an external URL and clears an existing library cover", async () => {
  mock.save.mockImplementation(async (entry) => ({ ok: true, entry }));
  render(
    createElement(ContentEditor, {
      entry: { ...article, cover_image_path: path },
      onSaved: vi.fn(),
      onClose: vi.fn(),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "رابط صورة" }));
  fireEvent.change(screen.getByLabelText("رابط الصورة"), {
    target: { value: "https://images.example.com/a.jpg" },
  });
  fireEvent.click(screen.getByRole("button", { name: "استخدام الرابط" }));
  expect(screen.getByRole("img").getAttribute("src")).toBe(
    "https://images.example.com/a.jpg",
  );
  fireEvent.click(screen.getByRole("button", { name: "حفظ ونشر" }));
  await waitFor(() =>
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cover_image_path: null,
        cover_image_url: "https://images.example.com/a.jpg",
      }),
    ),
  );
});

it("selects an existing image from another content folder without uploading", async () => {
  mock.loadMedia.mockResolvedValue({
    ok: true,
    page: {
      images: [
        {
          path,
          created_at: "2026-10-25T00:00:00Z",
          bytes: 1234,
          in_use: true,
          deleting: false,
        },
      ],
      hasMore: false,
    },
  });
  mock.save.mockImplementation(async (entry) => ({ ok: true, entry }));
  render(
    createElement(ContentEditor, {
      entry: project,
      onSaved: vi.fn(),
      onClose: vi.fn(),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "من المكتبة" }));
  fireEvent.click(await screen.findByRole("button", { name: "اختيار الصورة" }));
  fireEvent.click(screen.getByRole("button", { name: "حفظ المسودة" }));
  await waitFor(() =>
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cover_image_path: path,
        cover_image_url: null,
      }),
    ),
  );
  expect(mock.upload).not.toHaveBeenCalled();
});
