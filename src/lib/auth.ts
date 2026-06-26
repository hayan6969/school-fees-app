import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/lib/supabase/types";

const COOKIE = "sfa_session";
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
};

// ---------- PIN hashing (scrypt) ----------
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 64);
  const original = Buffer.from(hash, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

// ---------- Signed session cookie ----------
function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export async function createSession(userId: string) {
  const value = `${userId}.${sign(userId)}`;
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

async function readSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, sig] = raw.split(".");
  if (!userId || !sig) return null;
  // timing-safe signature check
  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

// ---------- Current user ----------
export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const u = data as unknown as Pick<AppUser, "id" | "name" | "username" | "role" | "is_active">;
  if (!u.is_active) return null;
  return { id: u.id, name: u.name, username: u.username, role: u.role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin" || role === "principal";
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user.role)) throw new Error("You do not have permission to perform this action.");
  return user;
}

// Whether any user exists yet (for first-run bootstrap)
export async function hasAnyUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_users").select("id").limit(1);
  return (data ?? []).length > 0;
}
