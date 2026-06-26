import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getUsers } from "@/app/actions/users";
import { Header } from "@/components/layout/header";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isAdmin(me.role)) redirect("/dashboard");

  const users = await getUsers();

  return (
    <div>
      <Header title="Users & Roles" description="Manage who can access the system and what they can do" />
      <UsersClient users={users} meId={me.id} />
    </div>
  );
}
