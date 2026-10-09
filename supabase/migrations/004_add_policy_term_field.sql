-- Migration 004: Add policy_term_years to policies table
-- Separates Policy Term (coverage/maturity duration) from Premium Paying Term (duration_years)

ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS policy_term_years INTEGER DEFAULT NULL CHECK (policy_term_years IS NULL OR policy_term_years > 0);

