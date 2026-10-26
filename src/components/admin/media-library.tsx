"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Trash2, Images } from "lucide-react";
import { deleteMedia, loadMedia } from "@/app/admin/(protected)/media/actions";
import { contentImageUrl } from "@/lib/content-images";
import type { MediaImage, MediaPage, MediaQuery } from "@/lib/admin/media";

export function MediaLibrary({
  initialPage,
  onSelect,
  disabled = false,
}: {
  initialPage?: MediaPage;
  onSelect?: (image: MediaImage) => void;
  disabled?: boolean;
}) {
  const [data, setData] = useState<MediaPage>(
    initialPage ?? { images: [], hasMore: false },
  );
  const [query, setQuery] = useState<MediaQuery>({ page: 0, folder: "all" });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(!initialPage);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const deletionLock = useRef(false);
  const busy = disabled || loading || !!removing;

  useEffect(() => {
    if (
      initialPage &&
      query.page === 0 &&
      query.folder === "all" &&
      revision === 0
    )
      return;
    let active = true;
    loadMedia(query)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setData(result.page);
        } else setError(result.message);
      })
      .catch(() => {
        if (active) setError("تعذر تحميل الصور. حاول مجددًا.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialPage, query, revision]);

  function reload(next = query) {
    setLoading(true);
    setError("");
    setQuery(next);
    setRevision((n) => n + 1);
  }
  async function remove(image: MediaImage) {
    if (
      busy ||
      deletionLock.current ||
      image.in_use ||
      !window.confirm(
        `حذف الصورة ${image.path.split("/").pop()} نهائيًا؟ لا يمكن التراجع عن الحذف.`,
      )
    )
      return;
    deletionLock.current = true;
    setRemoving(image.path);
    setNotice("");
    setError("");
    try {
      const result = await deleteMedia(image.path);
      if (result.ok) setNotice(result.message);
      else setError(result.message);
      // Let the effect perform exactly one refresh, including failed deletes.
      setLoading(true);
      setQuery({ ...query, page: 0 });
      setRevision((n) => n + 1);
    } catch {
      setError("تعذر تأكيد الحذف. حدّث المكتبة وأعد المحاولة.");
    } finally {
      setRemoving(null);
      deletionLock.current = false;
    }
  }

  return (
    <section
      className={`media-library ${onSelect ? "media-library-picker" : "admin-panel"}`}
      aria-label={onSelect ? "اختيار صورة من المكتبة" : "الصور المرفوعة"}
      aria-busy={loading}
    >
      <div className="media-toolbar">
        <label>
          عرض الصور
          <select
            aria-label="تصفية الصور"
            value={query.folder}
            disabled={busy}
            onChange={(e) =>
              reload({
                page: 0,
                folder: e.target.value as MediaQuery["folder"],
              })
            }
          >
            <option value="all">كل الصور</option>
            <option value="articles">مرفوعة للمقالات</option>
            <option value="projects">مرفوعة للمشاريع</option>
          </select>
        </label>
        <button
          type="button"
          className="settings-reset"
          disabled={busy}
          onClick={() => reload()}
        >
          <RefreshCw size={16} /> تحديث الصور
        </button>
      </div>
      {error && (
        <p role="alert" className="settings-notice admin-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="settings-notice settings-success">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="media-empty">
          جارٍ تحميل الصور…
        </p>
      ) : data.images.length ? (
        <div className="media-grid">
          {data.images.map((image) => (
            <article key={image.path} className="media-card">
              <div className="media-thumbnail">
                <Image
                  src={contentImageUrl(image.path)!}
                  alt={image.path.split("/").pop()!}
                  fill
                  sizes="(max-width: 640px) 80vw, 240px"
                />
              </div>
              <div className="media-card-details">
                <p className="media-filename" dir="ltr" title={image.path}>
                  {image.path.split("/").pop()}
                </p>
                <p className="admin-muted">
                  {image.bytes === null
                    ? "حجم غير معروف"
                    : `${(image.bytes / 1024).toFixed(0)} KB`}{" "}
                  ·{" "}
                  {new Intl.DateTimeFormat("ar-EG", {
                    dateStyle: "medium",
                    timeZone: "Africa/Cairo",
                  }).format(new Date(image.created_at))}
                </p>
                <span className="admin-badge">
                  {image.deleting
                    ? "بانتظار إتمام الحذف"
                    : image.in_use
                      ? "مستخدمة في الموقع"
                      : "غير مستخدمة"}
                </span>
                <div className="media-card-actions">
                  {onSelect ? (
                    <button
                      type="button"
                      className="admin-button"
                      disabled={busy || image.deleting}
                      onClick={() => onSelect(image)}
                    >
                      اختيار الصورة
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="settings-reset"
                        disabled={busy}
                        aria-label={`نسخ رابط ${image.path}`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              contentImageUrl(image.path)!,
                            );
                            setNotice("تم نسخ رابط الصورة.");
                          } catch {
                            setError("تعذر نسخ الرابط من المتصفح.");
                          }
                        }}
                      >
                        <Copy size={16} /> نسخ الرابط
                      </button>
                      <button
                        type="button"
                        className="settings-tool-delete"
                        disabled={busy || image.in_use}
                        title={
                          image.in_use
                            ? "أزل ارتباط الصورة بالمحتوى قبل حذفها"
                            : undefined
                        }
                        aria-label={`حذف ${image.path}`}
                        onClick={() => void remove(image)}
                      >
                        <Trash2 size={16} />{" "}
                        {removing === image.path ? "جارٍ الحذف…" : "حذف"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="media-empty">
          <Images size={32} />
          <p>لا توجد صور مرفوعة هنا بعد.</p>
          <p className="admin-muted">
            ارفع صورة من محرر المقال أو المشروع لتظهر في المكتبة.
          </p>
        </div>
      )}
      <div className="media-pagination">
        <button
          type="button"
          className="settings-reset"
          disabled={busy || query.page === 0}
          onClick={() => reload({ ...query, page: query.page - 1 })}
        >
          السابق
        </button>
        <span>صفحة {query.page + 1}</span>
        <button
          type="button"
          className="settings-reset"
          disabled={busy || !data.hasMore}
          onClick={() => reload({ ...query, page: query.page + 1 })}
        >
          التالي
        </button>
      </div>
    </section>
  );
}
