-- =============================================
-- Migration: Per-student security deposit (treasury)
-- Run this in your Supabase SQL Editor. Idempotent.
-- =============================================
-- A refundable security fee collected at admission, held against each student.
-- The "security treasury" is the sum of this for active students; on
-- withdrawal/expulsion the student becomes inactive and the deposit leaves it.

alter table students
  add column if not exists security_fee numeric(12,2) not null default 0;
