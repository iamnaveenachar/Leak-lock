-- Backfill status_changed_at for existing paused/canceled subscriptions
UPDATE public.subscriptions 
SET status_changed_at = updated_at
WHERE (status = 'paused' OR status = 'canceled') 
  AND status_changed_at IS NULL;