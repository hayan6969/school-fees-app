-- =============================================
-- Migration: Role-based access, audit logs, expense approval
-- Run this in your Supabase SQL Editor. Idempotent.
-- =============================================
-- NOTE: Auth is enforced at the app layer (signed session cookie + role checks
-- in server actions), not via Supabase Auth/RLS. RLS stays off to match the
-- rest of this app (anon key access). The app's server actions gate every action.

-- App users (Principal / Admin / Staff)
create table if not exists app_users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  username text not null unique,
  role text not null default 'staff' check (role in ('principal', 'admin', 'staff')),
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table app_users disable row level security;

drop trigger if exists update_app_users_updated_at on app_users;
create trigger update_app_users_updated_at before update on app_users
  for each row execute function update_updated_at_column();

-- Audit log — who did what, by category
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete set null,
  user_name text,
  role text,
  category text not null,
  action text not null,
  details text,
  created_at timestamptz default now()
);
create index if not exists audit_logs_created_idx on audit_logs(created_at desc);
create index if not exists audit_logs_category_idx on audit_logs(category);
alter table audit_logs disable row level security;

-- Expense approval workflow
alter table expenses
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists created_by uuid references app_users(id) on delete set null,
  add column if not exists created_by_name text,
  add column if not exists approved_by_name text,
  add column if not exists approved_at timestamptz,
  add column if not exists reject_reason text;

create index if not exists expenses_status_idx on expenses(status);
