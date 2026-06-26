-- =============================================
-- Migration: Expenses & School Treasury
-- Run this in your Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- =============================================

-- Expense categories (managed list; add your own)
create table if not exists expense_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into expense_categories (name) values
  ('Salaries'),
  ('Utilities'),
  ('Rent'),
  ('Maintenance'),
  ('Supplies'),
  ('Transport'),
  ('Events'),
  ('Miscellaneous')
on conflict (name) do nothing;

-- Expenses (each one deducts from the treasury)
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid references expense_categories(id) on delete set null,
  expense_date date not null default current_date,
  payment_method text,          -- Cash, Bank Transfer, Cheque, Card, Other
  paid_to text,                 -- vendor / payee
  notes text,
  recorded_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists expenses_date_idx on expenses(expense_date);
create index if not exists expenses_category_idx on expenses(category_id);

-- Opening treasury balance (cash on hand before the system started)
insert into settings (key, value) values ('opening_balance', '0')
on conflict (key) do nothing;

-- updated_at trigger (function already exists from schema.sql)
drop trigger if exists update_expenses_updated_at on expenses;
create trigger update_expenses_updated_at before update on expenses
  for each row execute function update_updated_at_column();

-- Row level security
-- This app talks to Supabase with the anon key (no login), matching the other
-- tables which are not RLS-restricted for anon. Keep RLS off so the app can
-- read categories and read/write expenses. (Add auth + policies if you later
-- introduce logins.)
alter table expense_categories disable row level security;
alter table expenses disable row level security;
