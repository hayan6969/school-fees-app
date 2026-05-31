import { Header } from "@/components/layout/header";
import { getGrades } from "@/app/actions/grades";
import { StudentForm } from "@/components/students/student-form";

export default async function NewStudentPage() {
  const grades = await getGrades();

  return (
    <div>
      <Header title="Add Student" description="Register a new student" />
      <div className="p-6">
        <StudentForm grades={grades} />
      </div>
    </div>
  );
}
