"use client";

import { useState, useTransition } from "react";
import type { FinanceAnalytics, PeriodPoint } from "@/app/actions/finance";
import { getFinanceAnalytics } from "@/app/actions/finance";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/fee-utils";
import { cn } from "@/lib/utils";
import {
  Banknote, FileText, CheckCircle2, Clock, TrendingUp, Loader2,
  Wallet, Award, Calendar, PieChart as PieIcon,
} from "lucide-react";

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

type Granularity = "monthly" | "quarterly" | "yearly";

interface FinanceClientProps {
  initialAnalytics: FinanceAnalytics;
  initialYear: number;
}

export function FinanceClient({ initialAnalytics, initialYear }: FinanceClientProps) {
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [year, setYear] = useState(initialYear);
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [isPending, startTransition] = useTransition();

  function handleYearChange(v: string | null) {
    if (!v) return;
    const ny = parseInt(v);
    setYear(ny);
    startTransition(async () => {
      try {
        const data = await getFinanceAnalytics(ny);
        setAnalytics(data);
      } catch { /* ignore */ }
    });
  }

  const { yearly } = analytics;
  const periods: PeriodPoint[] =
    granularity === "monthly" ? analytics.monthly
    : granularity === "quarterly" ? analytics.quarterly
    : [analytics.yearly];

  const hasData = yearly.generated > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Financial year</span>
        </div>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Select value={year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasData ? (
        <div className="border border-dashed rounded-xl flex flex-col items-center justify-center py-20 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground">No financial data for {year}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Generate fee challans to start tracking collections and analytics
          </p>
        </div>
      ) : (
        <>
          {/* KPI cards — yearly summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Total Invoiced"
              value={formatCurrency(yearly.expected)}
              sub={`${yearly.generated} challans generated`}
              icon={FileText} color="blue"
            />
            <KpiCard
              title="Total Collected"
              value={formatCurrency(yearly.collected)}
              sub={`${yearly.paid} challans paid`}
              icon={Banknote} color="green"
            />
            <KpiCard
              title="Outstanding"
              value={formatCurrency(yearly.outstanding)}
              sub={`${yearly.unpaid} challans unpaid`}
              icon={Clock} color={yearly.outstanding > 0 ? "amber" : "emerald"}
            />
            <KpiCard
              title="Collection Rate"
              value={`${analytics.amountRate}%`}
              sub={`${analytics.collectionRate}% of challans paid`}
              icon={TrendingUp}
              color={analytics.amountRate >= 80 ? "emerald" : analytics.amountRate >= 50 ? "amber" : "red"}
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Avg. Challan Value"
              value={formatCurrency(analytics.avgChallan)}
              sub="per invoice"
              icon={Wallet} color="indigo"
            />
            <KpiCard
              title="Scholarships Waived"
              value={formatCurrency(analytics.discountWaived)}
              sub="total discount given"
              icon={Award} color="purple"
            />
            <KpiCard
              title="Late Fees Billed"
              value={formatCurrency(analytics.components.lateFee)}
              sub="across the year"
              icon={Clock} color="orange"
            />
            <KpiCard
              title="Best Month"
              value={analytics.bestMonth?.label ?? "—"}
              sub={analytics.bestMonth ? `${formatCurrency(analytics.bestMonth.collected)} collected` : "no data"}
              icon={CheckCircle2} color="emerald"
            />
          </div>

          {/* Period breakdown — Monthly / Quarterly / Yearly */}
          <Card>
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-sm">Collections Breakdown</h3>
                <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                  <TabsList>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <BarChart periods={periods} />

              {/* Detail table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <Th>Period</Th>
                      <Th className="text-right">Generated</Th>
                      <Th className="text-right">Paid</Th>
                      <Th className="text-right">Collected</Th>
                      <Th className="text-right">Expected</Th>
                      <Th className="text-right">Outstanding</Th>
                      <Th className="text-right">Rate</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((p) => {
                      const rate = p.expected > 0 ? Math.round((p.collected / p.expected) * 100) : 0;
                      return (
                        <TableRow key={p.key} className={cn(p.generated === 0 && "opacity-50")}>
                          <TableCell className="font-medium text-sm">{p.label}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{p.generated}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-emerald-600">{p.paid}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-medium">{formatCurrency(p.collected)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(p.expected)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-amber-600">{formatCurrency(p.outstanding)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            <RateBadge rate={rate} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* By class + Fee composition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By class */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" /> Collections by Class
                </h3>
                <div className="space-y-3">
                  {analytics.byClass.map((c) => {
                    const rate = c.expected > 0 ? Math.round((c.collected / c.expected) * 100) : 0;
                    return (
                      <div key={c.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatCurrency(c.collected)} <span className="text-muted-foreground/50">/ {formatCurrency(c.expected)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700",
                                rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-400")}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">{rate}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.paid}/{c.generated} challans paid
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Fee composition */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-muted-foreground" /> Billed Fee Composition
                </h3>
                <FeeComposition components={analytics.components} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Bar chart (dependency-free) ---------- */
function BarChart({ periods }: { periods: PeriodPoint[] }) {
  const max = Math.max(1, ...periods.map((p) => p.expected));
  return (
    <div className="flex items-end gap-2 h-44 px-1">
      {periods.map((p) => {
        const expectedH = (p.expected / max) * 100;
        const collectedH = (p.collected / max) * 100;
        return (
          <div key={p.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="relative w-full flex-1 flex items-end justify-center">
              {/* Expected (track) */}
              <div
                className="absolute bottom-0 w-full max-w-[36px] mx-auto bg-muted rounded-t-md"
                style={{ height: `${expectedH}%` }}
                title={`Expected: ${formatCurrency(p.expected)}`}
              />
              {/* Collected (fill) */}
              <div
                className="relative w-full max-w-[36px] mx-auto bg-primary rounded-t-md transition-all duration-700"
                style={{ height: `${collectedH}%` }}
                title={`Collected: ${formatCurrency(p.collected)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Fee composition list ---------- */
function FeeComposition({ components }: { components: FinanceAnalytics["components"] }) {
  const rows = [
    { label: "Tuition", value: components.tuition, cls: "bg-blue-500" },
    { label: "Stationary", value: components.stationary, cls: "bg-violet-500" },
    { label: "Security", value: components.security, cls: "bg-cyan-500" },
    { label: "Admission", value: components.admission, cls: "bg-indigo-500" },
    { label: "MCS", value: components.mcs, cls: "bg-teal-500" },
    { label: "Late Fees", value: components.lateFee, cls: "bg-orange-500" },
    { label: "Arrears", value: components.arrears, cls: "bg-red-500" },
  ].filter((r) => r.value > 0);

  const total = rows.reduce((s, r) => s + r.value, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No billed fees recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        {rows.map((r) => (
          <div key={r.label} className={r.cls} style={{ width: `${(r.value / total) * 100}%` }} title={`${r.label}: ${formatCurrency(r.value)}`} />
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-sm", r.cls)} />
              {r.label}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatCurrency(r.value)} <span className="text-muted-foreground/50">· {Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm pt-2 border-t font-semibold">
          <span>Total Billed</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small helpers ---------- */
function RateBadge({ rate }: { rate: number }) {
  const cls = rate >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : rate >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", cls)}>{rate}%</span>;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </TableHead>
  );
}

function KpiCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    orange: "text-orange-600 bg-orange-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
    indigo: "text-indigo-600 bg-indigo-50",
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
