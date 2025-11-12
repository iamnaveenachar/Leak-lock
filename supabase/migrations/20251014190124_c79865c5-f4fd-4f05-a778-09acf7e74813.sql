-- Create subscription templates table for storing generic subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  amount_min NUMERIC NOT NULL,
  amount_max NUMERIC NOT NULL,
  billing_cycle TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on subscription templates (public read access)
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read subscription templates
CREATE POLICY "Subscription templates are viewable by everyone" 
ON public.subscription_templates 
FOR SELECT 
USING (true);

-- Insert sample subscription templates
INSERT INTO public.subscription_templates (provider, name, category, amount_min, amount_max, billing_cycle, currency) VALUES
-- Streaming Services
('Netflix', 'Netflix Basic', 'Entertainment', 9.99, 9.99, 'monthly', 'USD'),
('Netflix', 'Netflix Standard', 'Entertainment', 15.49, 15.49, 'monthly', 'USD'),
('Netflix', 'Netflix Premium', 'Entertainment', 19.99, 19.99, 'monthly', 'USD'),
('Spotify', 'Spotify Premium', 'Entertainment', 10.99, 10.99, 'monthly', 'USD'),
('Disney+', 'Disney+ Basic', 'Entertainment', 7.99, 7.99, 'monthly', 'USD'),
('Hulu', 'Hulu Basic', 'Entertainment', 7.99, 7.99, 'monthly', 'USD'),
('Amazon Prime', 'Prime Video', 'Entertainment', 14.99, 14.99, 'monthly', 'USD'),
('HBO Max', 'HBO Max', 'Entertainment', 15.99, 15.99, 'monthly', 'USD'),
('YouTube', 'YouTube Premium', 'Entertainment', 11.99, 11.99, 'monthly', 'USD'),
('Apple TV+', 'Apple TV+', 'Entertainment', 6.99, 6.99, 'monthly', 'USD'),

-- Productivity & Software
('Microsoft', 'Office 365 Personal', 'Productivity', 6.99, 6.99, 'monthly', 'USD'),
('Adobe', 'Creative Cloud', 'Productivity', 54.99, 54.99, 'monthly', 'USD'),
('Dropbox', 'Dropbox Plus', 'Productivity', 11.99, 11.99, 'monthly', 'USD'),
('Google', 'Google One', 'Productivity', 1.99, 9.99, 'monthly', 'USD'),
('Notion', 'Notion Personal Pro', 'Productivity', 8.00, 8.00, 'monthly', 'USD'),

-- Fitness & Health
('Peloton', 'Peloton Membership', 'Fitness', 44.00, 44.00, 'monthly', 'USD'),
('Planet Fitness', 'Planet Fitness Black Card', 'Fitness', 24.99, 24.99, 'monthly', 'USD'),
('MyFitnessPal', 'MyFitnessPal Premium', 'Fitness', 9.99, 9.99, 'monthly', 'USD'),
('Headspace', 'Headspace Plus', 'Health', 12.99, 12.99, 'monthly', 'USD'),

-- News & Education
('New York Times', 'NYT Digital', 'News', 17.00, 17.00, 'monthly', 'USD'),
('Medium', 'Medium Membership', 'Education', 5.00, 5.00, 'monthly', 'USD'),
('Coursera', 'Coursera Plus', 'Education', 59.00, 59.00, 'monthly', 'USD'),
('LinkedIn', 'LinkedIn Premium', 'Professional', 29.99, 29.99, 'monthly', 'USD'),

-- Utilities
('Amazon', 'Amazon Prime', 'Shopping', 14.99, 14.99, 'monthly', 'USD'),
('Audible', 'Audible Plus', 'Entertainment', 7.95, 7.95, 'monthly', 'USD'),
('iCloud', 'iCloud+ 50GB', 'Storage', 0.99, 0.99, 'monthly', 'USD'),
('OneDrive', 'OneDrive 100GB', 'Storage', 1.99, 1.99, 'monthly', 'USD');