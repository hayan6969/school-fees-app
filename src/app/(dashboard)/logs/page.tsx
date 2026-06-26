import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/app/actions/audit";
import { getUsers } from "@/app/actions/users";
import { Header } from "@/components/layout/header";
import { LogsClient } from "./logs-client";

export default async function LogsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isAdmin(me.role)) redirect("/dashboard");

  const [logs, users] = await Promise.all([getAuditLogs(), getUsers()]);

  return (
    <div>
      <Header title="Activity Logs" description="Every action taken in the system, by account" />
      <LogsClient logs={logs} users={users} />
    </div>
  );
}
