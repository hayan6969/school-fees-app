-- =============================================
-- Migration: Sibling (brother/sister) discount — 20% off tuition
-- Run this in your Supabase SQL Editor. Idempotent.
-- =============================================
-- Adds a 'sibling' scholarship type and links to the already-enrolled sibling.

alter table students drop constraint if exists students_scholarship_type_check;
alter table students add constraint students_scholarship_type_check
  check (scholarship_type in ('none', 'half', 'full', 'sibling'));

alter table students
  add column if not exists sibling_id uuid references students(id) on delete set null;

notify pgrst, 'reload schema';
