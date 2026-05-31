"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Student } from "@/lib/supabase/types";
import { generateRegistrationNumber } from "@/lib/fee-utils";

export async function getStudents(gradeId?: string): Promise<Student[]> {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, grade:grades(*)")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (gradeId) query = query.eq("grade_id", gradeId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Student[];
}

export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*, grade:grades(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as Student;
}

export async function searchStudents(query: string): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*, grade:grades(*)")
    .eq("is_active", true)
    .or(`full_name.ilike.%${query}%,registration_number.ilike.%${query}%`)
    .order("full_name", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as Student[];
}

export async function createStudent(values: {
  full_name: string;
  grade_id: string;
  parent_name?: string;
  parent_phone?: string;
  address?: string;
  scholarship_type: "none" | "half" | "full";
  admission_date?: string;
}) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("students")
    .select("registration_number");
  const existingNumbers = ((existing ?? []) as unknown as { registration_number: string }[]).map(
    (s) => s.registration_number
  );
  const registration_number = generateRegistrationNumber(existingNumbers);

  const { data, error } = await supabase
    .from("students")
    .insert({ ...values, registration_number } as never)
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return data as unknown as Student;
}

export async function updateStudent(
  id: string,
  values: Partial<{
    full_name: string;
    grade_id: string;
    parent_name: string;
    parent_phone: string;
    address: string;
    scholarship_type: "none" | "half" | "full";
    admission_date: string;
    is_active: boolean;
  }>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").update(values as never).eq("id", id);
  if (error) throw error;
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteStudent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ is_active: false } as never)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/students");
  revalidatePath("/dashboard");
}
