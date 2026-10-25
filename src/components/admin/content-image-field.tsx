"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { contentImageUrl, IMAGE_TYPES } from "@/lib/content-images";
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
    value: Pick<ContentEntry, "cover_image_path" | "cover_image_alt">,
  ) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const url = contentImageUrl(entry.cover_image_path);

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
              src={url}
              alt={
                entry.cover_image_alt.ar ||
                entry.cover_image_alt.en ||
                "معاينة صورة الغلاف"
              }
              fill
              sizes="(max-width: 640px) 90vw, 320px"
              unoptimized
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
              {busy ? "جارٍ رفع الصورة…" : url ? "استبدال الصورة" : "رفع صورة"}
            </button>
            {url && (
              <button
                type="button"
                className="settings-tool-delete"
                disabled={disabled || busy}
                onClick={() => {
                  onChange({
                    cover_image_path: null,
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
