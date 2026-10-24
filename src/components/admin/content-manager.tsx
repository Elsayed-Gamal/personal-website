"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { deleteContent } from "@/app/admin/(protected)/content/actions";
import { loadContent } from "@/app/admin/(protected)/content/read-actions";
import {
  entryTitle,
  newContentEntry,
  contentSummarySchema,
  type ContentSummary,
  type ContentEntry,
  type ContentKind,
} from "@/lib/admin/content";
import { ContentEditor } from "./content-editor";

export function ContentManager({
  initialEntries,
}: {
  initialEntries: ContentSummary[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [kind, setKind] = useState<ContentKind>("article");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ContentEntry | null>(null);
  const [removing, setRemoving] = useState<ContentSummary | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [opening, startOpening] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (removing) dialog.current?.showModal();
    else dialog.current?.close();
  }, [removing]);
  const group = entries.filter((e) => e.kind === kind);
  const filtered = group
    .filter(
      (e) =>
        (status === "all" ||
          (status === "published" ? e.published : !e.published)) &&
        [e.id, ...e.translations.map((t) => t.title)].some((s) =>
          s.toLowerCase().includes(search.toLowerCase().trim()),
        ),
    )
    .sort((a, b) =>
      a.kind === "project" && b.kind === "project"
        ? a.sort_order - b.sort_order
        : a.kind === "article" && b.kind === "article"
          ? b.date.localeCompare(a.date)
          : 0,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * 10, current * 10);
  if (editing)
    return (
      <ContentEditor
        key={editing.kind + ":" + editing.id}
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          const summary = contentSummarySchema.parse(saved);
          setEntries((items) => {
            const exists = items.some(
              (e) => e.kind === saved.kind && e.id === saved.id,
            );
            return exists
              ? items.map((e) =>
                  e.kind === saved.kind && e.id === saved.id ? summary : e,
                )
              : [summary, ...items];
          });
          setEditing(saved);
        }}
      />
    );
  return (
    <div className="content-manager">
      <div className="settings-toolbar">
        <div
          role="group"
          aria-label="نوع المحتوى"
          className="settings-segments"
        >
          {(["article", "project"] as const).map((value) => (
            <button
              key={value}
              type="button"
              disabled={opening}
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setPage(1);
                setMessage(null);
              }}
            >
              {value === "article" ? "المقالات" : "المشاريع"}{" "}
              <span className="content-count">
                {entries.filter((e) => e.kind === value).length}
              </span>
            </button>
          ))}
        </div>
        <button
          className="admin-button content-add"
          disabled={opening}
          onClick={() => {
            setMessage(null);
            setEditing(newContentEntry(kind));
          }}
        >
          <Plus size={18} /> إضافة {kind === "article" ? "مقال" : "مشروع"}
        </button>
      </div>
      <div className="content-summary">
        <span>{group.filter((e) => e.published).length} منشور</span>
        <span>{group.filter((e) => !e.published).length} مسودة</span>
      </div>
      <div className="content-filters">
        <div className="content-search">
          <Search size={18} aria-hidden="true" />
          <label className="content-sr-only" htmlFor="content-search">
            البحث في المحتوى
          </label>
          <input
            id="content-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث بالعنوان أو الرابط…"
          />
        </div>
        <label className="content-filter-label">
          حالة النشر
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">الكل</option>
            <option value="published">المنشور</option>
            <option value="draft">المسودات</option>
          </select>
        </label>
      </div>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "settings-notice settings-success"
              : "settings-notice admin-error"
          }
        >
          {message.text}
        </p>
      )}
      {opening && (
        <p role="status" className="admin-muted">
          جارٍ تحميل بيانات المحتوى…
        </p>
      )}
      {visible.length ? (
        <div className="content-list">
          {visible.map((entry) => (
            <article key={entry.kind + entry.id} className="content-row">
              <span className="admin-icon">
                <FileText size={21} aria-hidden="true" />
              </span>
              <div className="content-row-info">
                <h2>{entryTitle(entry)}</h2>
                <div className="content-row-meta">
                  <span
                    className={
                      entry.published
                        ? "content-status published"
                        : "content-status"
                    }
                  >
                    {entry.published ? "منشور" : "مسودة"}
                  </span>
                  <span>
                    {entry.kind === "article" ? entry.date : entry.year}
                  </span>
                  <span>
                    {entry.translations
                      .map(
                        (t) =>
                          (t.locale === "ar" ? "العربية" : "English") +
                          (entry.kind === "article" &&
                          "published" in t &&
                          !t.published
                            ? " (مخفية)"
                            : ""),
                      )
                      .join(" · ")}
                  </span>
                </div>
              </div>
              <div className="content-row-actions">
                {entry.published &&
                  entry.translations
                    .filter(
                      (t) =>
                        entry.kind === "project" ||
                        ("published" in t && t.published),
                    )
                    .map((t) => (
                      <a
                        key={t.locale}
                        href={
                          "/" +
                          t.locale +
                          "/" +
                          (entry.kind === "article"
                            ? "blog/" +
                              encodeURIComponent(
                                "slug" in t && typeof t.slug === "string"
                                  ? t.slug
                                  : "",
                              )
                            : "work/" + encodeURIComponent(entry.id))
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label={"عرض " + entryTitle(entry) + " " + t.locale}
                      >
                        <ExternalLink size={16} />
                        {t.locale.toUpperCase()}
                      </a>
                    ))}
                <button
                  disabled={opening || pending}
                  onClick={() => {
                    setMessage(null);
                    startOpening(async () => {
                      try {
                        const result = await loadContent({
                          kind: entry.kind,
                          id: entry.id,
                        });
                        if (result.ok) setEditing(result.entry);
                        else setMessage({ ok: false, text: result.message });
                      } catch {
                        setMessage({
                          ok: false,
                          text: "تعذر تحميل المحتوى. حاول مرة أخرى.",
                        });
                      }
                    });
                  }}
                  aria-label={"تعديل " + entryTitle(entry)}
                >
                  <Pencil size={17} /> تعديل
                </button>
                <button
                  className="content-danger"
                  disabled={opening || pending}
                  onClick={() => {
                    setMessage(null);
                    setRemoving(entry);
                  }}
                  aria-label={"حذف " + entryTitle(entry)}
                >
                  <Trash2 size={17} /> حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-panel content-empty">
          <FileText size={36} />
          <h2>
            {group.length
              ? "لا توجد نتائج مطابقة"
              : "ابدأ بأول " + (kind === "article" ? "مقال" : "مشروع")}
          </h2>
          <p className="admin-muted">
            {group.length
              ? "جرّب كلمات بحث أو حالة نشر مختلفة."
              : "أضف المحتوى واحفظه كمسودة حتى يصبح جاهزًا للنشر."}
          </p>
        </div>
      )}
      <div className="content-pagination">
        <span>
          {filtered.length} نتيجة · صفحة {current} من {pages}
        </span>
        <div>
          <button disabled={current === 1} onClick={() => setPage(current - 1)}>
            السابق
          </button>
          <button
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            التالي
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="content-delete-dialog"
        onCancel={(e) => {
          if (pending) e.preventDefault();
          else setRemoving(null);
        }}
        aria-labelledby="delete-content-title"
      >
        <h2 id="delete-content-title">
          حذف {removing?.kind === "article" ? "المقال" : "المشروع"}؟
        </h2>
        <p>{removing && entryTitle(removing)}</p>
        <p className="admin-muted">
          سيُحذف المحتوى وجميع ترجماته نهائيًا من قاعدة البيانات والموقع. يمكنك
          إلغاء نشره من شاشة التعديل بدلًا من حذفه.
        </p>
        <div className="settings-save-actions">
          <button
            autoFocus
            disabled={pending}
            className="settings-reset"
            onClick={() => setRemoving(null)}
          >
            إلغاء
          </button>
          <button
            disabled={pending}
            className="content-delete-confirm"
            onClick={() => {
              if (!removing) return;
              startTransition(async () => {
                try {
                  const result = await deleteContent({
                    kind: removing.kind,
                    id: removing.id,
                    updated_at: removing.updated_at,
                  });
                  if (result.ok) {
                    setEntries((items) =>
                      items.filter(
                        (e) => e.kind !== removing.kind || e.id !== removing.id,
                      ),
                    );
                    setMessage({
                      ok: true,
                      text: "تم حذف المحتوى وترجماته نهائيًا.",
                    });
                  } else setMessage({ ok: false, text: result.message });
                } catch {
                  setMessage({ ok: false, text: "تعذر الحذف. حاول مرة أخرى." });
                }
                setRemoving(null);
              });
            }}
          >
            {pending ? "جارٍ الحذف…" : "حذف نهائي"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
