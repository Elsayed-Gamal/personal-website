"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Mail,
  MailOpen,
  Search,
  Trash2,
  Reply,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  deleteMessage,
  setMessageRead,
} from "@/app/admin/(protected)/messages/actions";
import { usePagedData } from "./use-paged-data";
import {
  loadMessagePage,
  loadMessage,
} from "@/app/admin/(protected)/messages/read-actions";
import {
  ADMIN_PAGE_SIZE,
  type MessageQuery,
  type MessagePage,
  type MessageSummary,
} from "@/lib/admin/pagination";
import type { InboxMessage } from "@/lib/contact";
export function MessageInbox({ initialPage }: { initialPage: MessagePage }) {
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MessageQuery["filter"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<InboxMessage | null>(null);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (deleting) dialog.current?.showModal();
    else dialog.current?.close();
  }, [deleting]);
  const { data, loading, error, reload } = usePagedData(
    { page, search, filter },
    initialPage,
    loadMessagePage,
  );
  const messages = data.items;
  const filtered = messages;
  const unread = data.counts.unread;
  const pages = Math.max(1, Math.ceil(data.total / ADMIN_PAGE_SIZE));
  const current = page;
  async function mark(message: InboxMessage, read: boolean) {
    try {
      const result = await setMessageRead({
        id: message.id,
        expectedReadAt: message.read_at,
        read,
      });
      if (!result.ok) {
        setNotice({ ok: false, text: result.message });
        return;
      }
      setSelected((old) =>
        old?.id === message.id
          ? { ...old, read_at: result.readAt ?? null }
          : old,
      );
      const unreadDelta = read
        ? message.read_at
          ? 0
          : -1
        : message.read_at
          ? 1
          : 0;
      if (unreadDelta)
        window.dispatchEvent(
          new CustomEvent("admin:unread-messages", {
            detail: unreadDelta,
          }),
        );
      if (filter !== "all" && messages.length === 1 && page > 1)
        setPage(page - 1);
      reload();
    } catch {
      setNotice({ ok: false, text: "تعذر تحديث الرسالة. حاول مجددًا." });
    }
  }
  function open(message: MessageSummary) {
    setSelectedId(message.id);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await loadMessage(message.id);
        if (!result.ok) {
          setNotice({ ok: false, text: result.error });
          return;
        }
        setSelected(result.message);
        if (!result.message.read_at) await mark(result.message, true);
      } catch {
        setNotice({ ok: false, text: "تعذر تحميل الرسالة." });
      }
    });
  }
  function date(value: string) {
    return new Date(value).toLocaleString("ar-EG", {
      timeZone: "Africa/Cairo",
    });
  }
  return (
    <div className="message-inbox">
      <div className="settings-toolbar">
        <div
          className="settings-segments"
          role="group"
          aria-label="تصفية الرسائل"
        >
          {[
            ["all", "كل الرسائل", data.counts.all],
            ["unread", "غير مقروءة", unread],
            ["read", "مقروءة", data.counts.read],
          ].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key as MessageQuery["filter"]);
                setPage(1);
              }}
            >
              {label} <span className="content-count">{count}</span>
            </button>
          ))}
        </div>
        <button
          className="settings-reset inbox-refresh"
          disabled={pending}
          onClick={reload}
        >
          <RefreshCw size={16} /> تحديث الوارد
        </button>
      </div>
      <div className="content-search">
        <Search size={18} aria-hidden="true" />
        <label className="content-sr-only" htmlFor="inbox-search">
          البحث في الرسائل
        </label>
        <input
          id="inbox-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث بالاسم أو البريد أو نص الرسالة…"
        />
      </div>
      {loading && <p role="status">جارٍ تحميل الرسائل…</p>}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={
            notice.ok
              ? "settings-notice settings-success"
              : "settings-notice admin-error"
          }
        >
          {notice.text}
        </p>
      )}
      <div className={"inbox-columns" + (selected ? " has-selection" : "")}>
        <section className="inbox-list" aria-label="الرسائل الواردة">
          {filtered.map((message) => (
            <button
              disabled={pending || loading}
              key={message.id}
              onClick={() => open(message)}
              className={
                "inbox-item" +
                (!message.read_at ? " unread" : "") +
                (message.id === selectedId ? " selected" : "")
              }
              aria-pressed={message.id === selectedId}
            >
              <span className="inbox-item-top">
                <strong>{message.name}</strong>
                {!message.read_at && (
                  <span className="inbox-dot" aria-label="غير مقروءة" />
                )}
              </span>
              <span className="inbox-email" dir="ltr">
                {message.email}
              </span>
              <span className="inbox-snippet">{message.snippet}</span>
              <time dateTime={message.created_at}>
                {date(message.created_at)}
              </time>
            </button>
          ))}
          {!filtered.length && (
            <div className="admin-panel content-empty">
              <Mail size={32} />
              <h2>
                {data.counts.all ? "لا توجد نتائج مطابقة" : "لا توجد رسائل بعد"}
              </h2>
              <p className="admin-muted">
                {data.counts.all
                  ? "جرّب تغيير البحث أو التصفية."
                  : "ستظهر رسائل نموذج التواصل هنا."}
              </p>
            </div>
          )}
          <div className="content-pagination">
            <span>
              {data.total} رسالة · {current} / {pages}
            </span>
            <div>
              <button
                disabled={loading || current === 1}
                onClick={() => setPage(current - 1)}
              >
                السابق
              </button>
              <button
                disabled={loading || current >= pages}
                onClick={() => setPage(current + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </section>
        <section
          className="inbox-detail admin-panel"
          aria-label="تفاصيل الرسالة"
        >
          {selected ? (
            <>
              <button
                type="button"
                className="settings-reset inbox-mobile-back"
                disabled={pending}
                onClick={() => {
                  setSelectedId(null);
                  setSelected(null);
                }}
              >
                <ArrowRight size={16} /> العودة للرسائل
              </button>
              <div className="inbox-detail-heading">
                <span className="admin-icon">
                  <MailOpen size={23} />
                </span>
                <div>
                  <h2>{selected.name}</h2>
                  <p dir="ltr" className="inbox-email">
                    {selected.email}
                  </p>
                </div>
              </div>
              <div className="inbox-detail-meta">
                <time dateTime={selected.created_at}>
                  {date(selected.created_at)} (القاهرة)
                </time>
                <span>{selected.locale === "ar" ? "العربية" : "English"}</span>
                <span className="content-status">
                  {selected.read_at ? "مقروءة" : "غير مقروءة"}
                </span>
              </div>
              <div className="inbox-message-text" dir="auto">
                {selected.message}
              </div>
              <div className="inbox-detail-actions">
                <a
                  className="admin-button"
                  href={
                    "mailto:" +
                    encodeURIComponent(selected.email) +
                    "?subject=" +
                    encodeURIComponent("بخصوص رسالتك عبر الموقع")
                  }
                >
                  <Reply size={17} /> الرد بالبريد
                </a>
                <button
                  className="settings-reset"
                  disabled={pending}
                  onClick={() => {
                    setNotice(null);
                    startTransition(() => mark(selected, !selected.read_at));
                  }}
                >
                  {selected.read_at ? "تعليم كغير مقروءة" : "تعليم كمقروءة"}
                </button>
                <button
                  className="content-danger"
                  disabled={pending}
                  onClick={() => setDeleting(selected)}
                >
                  <Trash2 size={16} /> حذف
                </button>
              </div>
              <p className="admin-muted inbox-reply-hint">
                زر الرد يفتح برنامج البريد لديك؛ لا يرسل ردًا تلقائيًا.
              </p>
            </>
          ) : (
            <div className="content-empty">
              <MailOpen size={36} />
              <h2>اختر رسالة لقراءتها</h2>
              <p className="admin-muted">عند فتح الرسالة تُعلّم كمقروءة.</p>
            </div>
          )}
        </section>
      </div>
      <dialog
        ref={dialog}
        className="content-delete-dialog"
        aria-labelledby="delete-message-title"
        onCancel={(e) => {
          if (pending) e.preventDefault();
          else setDeleting(null);
        }}
      >
        <h2 id="delete-message-title">حذف الرسالة نهائيًا؟</h2>
        <p>رسالة من {deleting?.name}</p>
        <p className="admin-muted">
          ستُحذف الرسالة من قاعدة البيانات ولا يمكن التراجع من لوحة الإدارة.
        </p>
        <div className="settings-save-actions">
          <button
            autoFocus
            disabled={pending}
            className="settings-reset"
            onClick={() => setDeleting(null)}
          >
            إلغاء
          </button>
          <button
            disabled={pending}
            className="content-delete-confirm"
            onClick={() => {
              if (!deleting) return;
              startTransition(async () => {
                try {
                  const result = await deleteMessage({
                    id: deleting.id,
                    expectedReadAt: deleting.read_at,
                  });
                  if (result.ok) {
                    if (!deleting.read_at)
                      window.dispatchEvent(
                        new CustomEvent("admin:unread-messages", {
                          detail: -1,
                        }),
                      );
                    if (messages.length === 1 && page > 1) setPage(page - 1);
                    reload();
                    setSelectedId(null);
                    setSelected(null);
                    setNotice({ ok: true, text: "تم حذف الرسالة نهائيًا." });
                  } else setNotice({ ok: false, text: result.message });
                } catch {
                  setNotice({ ok: false, text: "تعذر الحذف. حاول مجددًا." });
                }
                setDeleting(null);
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
