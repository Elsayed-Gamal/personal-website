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
import type { InboxMessage } from "@/lib/contact";
export function MessageInbox({
  initialMessages,
}: {
  initialMessages: InboxMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
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
  const selected = messages.find((m) => m.id === selectedId);
  const unread = messages.filter((m) => !m.read_at).length;
  const filtered = messages.filter(
    (m) =>
      (filter === "all" || (filter === "unread" ? !m.read_at : !!m.read_at)) &&
      [m.name, m.email, m.message].some((v) =>
        v.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
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
      setMessages((items) =>
        items.map((m) =>
          m.id === message.id ? { ...m, read_at: result.readAt ?? null } : m,
        ),
      );
    } catch {
      setNotice({ ok: false, text: "تعذر تحديث الرسالة. حاول مجددًا." });
    }
  }
  function open(message: InboxMessage) {
    setSelectedId(message.id);
    setNotice(null);
    if (!message.read_at) startTransition(() => mark(message, true));
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
            ["all", "كل الرسائل", messages.length],
            ["unread", "غير مقروءة", unread],
            ["read", "مقروءة", messages.length - unread],
          ].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(String(key));
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
          onClick={() => window.location.reload()}
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
          {filtered.slice((current - 1) * 10, current * 10).map((message) => (
            <button
              disabled={pending}
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
              <span className="inbox-snippet">{message.message}</span>
              <time dateTime={message.created_at}>
                {date(message.created_at)}
              </time>
            </button>
          ))}
          {!filtered.length && (
            <div className="admin-panel content-empty">
              <Mail size={32} />
              <h2>
                {messages.length ? "لا توجد نتائج مطابقة" : "لا توجد رسائل بعد"}
              </h2>
              <p className="admin-muted">
                {messages.length
                  ? "جرّب تغيير البحث أو التصفية."
                  : "ستظهر رسائل نموذج التواصل هنا."}
              </p>
            </div>
          )}
          <div className="content-pagination">
            <span>
              {filtered.length} رسالة · {current} / {pages}
            </span>
            <div>
              <button
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
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
                onClick={() => setSelectedId(null)}
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
                    setMessages((items) =>
                      items.filter((m) => m.id !== deleting.id),
                    );
                    setSelectedId(null);
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
