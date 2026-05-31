"use client";

import Link from "next/link";
import type { Student, FeeChallan } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  getChallanStatus,
  getMonthName,
  getStatusLabel,
} from "@/lib/fee-utils";
import { Receipt, Phone, MapPin, User, Calendar, GraduationCap, Award } from "lucide-react";

const SCHOLARSHIP_MAP = {
  none: { label: "No Scholarship", color: "secondary" as const },
  half: { label: "Half Scholarship", color: "outline" as const },
  full: { label: "Full Scholarship", color: "default" as const },
};

interface StudentDetailClientProps {
  student: Student;
  challans: FeeChallan[];
}

export function StudentDetailClient({ student, challans }: StudentDetailClientProps) {
  const scholarship = SCHOLARSHIP_MAP[student.scholarship_type];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {student.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-base">{student.full_name}</CardTitle>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {student.registration_number}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={scholarship.color}>{scholarship.label}</Badge>

              <Separator />

              <InfoRow
                icon={GraduationCap}
                label="Class"
                value={student.grade?.name ?? "Not assigned"}
              />
              {student.parent_name && (
                <InfoRow icon={User} label="Parent" value={student.parent_name} />
              )}
              {student.parent_phone && (
                <InfoRow icon={Phone} label="Phone" value={student.parent_phone} />
              )}
              {student.address && (
                <InfoRow icon={MapPin} label="Address" value={student.address} />
              )}
              {student.admission_date && (
                <InfoRow
                  icon={Calendar}
                  label="Admitted"
                  value={new Date(student.admission_date).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fee History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Fee Challans
              </CardTitle>
              <span className="text-xs text-muted-foreground">{challans.length} total</span>
            </CardHeader>
            <CardContent>
              {challans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No challans generated yet
                </p>
              ) : (
                <div className="space-y-2">
                  {challans.map((challan) => (
                    <ChallanRow key={challan.id} challan={challan} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function ChallanRow({ challan }: { challan: FeeChallan }) {
  const status = getChallanStatus(challan);
  const statusLabel = getStatusLabel(status);

  const badgeClass = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    unpaid: "bg-amber-50 text-amber-700 border-amber-200",
    late_fee: "bg-orange-50 text-orange-700 border-orange-200",
    arrears: "bg-red-50 text-red-700 border-red-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
  }[status];

  return (
    <Link href={`/fees/${challan.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer">
        <div>
          <p className="text-sm font-medium">
            {getMonthName(challan.month)} {challan.year}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Due: {new Date(challan.due_date).toLocaleDateString("en-PK", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatCurrency(challan.total)}</p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded border inline-block mt-0.5 ${badgeClass}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
