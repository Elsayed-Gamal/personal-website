export function AdminHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="admin-heading">
      <p className="admin-eyebrow">إدارة الموقع الشخصي</p>
      <h1>{title}</h1>
      <p className="admin-muted">{description}</p>
    </div>
  );
}
export function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="admin-panel">
      <span className="admin-badge">قيد التجهيز</span>
      <h2>{title}</h2>
      <p className="admin-muted">{description}</p>
    </section>
  );
}
