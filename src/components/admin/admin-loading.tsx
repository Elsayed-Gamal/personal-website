export function AdminLoading() {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-loading-spinner" aria-hidden="true" />
      <p>جارٍ تحميل الصفحة…</p>
    </div>
  );
}
