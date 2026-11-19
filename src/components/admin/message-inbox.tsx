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
  deleteAllSelectedMessages,
  deleteMessage,
  deleteMessages,
  selectAllMessages,
  setMessageRead,
  type AllMessagesSelection,
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
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [allSelection, setAllSelection] = useState<AllMessagesSelection | null>(
    null,
  );
  const [deleting, setDeleting] = useState<
    | { message: InboxMessage }
    | { ids: string[] }
    | { all: AllMessagesSelection }
    | null
  >(null);
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
  function isChecked(message: MessageSummary) {
    return allSelection
      ? Date.parse(message.created_at) <= Date.parse(allSelection.through)
      : checkedIds.includes(message.id);
  }
  const checked = messages.filter(isChecked);
  const selectedCount = allSelection?.count ?? checked.length;
  const canSelectAll = filter === "all" && !search.trim();
  const allChecked = checked.length > 0 && checked.length === messages.length;
  const someChecked = checked.length > 0 && !allChecked;
  const canSelect = !pending && !loading && !error;
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
  function toggleAllMessages() {
    if (allSelection) {
      setAllSelection(null);
      return;
    }
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await selectAllMessages();
        if (!result.ok) {
          setNotice({ ok: false, text: result.message });
        } else if (result.selection.count === 0) {
          setNotice({ ok: true, text: "لا توجد رسائل لتحديدها." });
          reload();
        } else {
          setCheckedIds([]);
          setAllSelection(result.selection);
        }
      } catch {
        setNotice({ ok: false, text: "تعذر تحديد كل الرسائل. حاول مجددًا." });
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    setNotice(null);
    startTransition(async () => {
      try {
        if ("all" in deleting) {
          const result = await deleteAllSelectedMessages(deleting.all.through);
          if (!result.ok) {
            setNotice({ ok: false, text: result.message });
            return;
          }
          setAllSelection(null);
          setCheckedIds([]);
          setSelectedId(null);
          setSelected(null);
          setPage(1);
          reload();
          setNotice({
            ok: true,
            text: result.count
              ? `تم حذف الرسائل المحددة (${result.count}).`
              : "الرسائل المحددة لم تعد موجودة.",
          });
          return;
        }
        const single = "message" in deleting ? deleting.message : null;
        const result =
          "ids" in deleting
            ? await deleteMessages(deleting.ids)
            : await deleteMessage({
                id: deleting.message.id,
                expectedReadAt: deleting.message.read_at,
              });
        if (!result.ok) {
          setNotice({ ok: false, text: result.message });
          return;
        }
        const removed =
          "deleted" in result ? result.deleted : single ? [single] : [];
        const requestedIds =
          "ids" in deleting ? deleting.ids : [deleting.message.id];
        const removedIds = new Set(removed.map((message) => message.id));
        const unreadRemoved = removed.filter(
          (message) => !message.read_at,
        ).length;
        if (unreadRemoved)
          window.dispatchEvent(
            new CustomEvent("admin:unread-messages", {
              detail: -unreadRemoved,
            }),
          );
        if (selectedId && removedIds.has(selectedId)) {
          setSelectedId(null);
          setSelected(null);
        }
        setCheckedIds((ids) => ids.filter((id) => !requestedIds.includes(id)));
        if (page > 1 && messages.every((message) => removedIds.has(message.id)))
          setPage(page - 1);
        reload();
        const missing = requestedIds.length - removed.length;
        setNotice({
          ok: missing === 0,
          text: single
            ? "تم حذف الرسالة نهائيًا."
            : missing === 0
              ? `تم حذف الرسائل المحددة (${removed.length}).`
              : `تم حذف ${removed.length} من ${requestedIds.length} رسائل. بعض الرسائل لم تعد متاحة.`,
        });
      } catch {
        setNotice({ ok: false, text: "تعذر الحذف. حاول مجددًا." });
      } finally {
        setDeleting(null);
      }
    });
  }

  function goToPage(next: number) {
    setCheckedIds([]);
    setPage(next);
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
              disabled={pending}
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key as MessageQuery["filter"]);
                setAllSelection(null);
                goToPage(1);
              }}
            >
              {label} <span className="content-count">{count}</span>
            </button>
          ))}
        </div>
        <button
          className="settings-reset inbox-refresh"
          disabled={pending}
          onClick={() => {
            setCheckedIds([]);
            setAllSelection(null);
            reload();
          }}
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
          disabled={pending}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setAllSelection(null);
            goToPage(1);
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
          {messages.length > 0 && (
            <div className="inbox-selection-bar">
              <label>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(input) => {
                    if (input) input.indeterminate = someChecked;
                  }}
                  disabled={!canSelect || !!allSelection}
                  onChange={(event) =>
                    setCheckedIds(
                      event.target.checked
                        ? messages.map((message) => message.id)
                        : [],
                    )
                  }
                />
                تحديد الصفحة
              </label>
              {canSelectAll && (
                <button
                  type="button"
                  className="settings-reset"
                  aria-pressed={!!allSelection}
                  disabled={!canSelect}
                  onClick={toggleAllMessages}
                >
                  تحديد كل الرسائل
                </button>
              )}
              <span aria-live="polite" className="inbox-selection-count">
                {selectedCount > 0 ? `${selectedCount} محددة` : ""}
              </span>
              <button
                type="button"
                className="content-danger"
                disabled={!canSelect || !selectedCount}
                onClick={() =>
                  setDeleting(
                    allSelection
                      ? { all: allSelection }
                      : { ids: checked.map((message) => message.id) },
                  )
                }
              >
                <Trash2 size={16} aria-hidden="true" /> حذف المحدد
              </button>
            </div>
          )}
          {messages.map((message) => (
            <div
              className={
                "inbox-row" + (isChecked(message) ? " inbox-row-checked" : "")
              }
              key={message.id}
            >
              <label className="inbox-row-check">
                <input
                  type="checkbox"
                  aria-label={`تحديد رسالة من ${message.name}`}
                  checked={isChecked(message)}
                  disabled={!canSelect || !!allSelection}
                  onChange={(event) => {
                    const isChecked = event.target.checked;
                    setCheckedIds((ids) =>
                      isChecked
                        ? [...ids, message.id]
                        : ids.filter((id) => id !== message.id),
                    );
                  }}
                />
              </label>
              <button
                disabled={pending || loading}
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
            </div>
          ))}
          {!messages.length && (
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
                disabled={pending || loading || current === 1}
                onClick={() => goToPage(current - 1)}
              >
                السابق
              </button>
              <button
                disabled={pending || loading || current >= pages}
                onClick={() => goToPage(current + 1)}
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
                  onClick={() => setDeleting({ message: selected })}
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
        <h2 id="delete-message-title">
          {deleting && "all" in deleting
            ? "حذف كل الرسائل المحددة؟"
            : deleting && "ids" in deleting
              ? "حذف الرسائل المحددة نهائيًا؟"
              : "حذف الرسالة نهائيًا؟"}
        </h2>
        <p>
          {deleting &&
            ("all" in deleting
              ? `سيشمل الحذف ${deleting.all.count} رسالة عبر كل الصفحات. الرسائل الواردة بعد التحديد ستبقى.`
              : "ids" in deleting
                ? `عدد الرسائل المحددة: ${deleting.ids.length}`
                : `رسالة من ${deleting.message.name}`)}
        </p>
        <p className="admin-muted">
          الحذف نهائي ولا يمكن التراجع عنه من لوحة الإدارة.
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
            onClick={confirmDelete}
          >
            {pending ? "جارٍ الحذف…" : "حذف نهائي"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
