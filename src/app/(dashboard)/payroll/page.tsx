import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getEmployees, getPayrolls } from "@/app/actions/payroll";
import { Header } from "@/components/layout/header";
import { PayrollClient } from "./payroll-client";

export default async function PayrollPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isAdmin(me.role)) redirect("/dashboard");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [employees, payrolls] = await Promise.all([
    getEmployees(),
    getPayrolls(month, year),
  ]);

  return (
    <div>
      <Header title="Payroll" description="Teachers & staff salaries — generated monthly, paid to Salaries expenses" />
      <PayrollClient
        initialEmployees={employees}
        initialPayrolls={payrolls}
        month={month}
        year={year}
      />
    </div>
  );
}
