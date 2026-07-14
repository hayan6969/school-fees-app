"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  Settings,
  GraduationCap,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
} from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession, isAdminRole } from "@/components/layout/session-context";
import { logout } from "@/app/actions/auth";
import { toast } from "sonner";

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/fees", label: "Fee Challans", icon: Receipt },
  { href: "/finance", label: "Finance", icon: TrendingUp },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/payroll", label: "Payroll", icon: CircleDollarSign, adminOnly: true },
  { href: "/users", label: "Users", icon: ShieldCheck, adminOnly: true },
  { href: "/logs", label: "Activity Logs", icon: ScrollText, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

const ROLE_LABEL: Record<string, string> = {
  principal: "Principal", admin: "Admin", staff: "Staff",
};

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const user = useSession();
  const admin = isAdminRole(user.role);

  return (
    <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
      {navItems
        .filter((item) => !item.adminOnly || admin)
        .map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}

function SidebarLogo() {
  return (
    <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
      <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
        <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sidebar-foreground font-semibold text-sm truncate">School Fees</p>
        <p className="text-sidebar-foreground/50 text-xs truncate">Management System</p>
      </div>
    </div>
  );
}

function UserFooter() {
  const user = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      try {
        await logout();
        router.replace("/login");
        router.refresh();
      } catch {
        toast.error("Could not sign out");
      }
    });
  }

  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 text-sidebar-accent-foreground text-xs font-semibold">
          {user.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sidebar-foreground text-sm font-medium truncate">{user.name}</p>
          <p className="text-sidebar-foreground/50 text-xs truncate">{ROLE_LABEL[user.role] ?? user.role}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          title="Sign out"
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors p-1.5 rounded-md hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <SidebarLogo />
      <NavLinks />
      <UserFooter />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-sm hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 bg-sidebar border-sidebar-border flex flex-col">
        <SidebarLogo />
        <NavLinks onClose={() => setOpen(false)} />
        <UserFooter />
      </SheetContent>
    </Sheet>
  );
}
