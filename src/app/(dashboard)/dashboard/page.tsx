import { Header } from "@/components/layout/header";
import { getDashboardStats } from "@/app/actions/fees";
import { getSettings } from "@/app/actions/settings";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [stats, settings] = await Promise.all([
    getDashboardStats(month, year),
    getSettings(),
  ]);

  return (
    <div>
      <Header
        title="Dashboard"
        description={`Overview for ${new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}`}
      />
      <DashboardClient stats={stats} settings={settings} month={month} year={year} />
    </div>
  );
}
