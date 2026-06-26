"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login, bootstrapFirstUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function LoginClient({ setup }: { setup: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  function submit(e: { preventDefault(): void }) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (setup) {
          await bootstrapFirstUser({ name, username, pin });
          toast.success("Principal account created");
        } else {
          await login(username, pin);
        }
        router.replace("/dashboard");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Login failed");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">School Fees Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {setup ? "Set up the first Principal account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={submit} className="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
          {setup && (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>No accounts exist yet. This creates the first <strong>Principal</strong> (full access). You can add Admin and Staff accounts afterwards.</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="e.g. Mr. Ahmed Khan" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus={!setup} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" type="password" inputMode="numeric" placeholder="••••" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {setup ? "Create account & sign in" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
