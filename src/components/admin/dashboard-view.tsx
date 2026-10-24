import { AdminLink as Link } from "./admin-link";
import {
  FileText,
  FolderKanban,
  Mail,
  Eye,
  ArrowUpLeft,
  Settings,
  RefreshCw,
  Globe,
} from "lucide-react";
import { type DashboardData, viewTrend } from "@/lib/analytics";
const number = (value: number) => new Intl.NumberFormat("ar-EG").format(value);
function date(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}
function countryLabel(code: string) {
  if (code === "ZZ") return "غير معروف";
  try {
    return new Intl.DisplayNames(["ar"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
export function DashboardView({
  data,
  trackingEnabled,
}: {
  data: DashboardData;
  trackingEnabled: boolean;
}) {
  const trend = viewTrend(data.views, data.previous_views);
  const max = Math.max(1, ...data.daily.map((d) => d.views));
  const points = data.daily
    .map(
      (d, i) =>
        `${20 + (i * 680) / Math.max(1, data.daily.length - 1)},${160 - (d.views / max) * 135}`,
    )
    .join(" ");
  const published = data.articles.published + data.projects.published;
  const drafts = data.articles.total + data.projects.total - published;
  return (
    <div className="dashboard">
      <div className="dashboard-top">
        <div>
          <p className="admin-eyebrow">نظرة عامة على موقعك</p>
          <h1>لوحة التحكم</h1>
          <p className="admin-muted">
            المحتوى، رسائل العملاء، وأداء الموقع في مكان واحد.
          </p>
        </div>
        <a
          className="dashboard-refresh"
          href={"/admin/dashboard?days=" + data.days}
        >
          <RefreshCw size={16} /> تحديث البيانات
        </a>
      </div>
      <div className="dashboard-range">
        <div className="dashboard-period" aria-label="الفترة الزمنية">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={"/admin/dashboard?days=" + days}
              aria-current={days === data.days ? "page" : undefined}
            >
              آخر {number(days)} يومًا
            </Link>
          ))}
        </div>
        <span>
          {date(data.start_day + "T12:00:00Z")} —{" "}
          {date(data.end_day + "T12:00:00Z")}
        </span>
      </div>
      <div className="dashboard-metrics">
        {[
          {
            label: "مشاهدات الصفحات",
            value: data.views,
            icon: Eye,
            sub:
              trend === null
                ? "لا توجد بيانات سابقة كافية للمقارنة"
                : (trend >= 0 ? "زيادة " : "انخفاض ") +
                  number(Math.abs(trend)) +
                  "٪ عن الفترة السابقة",
          },
          {
            label: "المقالات",
            value: data.articles.total,
            icon: FileText,
            sub:
              number(data.articles.published) +
              " منشور · " +
              number(data.articles.total - data.articles.published) +
              " مسودة",
            href: "/admin/content",
          },
          {
            label: "المشاريع",
            value: data.projects.total,
            icon: FolderKanban,
            sub:
              number(data.projects.published) +
              " منشور · " +
              number(data.projects.total - data.projects.published) +
              " مسودة",
            href: "/admin/content",
          },
          {
            label: "الرسائل غير المقروءة",
            value: data.messages.unread,
            icon: Mail,
            sub:
              number(data.messages.period) +
              " رسالة خلال الفترة · " +
              number(data.messages.total) +
              " إجمالًا",
            href: "/admin/messages",
          },
        ].map(({ label, value, icon: Icon, sub, href }) => (
          <section key={label} className="dashboard-metric">
            <div>
              <span>{label}</span>
              <Icon size={20} aria-hidden="true" />
            </div>
            <strong>{number(value)}</strong>
            <p>{sub}</p>
            {href && (
              <Link
                href={href}
                className="dashboard-metric-link"
                aria-label={"إدارة " + label}
              >
                <ArrowUpLeft size={18} />
              </Link>
            )}
          </section>
        ))}
      </div>
      <div className="dashboard-primary-grid">
        <section className="admin-panel dashboard-chart">
          <div className="dashboard-section-heading">
            <div>
              <h2>حركة الزيارات</h2>
              <p className="admin-muted">
                مشاهدات الصفحات يوميًا بتوقيت القاهرة
              </p>
            </div>
            <span className="dashboard-chip">{number(data.views)} مشاهدة</span>
          </div>
          {data.views > 0 ? (
            <>
              <svg
                viewBox="0 0 720 180"
                role="img"
                aria-label={
                  "منحنى مشاهدات الصفحات خلال " + data.days + " يومًا"
                }
              >
                <path
                  d="M20 25H700 M20 92H700 M20 160H700"
                  fill="none"
                  stroke="#e3eaf5"
                  strokeDasharray="4 5"
                />
                <polygon
                  points={"20,160 " + points + " 700,160"}
                  fill="#eaf1ff"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke="#285dc2"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div className="dashboard-chart-labels">
                <span>{date(data.start_day + "T12:00:00Z")}</span>
                <span>الحد الأعلى: {number(max)}</span>
                <span>{date(data.end_day + "T12:00:00Z")}</span>
              </div>
            </>
          ) : (
            <div className="dashboard-empty-chart">
              <Eye size={32} />
              <h3>لم تُسجّل مشاهدات في هذه الفترة بعد</h3>
              <p>ستظهر البيانات مع زيارة صفحات الموقع العامة.</p>
            </div>
          )}
          <details className="dashboard-chart-data">
            <summary>عرض الأرقام اليومية</summary>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th>المشاهدات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((day) => (
                    <tr key={day.day}>
                      <td>{day.day}</td>
                      <td>{number(day.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="admin-panel dashboard-attention">
          <h2>متابعة سريعة</h2>
          <Link href="/admin/messages">
            <Mail size={20} />
            <div>
              <strong>
                {data.messages.unread
                  ? number(data.messages.unread) + " رسالة تحتاج القراءة"
                  : "كل الرسائل مقروءة"}
              </strong>
              <p>افتح صندوق الوارد وتابع الاستفسارات.</p>
            </div>
            <ArrowUpLeft size={18} />
          </Link>
          <Link href="/admin/content">
            <FileText size={20} />
            <div>
              <strong>
                {drafts
                  ? number(drafts) + " مسودة قيد العمل"
                  : "المحتوى المنشور جاهز للعرض"}
              </strong>
              <p>{number(published)} مقال ومشروع منشور على الموقع.</p>
            </div>
            <ArrowUpLeft size={18} />
          </Link>
          <Link href="/admin/settings">
            <Settings size={20} />
            <div>
              <strong>حدّث واجهة موقعك</strong>
              <p>راجع الإعدادات ونصوص الصفحة الرئيسية.</p>
            </div>
            <ArrowUpLeft size={18} />
          </Link>
        </section>
      </div>
      <div className="dashboard-two-columns">
        <section className="admin-panel">
          <div className="dashboard-section-heading">
            <h2>أكثر الصفحات مشاهدة</h2>
            <Eye size={19} />
          </div>
          {data.pages.length ? (
            <ol className="dashboard-rankings">
              {data.pages.map((page, index) => (
                <li key={page.path}>
                  <span className="dashboard-rank">{number(index + 1)}</span>
                  <a
                    href={page.path}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                  >
                    {page.path}
                  </a>
                  <strong>{number(page.views)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="admin-muted dashboard-empty">
              لا توجد مشاهدات مسجلة بعد.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <div className="dashboard-section-heading">
            <h2>الدول</h2>
            <Globe size={19} />
          </div>
          {data.countries.length ? (
            <ol className="dashboard-rankings">
              {data.countries.map((country) => (
                <li key={country.country}>
                  <span>{countryLabel(country.country)}</span>
                  <div className="dashboard-country-bar">
                    <span
                      style={{
                        width:
                          Math.round(
                            (country.views / Math.max(data.views, 1)) * 100,
                          ) + "%",
                      }}
                    />
                  </div>
                  <strong>{number(country.views)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="admin-muted dashboard-empty">
              لا توجد بيانات دول في هذه الفترة.
            </p>
          )}
          <p className="dashboard-note">
            تم تحديد الدولة لـ {number(data.known_country_views)} من{" "}
            {number(data.views)} مشاهدة. تظهر «غير معروف» عند عدم توفر بيانات
            الموقع من الاستضافة.
          </p>
        </section>
      </div>
      <div className="dashboard-two-columns">
        <section className="admin-panel">
          <div className="dashboard-section-heading">
            <h2>أحدث الرسائل</h2>
            <Link href="/admin/messages">كل الرسائل ←</Link>
          </div>
          {data.recent_messages.length ? (
            <ul className="dashboard-activity">
              {data.recent_messages.map((message) => (
                <li key={message.id}>
                  <Link href="/admin/messages">
                    <strong>{message.name}</strong>
                    <span>{date(message.created_at)}</span>
                  </Link>
                  <span className="dashboard-chip">
                    {message.read_at ? "مقروءة" : "جديدة"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted dashboard-empty">
              لا توجد رسائل بعد. الرسائل المرسلة من نموذج التواصل ستظهر هنا.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <div className="dashboard-section-heading">
            <h2>آخر تحديثات المحتوى</h2>
            <Link href="/admin/content">إدارة المحتوى ←</Link>
          </div>
          {data.recent_content.length ? (
            <ul className="dashboard-activity">
              {data.recent_content.map((entry) => (
                <li key={entry.kind + entry.id}>
                  <Link href="/admin/content">
                    <strong>{entry.title}</strong>
                    <span>
                      {entry.kind === "article" ? "مقال" : "مشروع"} ·{" "}
                      {date(entry.updated_at)}
                    </span>
                  </Link>
                  <span className="dashboard-chip">
                    {entry.published ? "منشور" : "مسودة"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted dashboard-empty">
              أضف أول مقال أو مشروع من إدارة المحتوى.
            </p>
          )}
        </section>
      </div>
      <p className="dashboard-note">
        آخر تحديث:{" "}
        {new Date(data.generated_at).toLocaleString("ar-EG", {
          timeZone: "Africa/Cairo",
        })}
        . أعداد المقالات والمشاريع والرسائل غير المقروءة إجمالية. المشاهدات تخص
        الفترة المختارة ولا تمثل عدد أشخاص فريدين.{" "}
        {trackingEnabled
          ? "جمع المشاهدات مفعّل على نسخة الإنتاج، مع احترام طلب عدم التتبع."
          : "جمع المشاهدات متوقف في بيئة التطوير أو المعاينة أو عند تعطيله في الإعدادات."}
      </p>
    </div>
  );
}
