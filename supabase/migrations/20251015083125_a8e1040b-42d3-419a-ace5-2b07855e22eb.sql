-- Add source column to subscriptions table to track manual vs auto-detected entries
ALTER TABLE public.subscriptions 
ADD COLUMN source text NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual'));