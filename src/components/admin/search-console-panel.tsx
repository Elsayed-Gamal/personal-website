import type { SearchConsoleState } from "@/lib/google-search-console";

const count = new Intl.NumberFormat("ar-EG");
const decimal = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("ar-EG", {
  style: "percent",
  maximumFractionDigits: 1,
});

function SearchChart({
  label,
  color,
  dates,
  values,
}: {
  label: string;
  color: string;
  dates: string[];
  values: (number | null)[];
}) {
  const max = Math.max(1, ...values.map((value) => value ?? 0));
  const path = values
    .map((value, index) => {
      if (value === null) return "";
      const command = index > 0 && values[index - 1] !== null ? "L" : "M";
      return `${command}${20 + (index * 680) / Math.max(1, values.length - 1)},${110 - (value / max) * 90}`;
    })
    .join(" ");
  return (
    <div className="dashboard-chart">
      <h3>{label}</h3>
      <svg viewBox="0 0 720 125" role="img" aria-label={label}>
        <path
          d="M20 20H700 M20 65H700 M20 110H700"
          fill="none"
          stroke="#e3eaf5"
          strokeDasharray="4 5"
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {values.map((value, index) =>
          value === null ? null : (
            <circle
              key={dates[index]}
              cx={20 + (index * 680) / Math.max(1, values.length - 1)}
              cy={110 - (value / max) * 90}
              r="2.5"
              fill={color}
            >
              <title>
                {dates[index]} · {count.format(value)}
              </title>
            </circle>
          ),
        )}
      </svg>
      <div className="dashboard-chart-labels" dir="ltr">
        <span>{dates[0]}</span>
        <span>{count.format(max)}</span>
        <span>{dates.at(-1)}</span>
      </div>
    </div>
  );
}

function Rankings({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; clicks: number; impressions: number }[];
}) {
  return (
    <div className="dashboard-chart-data">
      <h3>{title}</h3>
      {rows.length ? (
        <div>
          <table>
            <thead>
              <tr>
                <th scope="col">{title}</th>
                <th scope="col">النقرات</th>
                <th scope="col">الظهور</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    <bdi className="search-console-label">{row.label}</bdi>
                  </th>
                  <td>{count.format(row.clicks)}</td>
                  <td>{count.format(row.impressions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-muted">لا توجد بيانات متاحة لهذه الفترة.</p>
      )}
    </div>
  );
}

export function SearchConsolePanel({ state }: { state: SearchConsoleState }) {
  return (
    <section className="admin-panel" aria-labelledby="search-console-heading">
      <div className="dashboard-section-heading">
        <div>
          <h2 id="search-console-heading">أداء البحث على Google</h2>
          <p className="admin-muted">
            نتائج بحث الويب من Google Search Console
          </p>
        </div>
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noreferrer"
        >
          فتح Search Console
        </a>
      </div>
      {state.status !== "ready" ? (
        <p className="admin-muted" role="status">
          {state.status === "unconfigured"
            ? "لم يتم ربط Google Search Console بعد."
            : "تعذر تحميل تقرير Google حاليًا. حاول تحديث البيانات أو راجع صلاحية الربط."}
        </p>
      ) : !state.report.total ? (
        <p className="admin-muted">
          لا توجد بيانات بحث متاحة من {state.report.startDate} إلى{" "}
          {state.report.endDate}.
        </p>
      ) : (
        <>
          <p className="dashboard-note">
            من <bdi>{state.report.startDate}</bdi> إلى{" "}
            <bdi>{state.report.endDate}</bdi> بتوقيت المحيط الهادئ. بيانات
            Google النهائية تتأخر عادةً عدة أيام.
          </p>
          <dl className="dashboard-metrics search-console-metrics">
            {[
              ["النقرات", count.format(state.report.total.clicks)],
              ["مرات الظهور", count.format(state.report.total.impressions)],
              ["نسبة النقر إلى الظهور", percent.format(state.report.total.ctr)],
              [
                "متوسط الترتيب",
                state.report.total.impressions
                  ? decimal.format(state.report.total.position)
                  : "—",
              ],
            ].map(([label, value]) => (
              <div className="dashboard-metric" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="dashboard-two-columns">
            <SearchChart
              label="النقرات يوميًا"
              color="#285dc2"
              dates={state.report.daily.map((day) => day.date)}
              values={state.report.daily.map((day) => day.clicks)}
            />
            <SearchChart
              label="الظهور يوميًا"
              color="#137065"
              dates={state.report.daily.map((day) => day.date)}
              values={state.report.daily.map((day) => day.impressions)}
            />
          </div>
          <details className="dashboard-chart-data">
            <summary>عرض أرقام البحث اليومية</summary>
            <div>
              <table>
                <thead>
                  <tr>
                    <th scope="col">اليوم</th>
                    <th scope="col">النقرات</th>
                    <th scope="col">الظهور</th>
                  </tr>
                </thead>
                <tbody>
                  {state.report.daily.map((day) => (
                    <tr key={day.date}>
                      <th scope="row">
                        <bdi>{day.date}</bdi>
                      </th>
                      <td>
                        {day.clicks === null ? "—" : count.format(day.clicks)}
                      </td>
                      <td>
                        {day.impressions === null
                          ? "—"
                          : count.format(day.impressions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="dashboard-two-columns">
            <Rankings title="أعلى عبارات البحث" rows={state.report.queries} />
            <Rankings title="أعلى صفحات البحث" rows={state.report.pages} />
          </div>
        </>
      )}
    </section>
  );
}
