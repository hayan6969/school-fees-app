import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getStudent } from "@/app/actions/students";
import { getStudentChallans } from "@/app/actions/fees";
import { StudentDetailClient } from "./student-detail-client";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, challans] = await Promise.all([
    getStudent(id),
    getStudentChallans(id),
  ]);

  if (!student) notFound();

  return (
    <div>
      <Header
        title={student.full_name}
        description={`${student.registration_number} · ${student.grade?.name ?? "No Class"}`}
      >
        <Link
          href={`/students/${id}/edit`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </Header>
      <StudentDetailClient student={student} challans={challans} />
    </div>
  );
}
