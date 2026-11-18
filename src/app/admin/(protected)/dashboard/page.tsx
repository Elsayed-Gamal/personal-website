import { Suspense } from "react";
import { DashboardView } from "@/components/admin/dashboard-view";
import { SearchConsolePanel } from "@/components/admin/search-console-panel";
import { getDashboard } from "@/lib/db/dashboard";
import { analyticsEnabled, dashboardDays } from "@/lib/analytics";
import { getSearchConsoleReport } from "@/lib/google-search-console";

async function SearchPerformance({ days }: { days: 7 | 30 | 90 }) {
  return <SearchConsolePanel state={await getSearchConsoleReport(days)} />;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  const days = dashboardDays((await searchParams).days);
  const data = await getDashboard(days);
  return (
    <DashboardView
      data={data}
      trackingEnabled={analyticsEnabled()}
      searchConsole={
        <Suspense
          fallback={
            <section className="admin-panel" aria-busy="true">
              <h2>أداء البحث على Google</h2>
              <p className="admin-muted" role="status">
                جارٍ تحميل التقرير…
              </p>
            </section>
          }
        >
          <SearchPerformance days={days} />
        </Suspense>
      }
    />
  );
}
