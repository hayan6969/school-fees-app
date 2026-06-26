"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Expense, ExpenseCategory } from "@/lib/supabase/types";
import type { ExpenseAnalytics } from "@/app/actions/expenses";
import {
  createExpense, updateExpense, deleteExpense,
  createExpenseCategory, deleteExpenseCategory, setOpeningBalance,
  approveExpense, rejectExpense,
} from "@/app/actions/expenses";
import { useSession, isAdminRole } from "@/components/layout/session-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/fee-utils";
import { cn } from "@/lib/utils";
import {
  Wallet, Banknote, TrendingDown, CalendarDays, Plus, Search, Tags,
  Pencil, Trash2, Loader2, AlertTriangle, PieChart as PieIcon,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Card", "Other"];
const NO_CATEGORY = "__none__";
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function today() {
  return new Date().toISOString().split("T")[0];
}

type FormState = {
  title: string;
  amount: string;
  category_id: string;
  expense_date: string;
  payment_method: string;
  paid_to: string;
  notes: string;
  recorded_by: string;
};

const emptyForm = (): FormState => ({
  title: "", amount: "", category_id: NO_CATEGORY, expense_date: today(),
  payment_method: "Cash", paid_to: "", notes: "", recorded_by: "",
});

interface ExpensesClientProps {
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  analytics: ExpenseAnalytics;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
};

export function ExpensesClient({ initialExpenses, categories, analytics }: ExpensesClientProps) {
  const router = useRouter();
  const me = useSession();
  const admin = isAdminRole(me.role);
  const [isPending, startTransition] = useTransition();
  const [rejectFor, setRejectFor] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [showCats, setShowCats] = useState(false);
  const [newCat, setNewCat] = useState("");

  const [showOpening, setShowOpening] = useState(false);
  const [openingInput, setOpeningInput] = useState(String(analytics.openingBalance));

  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return initialExpenses.filter((e) => {
      const matchSearch = !q
        || e.title.toLowerCase().includes(q)
        || (e.paid_to ?? "").toLowerCase().includes(q);
      const matchCat = catFilter === "all"
        || (catFilter === NO_CATEGORY ? !e.category_id : e.category_id === catFilter);
      const matchFrom = !fromDate || e.expense_date >= fromDate;
      const matchTo = !toDate || e.expense_date <= toDate;
      return matchSearch && matchCat && matchFrom && matchTo;
    });
  }, [initialExpenses, search, catFilter, fromDate, toDate]);

  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const negativeTreasury = analytics.treasuryBalance < 0;

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      title: e.title,
      amount: String(e.amount),
      category_id: e.category_id ?? NO_CATEGORY,
      expense_date: e.expense_date,
      payment_method: e.payment_method ?? "Cash",
      paid_to: e.paid_to ?? "",
      notes: e.notes ?? "",
      recorded_by: e.recorded_by ?? "",
    });
    setShowForm(true);
  }

  function run(fn: () => Promise<unknown>, msg: string, after?: () => void) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(msg);
        after?.();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  function saveExpense() {
    const amount = parseFloat(form.amount);
    if (!form.title.trim()) { toast.error("Enter a title"); return; }
    if (!(amount > 0)) { toast.error("Enter an amount greater than zero"); return; }
    const payload = {
      title: form.title,
      amount,
      category_id: form.category_id === NO_CATEGORY ? null : form.category_id,
      expense_date: form.expense_date || today(),
      payment_method: form.payment_method,
      paid_to: form.paid_to,
      notes: form.notes,
      recorded_by: form.recorded_by,
    };
    run(
      () => (editing ? updateExpense(editing.id, payload) : createExpense(payload)),
      editing ? "Expense updated" : admin ? "Expense recorded" : "Submitted for approval",
      () => setShowForm(false)
    );
  }

  const maxMonthly = Math.max(1, ...analytics.monthly.map((m) => m.total));
  const maxCategory = Math.max(1, ...analytics.byCategory.map((c) => c.total));

  return (
    <div className="p-6 space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span>{analytics.expenseCount} expense{analytics.expenseCount !== 1 ? "s" : ""} recorded</span>
        </div>
        <div className="flex items-center gap-2">
          {admin && (
            <Button variant="outline" size="sm" onClick={() => setShowCats(true)}>
              <Tags className="h-4 w-4 mr-2" /> Categories
            </Button>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Pending approvals banner */}
      {analytics.pendingCount > 0 && (
        <div className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm",
          admin ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800")}>
          <Clock className="h-4 w-4 shrink-0" />
          {admin ? (
            <span><strong>{analytics.pendingCount}</strong> expense{analytics.pendingCount !== 1 ? "s" : ""} ({formatCurrency(analytics.pendingTotal)}) awaiting your approval — review them below. Pending expenses are not yet deducted from the treasury.</span>
          ) : (
            <span><strong>{analytics.pendingCount}</strong> of your expense{analytics.pendingCount !== 1 ? "s are" : " is"} pending admin approval ({formatCurrency(analytics.pendingTotal)}).</span>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className={cn(negativeTreasury && "ring-2 ring-red-300")}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  Treasury Balance
                  {admin && (
                    <button onClick={() => { setOpeningInput(String(analytics.openingBalance)); setShowOpening(true); }} className="text-muted-foreground/60 hover:text-foreground" title="Edit opening balance">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </p>
                <p className={cn("text-2xl font-bold mt-1 leading-none truncate", negativeTreasury ? "text-red-600" : "text-emerald-700")}>
                  {formatCurrency(analytics.treasuryBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 truncate">opening {formatCurrency(analytics.openingBalance)}</p>
              </div>
              <div className={cn("p-2 rounded-lg shrink-0", negativeTreasury ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50")}>
                <Wallet className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Kpi title="Total Income" value={formatCurrency(analytics.totalIncome)} sub="fees collected" icon={Banknote} color="green" />
        <Kpi title="Total Expenses" value={formatCurrency(analytics.totalExpenses)} sub={`${analytics.expenseCount} entries`} icon={TrendingDown} color="red" />
        <Kpi title="This Month" value={formatCurrency(analytics.thisMonthExpenses)} sub={`spent in ${MONTHS_FULL[new Date().getMonth()]}`} icon={CalendarDays} color="amber" />
      </div>

      {negativeTreasury && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Treasury balance is negative — expenses exceed income plus opening balance.
        </div>
      )}

      {/* Breakdown row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By category */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-muted-foreground" /> Expenses by Category
            </h3>
            {analytics.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.byCategory.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatCurrency(c.total)}
                        <span className="text-muted-foreground/50"> · {analytics.totalExpenses > 0 ? Math.round((c.total / analytics.totalExpenses) * 100) : 0}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(c.total / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" /> Monthly Spending · {analytics.year}
            </h3>
            <div className="flex items-end gap-1.5 h-40">
              {analytics.monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="relative w-full flex-1 flex items-end justify-center">
                    <div
                      className="w-full max-w-[28px] bg-primary/80 rounded-t-md transition-all"
                      style={{ height: `${(m.total / maxMonthly) * 100}%` }}
                      title={`${m.label}: ${formatCurrency(m.total)}`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground truncate w-full text-center">{m.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9 w-56" placeholder="Search title or payee…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v ?? "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input type="date" className="w-40" aria-label="From date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="date" className="w-40" aria-label="To date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
          )}
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} shown · <span className="font-semibold text-foreground">{formatCurrency(filteredTotal)}</span>
        </span>
      </div>

      {/* Expense table */}
      {filtered.length === 0 ? (
        <div className="border border-dashed rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <TrendingDown className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground">No expenses{initialExpenses.length > 0 ? " match the filters" : " recorded yet"}</p>
          {initialExpenses.length === 0 && (
            <Button size="sm" className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add your first expense</Button>
          )}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <Th>Date</Th><Th>Title</Th><Th>Category</Th><Th>Paid To</Th><Th>Status</Th>
                <Th className="text-right">Amount</Th><Th className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="group hover:bg-muted/20">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(e.expense_date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{e.title}</p>
                    {e.notes && <p className="text-xs text-muted-foreground truncate max-w-[220px]">{e.notes}</p>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.category?.name
                      ? <span className="text-xs px-2 py-0.5 rounded-full border bg-muted/50">{e.category.name}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.paid_to || "—"}</TableCell>
                  <TableCell>
                    {(() => {
                      const st = STATUS_BADGE[e.status] ?? STATUS_BADGE.approved;
                      return (
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", st.cls)} title={e.reject_reason ?? undefined}>
                          {st.label}
                        </span>
                      );
                    })()}
                    {e.created_by_name && <p className="text-[10px] text-muted-foreground mt-0.5">by {e.created_by_name}</p>}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm tabular-nums">{formatCurrency(e.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {admin && e.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Approve"
                            disabled={isPending} onClick={() => run(() => approveExpense(e.id), "Expense approved")}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" title="Reject"
                            disabled={isPending} onClick={() => { setRejectReason(""); setRejectFor(e); }}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(admin || (e.created_by === me.id && e.status === "pending")) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" placeholder="e.g. June electricity bill" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (Rs) <span className="text-destructive">*</span></Label>
                <Input id="amount" type="number" min="0" step="1" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v ?? NO_CATEGORY }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v ?? "Cash" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paid_to">Paid To</Label>
                <Input id="paid_to" placeholder="Vendor / payee" value={form.paid_to} onChange={(e) => setForm((f) => ({ ...f, paid_to: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recorded_by">Recorded By</Label>
                <Input id="recorded_by" placeholder="Your name" value={form.recorded_by} onChange={(e) => setForm((f) => ({ ...f, recorded_by: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} placeholder="Optional details…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={saveExpense} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage categories dialog */}
      <Dialog open={showCats} onOpenChange={setShowCats}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Expense Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex items-center gap-2">
              <Input placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newCat.trim()) run(() => createExpenseCategory(newCat), "Category added", () => setNewCat("")); }} />
              <Button size="sm" disabled={isPending || !newCat.trim()} onClick={() => run(() => createExpenseCategory(newCat), "Category added", () => setNewCat(""))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{c.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isPending}
                      onClick={() => run(() => deleteExpenseCategory(c.id), "Category deleted")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Deleting a category keeps its expenses (marked Uncategorized).</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opening balance dialog */}
      <Dialog open={showOpening} onOpenChange={setShowOpening}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Opening Treasury Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">Cash on hand before the system started tracking. Added to collected fees, minus expenses.</p>
            <div className="space-y-1.5">
              <Label htmlFor="opening">Opening Balance (Rs)</Label>
              <Input id="opening" type="number" step="1" value={openingInput} onChange={(e) => setOpeningInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpening(false)}>Cancel</Button>
            <Button disabled={isPending} onClick={() => run(() => setOpeningBalance(parseFloat(openingInput) || 0), "Opening balance updated", () => setShowOpening(false))}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete !== null} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense?</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{confirmDelete?.title}</span> ({formatCurrency(confirmDelete?.amount ?? 0)})? This restores the amount to the treasury.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={isPending}
              onClick={() => { const id = confirmDelete!.id; run(() => deleteExpense(id), "Expense deleted", () => setConfirmDelete(null)); }}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject expense */}
      <Dialog open={rejectFor !== null} onOpenChange={(o) => { if (!o) setRejectFor(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Expense?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Reject <span className="font-medium text-foreground">{rejectFor?.title}</span> ({formatCurrency(rejectFor?.amount ?? 0)})
              {rejectFor?.created_by_name ? ` submitted by ${rejectFor.created_by_name}` : ""}. It won&apos;t affect the treasury.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reject_reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="reject_reason" rows={2} placeholder="e.g. Not an approved purchase" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" disabled={isPending}
              onClick={() => { const id = rejectFor!.id; run(() => rejectExpense(id, rejectReason), "Expense rejected", () => setRejectFor(null)); }}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </TableHead>
  );
}

function Kpi({
  title, value, sub, icon: Icon, color,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  const colors: Record<string, string> = {
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50",
    blue: "text-blue-600 bg-blue-50",
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
