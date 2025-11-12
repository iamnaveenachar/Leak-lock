-- Add support for "expired" status in subscriptions table
-- Add new fields for tracking expired subscriptions

-- Add expired_since timestamp column
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS expired_since timestamp with time zone;

-- Add retry_window_days integer column (default 7 days)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS retry_window_days integer DEFAULT 7;

-- Add reactivation_watch boolean column
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS reactivation_watch boolean DEFAULT false;

-- Add count_expired_as_savings boolean column (hard default false)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS count_expired_as_savings boolean DEFAULT false;

-- Update status column comment to include expired
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: active, paused, canceled, or expired';

-- Create index on expired_since for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_expired_since 
ON public.subscriptions(expired_since) 
WHERE expired_since IS NOT NULL;