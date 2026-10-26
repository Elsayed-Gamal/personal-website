import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { article, project } from "../fixtures/admin-content";
import { saveContentSchema } from "@/lib/admin/content";
import {
  contentImageUrl,
  coverSourceFromUrl,
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
  vi.stubGlobal("document", {
    createElement: () => ({ getContext: () => null }),
  });
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
  it("allows reusing library covers across content kinds and limits storage paths", () => {
    expect(
      saveContentSchema.safeParse({ ...article, cover_image_path: path })
        .success,
    ).toBe(true);
    expect(
      saveContentSchema.safeParse({ ...project, cover_image_path: path })
        .success,
    ).toBe(true);
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
  it("accepts HTTPS image links and normalizes our own bucket URLs", () => {
    expect(coverSourceFromUrl("https://images.example.com/cover.jpg")).toEqual({
      cover_image_path: null,
      cover_image_url: "https://images.example.com/cover.jpg",
    });
    expect(contentImageUrl(null, "https://images.example.com/cover.jpg")).toBe(
      "https://images.example.com/cover.jpg",
    );
    expect(coverSourceFromUrl(contentImageUrl(path)! + "?download=1")).toEqual({
      cover_image_path: path,
      cover_image_url: null,
    });
    for (const url of [
      "javascript:alert(1)",
      "data:image/png;base64,abc",
      "http://example.com/a.jpg",
      "https://user:password@example.com/a.jpg",
      "/image.png",
    ]) {
      expect(() => coverSourceFromUrl(url)).toThrow();
    }
    expect(
      saveContentSchema.safeParse({
        ...article,
        cover_image_path: path,
        cover_image_url: "https://example.com/a.jpg",
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
  it("resizes large uploads and uses WebP only when the encoded result is smaller", async () => {
    const draw = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: draw }),
      toBlob: (done: (blob: Blob) => void) =>
        done(new Blob(["small"], { type: "image/webp" })),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    vi.mocked(createImageBitmap).mockResolvedValueOnce({
      width: 3840,
      height: 2160,
      close: vi.fn(),
    } as unknown as ImageBitmap);
    mock.upload.mockResolvedValue({ error: null });
    const result = await uploadContentImage(
      new File(["x".repeat(100)], "large.png", { type: "image/png" }),
      "article",
    );
    expect([canvas.width, canvas.height]).toEqual([1920, 1080]);
    expect(result).toMatch(/\.webp$/);
    expect(mock.upload.mock.calls[0][1].size).toBe(5);
    expect(mock.upload.mock.calls[0][2].contentType).toBe("image/webp");
  });
});
