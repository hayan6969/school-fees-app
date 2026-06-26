"use server";

import { createClient } from "@/lib/supabase/server";
import {
  hashPin, verifyPin, createSession, destroySession,
  getCurrentUser, hasAnyUser, type SessionUser,
} from "@/lib/auth";
import { logAction } from "@/app/actions/audit";
import type { AppUser } from "@/lib/supabase/types";

export async function needsSetup(): Promise<boolean> {
  return !(await hasAnyUser());
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

/** First-run: create the initial Principal account (only allowed when no users exist). */
export async function bootstrapFirstUser(values: { name: string; username: string; pin: string }) {
  if (await hasAnyUser()) throw new Error("Setup has already been completed.");
  if (!values.name.trim()) throw new Error("Name is required.");
  if (!/^[a-zA-Z0-9_.-]{3,}$/.test(values.username.trim())) throw new Error("Username must be at least 3 characters (letters, numbers, . _ -).");
  if (!/^\d{4,}$/.test(values.pin)) throw new Error("PIN must be at least 4 digits.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      name: values.name.trim(),
      username: values.username.trim().toLowerCase(),
      role: "principal",
      pin_hash: hashPin(values.pin),
    } as never)
    .select("id, name, username, role")
    .single();
  if (error) throw error;
  const u = data as unknown as SessionUser;
  await createSession(u.id);
  await logAction("Auth", "Created first Principal account", `@${u.username}`, u);
}

export async function login(username: string, pin: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  const user = data as unknown as AppUser | null;
  if (!user || !user.is_active || !verifyPin(pin, user.pin_hash)) {
    throw new Error("Invalid username or PIN.");
  }
  await createSession(user.id);
  await logAction("Auth", "Logged in", `@${user.username}`, {
    id: user.id, name: user.name, username: user.username, role: user.role,
  });
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await logAction("Auth", "Logged out", `@${user.username}`, user);
  await destroySession();
}
