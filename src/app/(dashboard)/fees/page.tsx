import { Header } from "@/components/layout/header";
import { getChallans } from "@/app/actions/fees";
import { FeesClient } from "./fees-client";

export default async function FeesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const challans = await getChallans(month, year);

  return (
    <div>
      <Header title="Fee Challans" description="Manage and track student fee payments" />
      <FeesClient initialChallans={challans} initialMonth={month} initialYear={year} />
    </div>
  );
}
