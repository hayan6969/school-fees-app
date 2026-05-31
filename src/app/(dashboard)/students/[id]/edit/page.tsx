import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getStudent } from "@/app/actions/students";
import { getGrades } from "@/app/actions/grades";
import { StudentForm } from "@/components/students/student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, grades] = await Promise.all([getStudent(id), getGrades()]);

  if (!student) notFound();

  return (
    <div>
      <Header
        title="Edit Student"
        description={student.registration_number}
      />
      <div className="p-6">
        <StudentForm grades={grades} student={student} />
      </div>
    </div>
  );
}
