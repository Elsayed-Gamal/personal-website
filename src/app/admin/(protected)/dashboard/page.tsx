import { DashboardView } from "@/components/admin/dashboard-view";
import { getDashboard } from "@/lib/db/dashboard";
import { analyticsEnabled, dashboardDays } from "@/lib/analytics";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  const params = await searchParams;
  const data = await getDashboard(dashboardDays(params.days));
  return <DashboardView data={data} trackingEnabled={analyticsEnabled()} />;
}
