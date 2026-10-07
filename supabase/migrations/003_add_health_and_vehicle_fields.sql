-- Migration 003: Add TPA Name and Covered Members columns to policies table
-- Run this in your Supabase SQL Editor if using Health Insurance TPA / Family Members:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Ensure sum_assured column exists (stores Sum Assured, Health Coverage, and Vehicle IDV)
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS sum_assured NUMERIC DEFAULT NULL CHECK (sum_assured IS NULL OR sum_assured >= 0);

-- 2. Add tpa_name column for Health Insurance TPA details
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS tpa_name TEXT DEFAULT NULL;

-- 3. Add covered_members column for Health Insurance family floater plans
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS covered_members JSONB DEFAULT '[]'::jsonb;

-- 4. Add index on sum_assured
CREATE INDEX IF NOT EXISTS idx_policies_sum_assured ON public.policies(sum_assured);
