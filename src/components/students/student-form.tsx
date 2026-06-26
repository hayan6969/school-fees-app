"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Grade, Student } from "@/lib/supabase/types";
import { createStudent, updateStudent } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/fee-utils";

interface StudentFormProps {
  grades: Grade[];
  student?: Student;
}

export function StudentForm({ grades, student }: StudentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: student?.full_name ?? "",
    grade_id: student?.grade_id ?? "",
    parent_name: student?.parent_name ?? "",
    parent_phone: student?.parent_phone ?? "",
    address: student?.address ?? "",
    scholarship_type: student?.scholarship_type ?? "none",
    admission_date: student?.admission_date ?? "",
    security_fee: student?.security_fee != null ? String(student.security_fee) : "",
  });

  const set = (key: keyof typeof form, value: string | null) =>
    setForm((prev) => ({ ...prev, [key]: value ?? "" }));

  const selectedGrade = grades.find((g) => g.id === form.grade_id);
  const baseFee = selectedGrade?.monthly_fee ?? 0;
  const effectiveFee =
    form.scholarship_type === "full"
      ? 0
      : form.scholarship_type === "half"
      ? Math.floor(baseFee / 2)
      : baseFee;

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Student name is required"); return; }
    if (!form.grade_id) { toast.error("Please select a class"); return; }

    setLoading(true);
    try {
      if (student) {
        await updateStudent(student.id, {
          ...form,
          scholarship_type: form.scholarship_type as "none" | "half" | "full",
          admission_date: form.admission_date || undefined,
          security_fee: parseFloat(form.security_fee) || 0,
        });
        toast.success("Student updated");
        router.push(`/students/${student.id}`);
      } else {
        const s = await createStudent({
          ...form,
          scholarship_type: form.scholarship_type as "none" | "half" | "full",
          admission_date: form.admission_date || undefined,
          security_fee: parseFloat(form.security_fee) || 0,
        });
        toast.success("Student added successfully");
        router.push(`/students/${s.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Student info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="full_name"
              placeholder="e.g. Muhammad Ali Khan"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="grade_id">Class / Grade <span className="text-destructive">*</span></Label>
              <Select value={form.grade_id} onValueChange={(v) => set("grade_id", v ?? "")}>
                <SelectTrigger id="grade_id">
                  <SelectValue placeholder="Select a class…" />
                </SelectTrigger>
                <SelectContent>
                  {grades.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No grades — add them in Settings
                    </SelectItem>
                  ) : (
                    grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} — {formatCurrency(g.monthly_fee)}/mo
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admission_date">Admission Date</Label>
              <Input
                id="admission_date"
                type="date"
                value={form.admission_date}
                onChange={(e) => set("admission_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scholarship_type">Scholarship / Fee Waiver</Label>
            <Select
              value={form.scholarship_type}
              onValueChange={(v) => set("scholarship_type", v ?? "none")}
            >
              <SelectTrigger id="scholarship_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Scholarship — Full Fee</SelectItem>
                <SelectItem value="half">Half Scholarship — 50% off tuition</SelectItem>
                <SelectItem value="full">Full Scholarship — 100% waiver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="security_fee">Security Fee / Deposit <span className="text-muted-foreground text-xs">(refundable, collected at admission)</span></Label>
            <Input
              id="security_fee"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.security_fee}
              onChange={(e) => set("security_fee", e.target.value)}
            />
          </div>

          {/* Fee preview */}
          {form.grade_id && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border">
              <span className="text-sm text-muted-foreground">Monthly fee for this student</span>
              <div className="text-right">
                {form.scholarship_type !== "none" && (
                  <p className="text-xs text-muted-foreground line-through">{formatCurrency(baseFee)}</p>
                )}
                <p className="font-semibold text-sm">
                  {form.scholarship_type === "full" ? "Free" : formatCurrency(effectiveFee)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parent info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Parent / Guardian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="parent_name">Parent Name</Label>
              <Input
                id="parent_name"
                placeholder="Parent or guardian name"
                value={form.parent_name}
                onChange={(e) => set("parent_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parent_phone">Phone Number</Label>
              <Input
                id="parent_phone"
                placeholder="03XX-XXXXXXX"
                value={form.parent_phone}
                onChange={(e) => set("parent_phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Home address (optional)"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {student ? "Save Changes" : "Add Student"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
