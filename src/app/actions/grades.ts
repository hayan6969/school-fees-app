"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Grade } from "@/lib/supabase/types";

export async function getGrades(): Promise<Grade[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Grade[];
}

export async function createGrade(values: {
  name: string;
  monthly_fee: number;
  display_order: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("grades").insert(values as never);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/students");
}

export async function updateGrade(
  id: string,
  values: { name?: string; monthly_fee?: number; display_order?: number }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("grades").update(values as never).eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/fees");
}

export async function deleteGrade(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/students");
}
