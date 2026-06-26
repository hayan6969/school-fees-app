"use client";

import { useState, useMemo } from "react";
import type { AuditLog } from "@/lib/supabase/types";
import type { PublicUser } from "@/app/actions/users";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Search, ScrollText } from "lucide-react";

const CATEGORIES = ["Auth", "Students", "Fees", "Expenses", "Users", "Classes", "Settings"];
const CAT_CLS: Record<string, string> = {
  Auth: "bg-slate-50 text-slate-700 border-slate-200",
  Students: "bg-blue-50 text-blue-700 border-blue-200",
  Fees: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Expenses: "bg-amber-50 text-amber-700 border-amber-200",
  Users: "bg-purple-50 text-purple-700 border-purple-200",
  Classes: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Settings: "bg-gray-50 text-gray-700 border-gray-200",
};

export function LogsClient({ logs, users }: { logs: AuditLog[]; users: PublicUser[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [userId, setUserId] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const matchCat = category === "all" || l.category === category;
      const matchUser = userId === "all" || l.user_id === userId;
      const matchSearch = !q
        || l.action.toLowerCase().includes(q)
        || (l.details ?? "").toLowerCase().includes(q)
        || (l.user_name ?? "").toLowerCase().includes(q);
      return matchCat && matchUser && matchSearch;
    });
  }, [logs, search, category, userId]);

  // counts per category (for the quick chips)
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of logs) m[l.category] = (m[l.category] ?? 0) + 1;
    return m;
  }, [logs]);

  return (
    <div className="p-6 space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9 w-56" placeholder="Search action, details, user…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}{counts[c] ? ` (${counts[c]})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userId} onValueChange={(v) => setUserId(v ?? "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} of {logs.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <ScrollText className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground">No activity{logs.length > 0 ? " matches the filters" : " logged yet"}</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <Th>When</Th><Th>Account</Th><Th>Category</Th><Th>Action</Th><Th>Details</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/20">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">{l.user_name ?? "System"}</span>
                    {l.role && <span className="text-xs text-muted-foreground ml-1.5 capitalize">{l.role}</span>}
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", CAT_CLS[l.category] ?? "bg-gray-50 text-gray-700 border-gray-200")}>
                      {l.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{l.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">{l.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</TableHead>;
}
