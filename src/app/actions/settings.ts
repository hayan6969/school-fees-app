"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type SettingRow = { key: string; value: string };

export async function getSettings(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("*");
  if (error) throw error;
  return Object.fromEntries(
    ((data ?? []) as unknown as SettingRow[]).map((s) => [s.key, s.value])
  );
}

export async function updateSetting(key: string, value: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value } as never, { onConflict: "key" });
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateSettings(settings: Record<string, string>) {
  const supabase = await createClient();
  const upserts = Object.entries(settings).map(([key, value]) => ({ key, value }));
  const { error } = await supabase
    .from("settings")
    .upsert(upserts as never, { onConflict: "key" });
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
