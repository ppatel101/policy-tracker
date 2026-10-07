-- Migration 002: Add sum_assured column to policies table
-- Safe for running on existing installations

ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS sum_assured NUMERIC DEFAULT NULL CHECK (sum_assured IS NULL OR sum_assured >= 0);

CREATE INDEX IF NOT EXISTS idx_policies_sum_assured ON public.policies(sum_assured);
