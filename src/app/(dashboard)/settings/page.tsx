import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getGrades } from "@/app/actions/grades";
import { getSettings } from "@/app/actions/settings";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isAdmin(me.role)) redirect("/dashboard");

  const [grades, settings] = await Promise.all([getGrades(), getSettings()]);

  return (
    <div>
      <Header title="Settings" description="Configure fees, grades, and school information" />
      <SettingsClient grades={grades} settings={settings} />
    </div>
  );
}
