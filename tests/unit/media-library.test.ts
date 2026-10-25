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
const mock = vi.hoisted(() => ({ load: vi.fn(), remove: vi.fn() }));
vi.mock("@/app/admin/(protected)/media/actions", () => ({
  loadMedia: mock.load,
  deleteMedia: mock.remove,
}));
import { MediaLibrary } from "@/components/admin/media-library";
const image = {
  path: "articles/00000000-0000-4000-8000-000000000001.png",
  created_at: "2026-10-25T00:00:00Z",
  bytes: 1024,
  in_use: false,
  deleting: false,
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

it("protects used images and requires confirmation for permanent deletion", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const { rerender } = render(
    createElement(MediaLibrary, {
      initialPage: { images: [image], hasMore: false },
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: `حذف ${image.path}` }));
  expect(confirm).toHaveBeenCalled();
  expect(mock.remove).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  mock.remove.mockResolvedValue({ ok: true, message: "تم حذف الصورة" });
  mock.load.mockResolvedValue({
    ok: true,
    page: { images: [], hasMore: false },
  });
  fireEvent.click(screen.getByRole("button", { name: `حذف ${image.path}` }));
  await waitFor(() => expect(mock.remove).toHaveBeenCalledWith(image.path));
  await screen.findByText("لا توجد صور مرفوعة هنا بعد.");
  rerender(
    createElement(MediaLibrary, {
      key: "used",
      initialPage: { images: [{ ...image, in_use: true }], hasMore: false },
    }),
  );
  expect(
    (
      screen.getByRole("button", {
        name: `حذف ${image.path}`,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

it("keeps the object and explains a failed delete", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  mock.remove.mockResolvedValue({ ok: false, message: "الصورة مستخدمة" });
  mock.load.mockResolvedValue({
    ok: true,
    page: { images: [{ ...image, in_use: true }], hasMore: false },
  });
  render(
    createElement(MediaLibrary, {
      initialPage: { images: [image], hasMore: false },
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: `حذف ${image.path}` }));
  expect((await screen.findByRole("alert")).textContent).toContain("مستخدمة");
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: `حذف ${image.path}`,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  );
});

it("paginates and excludes pending deletions from selection", async () => {
  mock.load.mockResolvedValue({
    ok: true,
    page: { images: [{ ...image, deleting: true }], hasMore: false },
  });
  render(
    createElement(MediaLibrary, {
      initialPage: { images: [image], hasMore: true },
      onSelect: vi.fn(),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "التالي" }));
  await waitFor(() =>
    expect(mock.load).toHaveBeenCalledWith({ page: 1, folder: "all" }),
  );
  await screen.findByText("بانتظار إتمام الحذف");
  expect(
    (screen.getByRole("button", { name: "اختيار الصورة" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
