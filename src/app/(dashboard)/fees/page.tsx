import { Header } from "@/components/layout/header";
import { getChallans } from "@/app/actions/fees";
import { getGrades } from "@/app/actions/grades";
import { FeesClient } from "./fees-client";

export default async function FeesPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [challans, grades] = await Promise.all([
    getChallans(month, year),
    getGrades(),
  ]);

  return (
    <div>
      <Header title="Fee Challans" description="Manage and track student fee payments" />
      <FeesClient initialChallans={challans} grades={grades} initialMonth={month} initialYear={year} />
    </div>
  );
}
