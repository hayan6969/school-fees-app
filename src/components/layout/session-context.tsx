"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/lib/supabase/types";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
};

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "principal";
}
