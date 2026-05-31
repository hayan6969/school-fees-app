"use client";

import { MobileSidebar } from "./sidebar";

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <div>
          <h1 className="font-semibold text-lg leading-none">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
