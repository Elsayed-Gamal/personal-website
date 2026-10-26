"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import {
  contentImageUrl,
  coverSourceFromUrl,
  IMAGE_TYPES,
} from "@/lib/content-images";
import dynamic from "next/dynamic";
const MediaLibrary = dynamic(() =>
  import("./media-library").then((m) => m.MediaLibrary),
);
import { uploadContentImage } from "@/lib/admin/upload-image";
import type { ContentEntry } from "@/lib/admin/content";

export function ContentImageField({
  entry,
  disabled,
  busy,
  onBusyChange,
  onChange,
}: {
  entry: ContentEntry;
  disabled: boolean;
  busy: boolean;
  onBusyChange: (value: boolean) => void;
  onChange: (
    value: Pick<
      ContentEntry,
      "cover_image_path" | "cover_image_url" | "cover_image_alt"
    >,
  ) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"upload" | "library" | "url">("upload");
  const [urlInput, setUrlInput] = useState(entry.cover_image_url ?? "");
  const url = contentImageUrl(entry.cover_image_path, entry.cover_image_url);

  function applyUrl() {
    if (disabled || busy) return;
    try {
      if (!urlInput.trim()) throw new Error();
      onChange({
        ...coverSourceFromUrl(urlInput),
        cover_image_alt: entry.cover_image_alt,
      });
      setError("");
      setNotice("تم اختيار الرابط. احفظ المحتوى لاعتماد الصورة.");
    } catch {
      setError("أدخل رابط صورة صالحًا يبدأ بـ https://.");
    }
  }

  async function upload(file: File) {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      const path = await uploadContentImage(file, entry.kind);
      onChange({
        cover_image_path: path,
        cover_image_url: null,
        cover_image_alt: entry.cover_image_alt,
      });
      setNotice("تم رفع الصورة. احفظ المحتوى لاعتماد التغيير.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر رفع الصورة. حاول مجددًا.",
      );
    } finally {
      inFlight.current = false;
      onBusyChange(false);
    }
  }

  return (
    <div className="settings-group content-image-field" aria-busy={busy}>
      <h3>صورة الغلاف</h3>
      <div className="content-image-layout">
        <div className="content-image-preview">
          {url ? (
            <Image
              key={url}
              src={url}
              alt={
                entry.cover_image_alt.ar ||
                entry.cover_image_alt.en ||
                "معاينة صورة الغلاف"
              }
              fill
              sizes="(max-width: 640px) 90vw, 320px"
              unoptimized={!entry.cover_image_path}
              onError={() =>
                setError("تعذر عرض الصورة. تأكد أن الرابط مباشر ومتاح للعامة.")
              }
            />
          ) : (
            <ImagePlus size={36} aria-hidden="true" />
          )}
        </div>
        <div className="content-image-controls">
          <p className="admin-muted">
            تظهر الصورة في بطاقة المحتوى وصفحة التفاصيل. يُفضّل استخدام صورة
            أفقية بنسبة 16:9.
          </p>
          <input
            ref={input}
            id="content-cover-upload"
            type="file"
            accept={Object.keys(IMAGE_TYPES).join(",")}
            aria-label="اختيار صورة الغلاف"
            hidden
            disabled={disabled || busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void upload(file);
            }}
          />
          <div className="content-image-actions">
            {(
              [
                ["upload", "رفع صورة"],
                ["library", "من المكتبة"],
                ["url", "رابط صورة"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="settings-reset"
                aria-pressed={mode === value}
                disabled={disabled || busy}
                onClick={() => {
                  setMode(value);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="content-image-actions">
            {mode === "upload" && (
              <button
                type="button"
                className="admin-button"
                disabled={disabled || busy}
                onClick={() => input.current?.click()}
              >
                {busy ? (
                  <LoaderCircle
                    size={17}
                    className="content-image-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <ImagePlus size={17} aria-hidden="true" />
                )}
                {busy
                  ? "جارٍ رفع الصورة…"
                  : url
                    ? "استبدال الصورة"
                    : "اختيار ملف ورفعه"}
              </button>
            )}
            {url && (
              <button
                type="button"
                className="settings-tool-delete"
                disabled={disabled || busy}
                onClick={() => {
                  onChange({
                    cover_image_path: null,
                    cover_image_url: null,
                    cover_image_alt: { ar: "", en: "" },
                  });
                  setNotice("احفظ المحتوى لإزالة الصورة منه.");
                  setError("");
                }}
              >
                <Trash2 size={16} aria-hidden="true" /> إزالة الصورة
              </button>
            )}
          </div>
          {mode === "url" && (
            <div className="settings-field">
              <label htmlFor="cover-image-url">رابط الصورة</label>
              <input
                id="cover-image-url"
                type="url"
                dir="ltr"
                placeholder="https://example.com/image.jpg"
                maxLength={2000}
                value={urlInput}
                disabled={disabled || busy}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                }}
              />
              <small className="admin-muted">
                استخدم رابطًا مباشرًا للصورة، ثم اضغط «استخدام الرابط» واحفظ
                المحتوى.
              </small>
              <button
                type="button"
                className="admin-button"
                disabled={disabled || busy || !urlInput.trim()}
                onClick={applyUrl}
              >
                استخدام الرابط
              </button>
            </div>
          )}
          <small className="admin-muted">
            JPG، PNG، WebP — حتى 5 ميجابايت. الصور متاحة لمن يمتلك رابطها بعد
            الرفع، حتى قبل نشر المحتوى.
          </small>
          {busy && <p role="status">جارٍ رفع الصورة، انتظر قبل حفظ المحتوى…</p>}
          {notice && (
            <p role="status" className="settings-success">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
        </div>
      </div>
      {mode === "library" && (
        <MediaLibrary
          disabled={disabled || busy}
          onSelect={(image) => {
            onChange({
              cover_image_path: image.path,
              cover_image_url: null,
              cover_image_alt: entry.cover_image_alt,
            });
            setMode("upload");
            setError("");
            setNotice("تم اختيار الصورة من المكتبة. احفظ المحتوى لاعتمادها.");
          }}
        />
      )}
      {url && (
        <div className="settings-fields">
          {(["ar", "en"] as const).map((locale) => (
            <div className="settings-field" key={locale}>
              <label htmlFor={`cover-alt-${locale}`}>
                وصف الصورة {locale === "ar" ? "بالعربية" : "بالإنجليزية"}
              </label>
              <input
                id={`cover-alt-${locale}`}
                value={entry.cover_image_alt[locale]}
                maxLength={200}
                dir={locale === "ar" ? "rtl" : "ltr"}
                disabled={disabled || busy}
                onChange={(e) =>
                  onChange({
                    cover_image_path: entry.cover_image_path,
                    cover_image_url: entry.cover_image_url,
                    cover_image_alt: {
                      ...entry.cover_image_alt,
                      [locale]: e.target.value,
                    },
                  })
                }
              />
              <small className="admin-muted">
                وصف مختصر لقارئات الشاشة؛ يُستخدم عنوان المحتوى إذا تركته
                فارغًا.
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
