-- =============================================
-- Migration: Payroll (employees: teachers & staff, monthly payslips)
-- Run this in your Supabase SQL Editor. Idempotent.
-- =============================================

-- Ensure the timestamp helper exists (defensive)
create or replace function update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- Employees (teachers & staff) with a monthly pay
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('teacher', 'staff')),
  designation text,                       -- subject (teacher) / role (staff)
  phone text,
  monthly_pay numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists employees_type_idx on employees(type);
alter table employees disable row level security;

drop trigger if exists update_employees_updated_at on employees;
create trigger update_employees_updated_at before update on employees
  for each row execute function update_updated_at_column();

-- Monthly payroll records (one per employee per month)
create table if not exists payrolls (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null,
  amount numeric(12,2) not null default 0,   -- snapshot of pay (editable)
  is_paid boolean not null default false,
  paid_at timestamptz,
  paid_by text,
  expense_id uuid references expenses(id) on delete set null,  -- linked Salaries expense
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (employee_id, month, year)
);
create index if not exists payrolls_month_year_idx on payrolls(month, year);
create index if not exists payrolls_employee_idx on payrolls(employee_id);
alter table payrolls disable row level security;

drop trigger if exists update_payrolls_updated_at on payrolls;
create trigger update_payrolls_updated_at before update on payrolls
  for each row execute function update_updated_at_column();

-- Make sure a Salaries expense category exists for paid payrolls
insert into expense_categories (name) values ('Salaries') on conflict (name) do nothing;

notify pgrst, 'reload schema';
