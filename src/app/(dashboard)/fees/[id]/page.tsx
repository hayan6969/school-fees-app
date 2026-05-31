import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getChallan } from "@/app/actions/fees";
import { getSettings } from "@/app/actions/settings";
import { ChallanDetailClient } from "./challan-detail-client";

export default async function ChallanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [challan, settings] = await Promise.all([getChallan(id), getSettings()]);

  if (!challan) notFound();

  return (
    <div>
      <Header
        title="Fee Challan"
        description={`${challan.student?.full_name} · ${new Date(challan.year, challan.month - 1).toLocaleString("default", { month: "long", year: "numeric" })}`}
      />
      <ChallanDetailClient challan={challan} settings={settings} />
    </div>
  );
}
