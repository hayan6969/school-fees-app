-- =============================================
-- Migration: Student lifecycle (promote/demote/retain/expel/withdraw)
-- Run this in your Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- =============================================

alter table students
  add column if not exists status text not null default 'active'
    check (status in ('active', 'expelled', 'withdrawn')),
  add column if not exists exit_reason text,
  add column if not exists exit_date date;

-- Keep existing rows consistent: anyone already deactivated counts as withdrawn.
update students
  set status = 'withdrawn'
  where is_active = false and status = 'active';

create index if not exists students_status_idx on students(status);
