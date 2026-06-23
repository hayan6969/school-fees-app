import { Header } from "@/components/layout/header";
import { getFinanceAnalytics } from "@/app/actions/finance";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const year = new Date().getFullYear();
  const analytics = await getFinanceAnalytics(year);

  return (
    <div>
      <Header title="Finance" description="Financial analytics, collections, and trends" />
      <FinanceClient initialAnalytics={analytics} initialYear={year} />
    </div>
  );
}
