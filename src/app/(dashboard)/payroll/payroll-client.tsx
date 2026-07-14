"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import type { Employee, EmployeeType, Payroll } from "@/lib/supabase/types";
import {
  getEmployees, getPayrolls, generatePayroll,
  createEmployee, updateEmployee, setEmployeeActive,
  updatePayrollAmount, markPayrollPaid, markPayrollUnpaid,
} from "@/app/actions/payroll";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, getMonthName, MONTHS } from "@/lib/fee-utils";
import { cn } from "@/lib/utils";
import {
  UserPlus, Zap, Loader2, CheckCircle2, Pencil, Users2, GraduationCap,
  Banknote, Clock, CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
const CURRENT = { m: new Date().getMonth() + 1, y: new Date().getFullYear() };

type EmpForm = { name: string; designation: string; phone: string; monthly_pay: string };
const emptyEmp = (): EmpForm => ({ name: "", designation: "", phone: "", monthly_pay: "" });

interface PayrollClientProps {
  initialEmployees: Employee[];
  initialPayrolls: Payroll[];
  month: number;
  year: number;
}

export function PayrollClient({ initialEmployees, initialPayrolls, month: m0, year: y0 }: PayrollClientProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [payrolls, setPayrolls] = useState(initialPayrolls);
  const [month, setMonth] = useState(m0);
  const [year, setYear] = useState(y0);
  const [tab, setTab] = useState<EmployeeType>("teacher");
  const [isPending, startTransition] = useTransition();

  const [showEmp, setShowEmp] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState<EmpForm>(emptyEmp());

  const [editAmountFor, setEditAmountFor] = useState<{ p: Payroll; emp: Employee } | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [confirmPay, setConfirmPay] = useState<{ p: Payroll; emp: Employee } | null>(null);

  const payrollByEmp = useMemo(() => {
    const map = new Map<string, Payroll>();
    for (const p of payrolls) map.set(p.employee_id, p);
    return map;
  }, [payrolls]);

  const activeOfType = useMemo(
    () => employees.filter((e) => e.type === tab && e.is_active),
    [employees, tab]
  );
  const teacherCount = employees.filter((e) => e.type === "teacher" && e.is_active).length;
  const staffCount = employees.filter((e) => e.type === "staff" && e.is_active).length;

  const isCurrentMonth = month === CURRENT.m && year === CURRENT.y;

  async function refresh(mo = month, yr = year) {
    const [emps, prs] = await Promise.all([getEmployees(), getPayrolls(mo, yr)]);
    setEmployees(emps);
    setPayrolls(prs);
  }

  function run(fn: () => Promise<unknown>, msg: string, after?: () => void) {
    startTransition(async () => {
      try { await fn(); toast.success(msg); after?.(); await refresh(); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); }
    });
  }

  function changePeriod(mo: number, yr: number) {
    setMonth(mo); setYear(yr);
    startTransition(async () => {
      try { setPayrolls(await getPayrolls(mo, yr)); } catch { /* ignore */ }
    });
  }

  // Auto-generate the current month once if employees exist but rows are missing
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const activeCount = employees.filter((e) => e.is_active).length;
    if (isCurrentMonth && activeCount > 0 && payrolls.length < activeCount) {
      startTransition(async () => {
        try { await generatePayroll(CURRENT.m, CURRENT.y); await refresh(CURRENT.m, CURRENT.y); } catch { /* ignore */ }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Summary for the selected type + month
  const rows = activeOfType.map((emp) => ({ emp, p: payrollByEmp.get(emp.id) ?? null }));
  const monthTotal = rows.reduce((s, r) => s + Number(r.p?.amount ?? r.emp.monthly_pay), 0);
  const paidTotal = rows.filter((r) => r.p?.is_paid).reduce((s, r) => s + Number(r.p!.amount), 0);
  const paidCount = rows.filter((r) => r.p?.is_paid).length;

  function openAddEmp() { setEditingEmp(null); setEmpForm(emptyEmp()); setShowEmp(true); }
  function openEditEmp(emp: Employee) {
    setEditingEmp(emp);
    setEmpForm({ name: emp.name, designation: emp.designation ?? "", phone: emp.phone ?? "", monthly_pay: String(emp.monthly_pay) });
    setShowEmp(true);
  }
  function saveEmp() {
    const pay = parseFloat(empForm.monthly_pay) || 0;
    if (!empForm.name.trim()) { toast.error("Enter a name"); return; }
    if (editingEmp) {
      run(() => updateEmployee(editingEmp.id, { name: empForm.name, designation: empForm.designation, phone: empForm.phone, monthly_pay: pay }), "Employee updated", () => setShowEmp(false));
    } else {
      run(() => createEmployee({ name: empForm.name, type: tab, designation: empForm.designation, phone: empForm.phone, monthly_pay: pay }), `${tab === "teacher" ? "Teacher" : "Staff"} added`, () => setShowEmp(false));
    }
  }

  const typeLabel = tab === "teacher" ? "Teacher" : "Staff";

  return (
    <div className="p-6 space-y-5">
      {/* Period + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={month.toString()} onValueChange={(v) => v && changePeriod(parseInt(v), year)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => v && changePeriod(month, parseInt(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => generatePayroll(month, year), `Payroll generated for ${getMonthName(month)} ${year}`)}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            <span className="ml-1.5">Generate Payroll</span>
          </Button>
        </div>
        <Button size="sm" onClick={openAddEmp}>
          <UserPlus className="h-4 w-4 mr-2" /> Add {typeLabel}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi title="Employees" value={String(activeOfType.length)} sub={`active ${tab}s`} icon={tab === "teacher" ? GraduationCap : Users2} color="blue" />
        <Kpi title="Monthly Payroll" value={formatCurrency(monthTotal)} sub={`${getMonthName(month)} ${year}`} icon={CircleDollarSign} color="indigo" />
        <Kpi title="Paid" value={formatCurrency(paidTotal)} sub={`${paidCount}/${activeOfType.length} paid`} icon={CheckCircle2} color="emerald" />
        <Kpi title="Pending" value={formatCurrency(monthTotal - paidTotal)} sub={`${activeOfType.length - paidCount} unpaid`} icon={Clock} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as EmployeeType)}>
          <TabsList>
            <TabsTrigger value="teacher"><GraduationCap className="h-4 w-4 mr-1.5" />Teachers ({teacherCount})</TabsTrigger>
            <TabsTrigger value="staff"><Users2 className="h-4 w-4 mr-1.5" />Staff ({staffCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        {!isCurrentMonth && (
          <span className="text-xs text-muted-foreground">Viewing {getMonthName(month)} {year}</span>
        )}
      </div>

      {/* Table */}
      {activeOfType.length === 0 ? (
        <div className="border border-dashed rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground">No {tab}s yet</p>
          <Button size="sm" className="mt-4" onClick={openAddEmp}><UserPlus className="h-4 w-4 mr-2" />Add {typeLabel}</Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <Th>Name</Th><Th>{tab === "teacher" ? "Subject" : "Role"}</Th>
                <Th className="text-right">Monthly Pay</Th><Th className="text-right">This Month</Th>
                <Th>Status</Th><Th className="text-right">Actions</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ emp, p }) => {
                const amount = p ? Number(p.amount) : emp.monthly_pay;
                return (
                  <TableRow key={emp.id} className="group hover:bg-muted/20">
                    <TableCell>
                      <p className="font-medium text-sm">{emp.name}</p>
                      {emp.phone && <p className="text-xs text-muted-foreground">{emp.phone}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.designation || "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatCurrency(emp.monthly_pay)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">
                      {p ? formatCurrency(amount) : <span className="text-muted-foreground">{formatCurrency(amount)}</span>}
                    </TableCell>
                    <TableCell>
                      {!p ? (
                        <span className="text-xs text-muted-foreground">Not generated</span>
                      ) : p.is_paid ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          Paid{p.paid_by ? ` · ${p.paid_by}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p && !p.is_paid && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8" disabled={isPending}
                              onClick={() => { setAmountInput(String(p.amount)); setEditAmountFor({ p, emp }); }}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />Amount
                            </Button>
                            <Button size="sm" className="h-8" disabled={isPending}
                              onClick={() => setConfirmPay({ p, emp })}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Paid
                            </Button>
                          </>
                        )}
                        {p && p.is_paid && (
                          <Button variant="ghost" size="sm" className="h-8" disabled={isPending}
                            onClick={() => run(() => markPayrollUnpaid(p.id), "Payment reversed")}>
                            Undo
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit employee"
                          onClick={() => openEditEmp(emp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit employee */}
      <Dialog open={showEmp} onOpenChange={setShowEmp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmp ? `Edit ${editingEmp.type === "teacher" ? "Teacher" : "Staff"}` : `Add ${typeLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="emp_name">Name</Label>
              <Input id="emp_name" value={empForm.name} onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))} placeholder={tab === "teacher" ? "e.g. Ms. Ayesha" : "e.g. Bilal (Peon)"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp_desig">{tab === "teacher" ? "Subject" : "Role"} <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="emp_desig" value={empForm.designation} onChange={(e) => setEmpForm((f) => ({ ...f, designation: e.target.value }))} placeholder={tab === "teacher" ? "e.g. Mathematics" : "e.g. Accountant"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp_phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="emp_phone" value={empForm.phone} onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))} placeholder="03XX-XXXXXXX" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp_pay">Monthly Pay (Rs)</Label>
              <Input id="emp_pay" type="number" min="0" step="1" value={empForm.monthly_pay} onChange={(e) => setEmpForm((f) => ({ ...f, monthly_pay: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmp(false)}>Cancel</Button>
            <Button disabled={isPending} onClick={saveEmp}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingEmp ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit payslip amount */}
      <Dialog open={editAmountFor !== null} onOpenChange={(o) => { if (!o) setEditAmountFor(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adjust This Month&apos;s Pay</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              {editAmountFor?.emp.name} — {getMonthName(month)} {year}. This only changes this month&apos;s payslip, not their base pay.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (Rs)</Label>
              <Input id="amt" type="number" min="0" step="1" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAmountFor(null)}>Cancel</Button>
            <Button disabled={isPending} onClick={() => { const id = editAmountFor!.p.id; run(() => updatePayrollAmount(id, parseFloat(amountInput) || 0), "Payslip updated", () => setEditAmountFor(null)); }}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm pay */}
      <Dialog open={confirmPay !== null} onOpenChange={(o) => { if (!o) setConfirmPay(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Confirm Salary Payment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{confirmPay?.emp.name} · {getMonthName(month)} {year}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(confirmPay?.p.amount ?? 0)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              This records a <strong>Salaries</strong> expense for {getMonthName(month)} {year} and deducts it from the treasury.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPay(null)}>Cancel</Button>
            <Button disabled={isPending} onClick={() => { const id = confirmPay!.p.id; run(() => markPayrollPaid(id), "Salary paid & expense recorded", () => setConfirmPay(null)); }}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <TableHead className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>{children}</TableHead>;
}

function Kpi({ title, value, sub, icon: Icon, color }: { title: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50", indigo: "text-indigo-600 bg-indigo-50",
    emerald: "text-emerald-600 bg-emerald-50", amber: "text-amber-600 bg-amber-50",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 leading-none truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-lg shrink-0", colors[color] ?? "text-gray-600 bg-gray-50")}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
