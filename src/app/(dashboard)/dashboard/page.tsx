import { Header } from "@/components/layout/header";
import { getDashboardStats } from "@/app/actions/fees";
import { getSettings } from "@/app/actions/settings";
import { getExpenseAnalytics } from "@/app/actions/expenses";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [stats, settings, treasury] = await Promise.all([
    getDashboardStats(month, year),
    getSettings(),
    getExpenseAnalytics(),
  ]);

  return (
    <div>
      <Header
        title="Dashboard"
        description={`Overview for ${new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}`}
      />
      <DashboardClient stats={stats} settings={settings} treasury={treasury} month={month} year={year} />
    </div>
  );
}
