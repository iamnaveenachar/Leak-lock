-- Add new fields to subscriptions table for savings tracking and verification
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS savings_month_to_date numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS savings_lifetime numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS saving_events jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS first_paid_month date,
ADD COLUMN IF NOT EXISTS paid_months_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_change jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS amazon_nudge_dismissed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS missed_charges integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reminders jsonb DEFAULT '{"enabled": false, "per_item_Tn": [3], "per_item_daily_from_T": null}'::jsonb,
ADD COLUMN IF NOT EXISTS last_payment_date date,
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone;