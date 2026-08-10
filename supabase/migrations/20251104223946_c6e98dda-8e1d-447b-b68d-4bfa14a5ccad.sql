-- Add tax_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id text;