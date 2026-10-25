import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { article, project } from "../fixtures/admin-content";
import { saveContentSchema } from "@/lib/admin/content";
import {
  contentImageUrl,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from "@/lib/content-images";

const mock = vi.hoisted(() => ({
  upload: vi.fn(),
  from: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({
  createBrowserAuthClient: mock.client,
}));
import { uploadContentImage } from "@/lib/admin/upload-image";
const path = "articles/00000000-0000-4000-8000-000000000001.webp";
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.resetAllMocks();
  mock.from.mockReturnValue({ upload: mock.upload });
  mock.client.mockReturnValue({ storage: { from: mock.from } });
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 1600, height: 900, close: vi.fn() }),
  );
});

describe("content images", () => {
  it("accepts only supported non-empty files within the bucket limit", () => {
    expect(
      validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES }),
    ).toBeNull();
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }),
    ).toContain("5");
    expect(validateImageFile({ type: "image/svg+xml", size: 120 })).toContain(
      "JPG",
    );
    expect(validateImageFile({ type: "image/webp", size: 0 })).toContain(
      "فارغة",
    );
  });
  it("limits saved covers to their content folder and fixed project host", () => {
    expect(
      saveContentSchema.safeParse({ ...article, cover_image_path: path })
        .success,
    ).toBe(true);
    expect(
      saveContentSchema.safeParse({ ...project, cover_image_path: path })
        .success,
    ).toBe(false);
    expect(contentImageUrl(path)).toBe(
      "https://cdoaudugbjrkhyhivaaa.supabase.co/storage/v1/object/public/content-images/" +
        path,
    );
    for (const value of [
      "https://evil.test/image.png",
      "articles/../../secret",
      "articles/file.svg",
      "",
    ]) {
      expect(contentImageUrl(value)).toBeNull();
      expect(
        saveContentSchema.safeParse({ ...article, cover_image_path: value })
          .success,
      ).toBe(false);
    }
    expect(
      saveContentSchema.safeParse({
        ...article,
        cover_image_alt: { ar: "a".repeat(201), en: "" },
      }).success,
    ).toBe(false);
  });
  it("rejects invalid and corrupt images before contacting Storage", async () => {
    await expect(
      uploadContentImage(
        new File(["svg"], "x.svg", { type: "image/svg+xml" }),
        "article",
      ),
    ).rejects.toThrow("JPG");
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("invalid"));
    await expect(
      uploadContentImage(
        new File(["broken"], "x.png", { type: "image/png" }),
        "article",
      ),
    ).rejects.toThrow("سليمًا");
    expect(mock.client).not.toHaveBeenCalled();
  });
  it("uploads immutable random names with the authenticated browser client", async () => {
    mock.upload.mockResolvedValue({ error: null });
    const file = new File(["png"], "../../original-name.png", {
      type: "image/png",
    });
    const result = await uploadContentImage(file, "project");
    expect(result).toMatch(/^projects\/[0-9a-f-]{36}\.png$/);
    expect(mock.from).toHaveBeenCalledWith("content-images");
    expect(mock.upload).toHaveBeenCalledWith(result, file, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false,
    });
    mock.upload.mockResolvedValue({ error: { statusCode: "403" } });
    await expect(uploadContentImage(file, "article")).rejects.toThrow(
      "المسؤول",
    );
  });
});
