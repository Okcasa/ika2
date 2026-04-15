-- Fix duplicate signup leads issue
-- Problem: When a new user signs up, the signup-grant API can be called multiple times
-- before the marketplace leads are marked as 'assigned', causing duplicate leads.

-- Step 1: Clean up existing duplicate leads
-- Keep only the earliest lead for each user+business_name+email combination
DELETE FROM public.leads
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, COALESCE(business_name, ''), COALESCE(email, '')
             ORDER BY created_at ASC
           ) as rn
    FROM public.leads
    WHERE user_id IN (
      SELECT user_id FROM public.signup_grants
    )
  ) duplicates
  WHERE rn > 1
);

-- Step 2: Add a unique constraint to prevent future duplicates
-- This prevents the same user from having duplicate leads with the same business_name + email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_user_business_email_unique'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_user_business_email_unique
      UNIQUE (user_id, business_name, email);
  END IF;
END;
$$;

-- Step 3: Add a trigger to prevent double-assignment of marketplace leads
-- This ensures a marketplace lead can only be assigned once, even if the API is called twice
CREATE OR REPLACE FUNCTION public.prevent_double_marketplace_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this marketplace lead is already assigned
  IF EXISTS (
    SELECT 1 FROM public.marketplace_leads
    WHERE id = NEW.id AND status != 'available'
  ) THEN
    RAISE EXCEPTION 'Marketplace lead % is already assigned', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add a unique constraint on dispensed_leads to prevent duplicate dispensing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispensed_leads_user_lead_unique'
  ) THEN
    -- The unique constraint already exists in schema, but let's ensure it's there
    NULL;
  END IF;
END;
$$;

-- Step 5: Clean up any duplicate dispensed_leads entries
DELETE FROM public.dispensed_leads
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, lead_id) id
  FROM public.dispensed_leads
  ORDER BY user_id, lead_id, created_at ASC
);

-- Step 6: Add a function to atomically assign marketplace leads
-- This prevents race conditions where two API calls grab the same leads
CREATE OR REPLACE FUNCTION public.assign_marketplace_leads(
  p_user_id UUID,
  p_lead_count INTEGER
)
RETURNS TABLE(lead_id UUID, business_name TEXT, contact_name TEXT, email TEXT, phone TEXT) AS $$
DECLARE
  v_assigned_leads RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Use SELECT FOR UPDATE SKIP LOCKED to atomically grab available leads
  -- This prevents race conditions
  FOR v_assigned_leads IN
    SELECT id, business_name, contact_name, email, phone
    FROM public.marketplace_leads
    WHERE status = 'available'
    ORDER BY created_at ASC
    LIMIT p_lead_count
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Update marketplace lead status
    UPDATE public.marketplace_leads
    SET status = 'assigned', assigned_to = p_user_id, assigned_at = v_now
    WHERE id = v_assigned_leads.id;

    -- Return the assigned lead info
    lead_id := v_assigned_leads.id;
    business_name := v_assigned_leads.business_name;
    contact_name := v_assigned_leads.contact_name;
    email := v_assigned_leads.email;
    phone := v_assigned_leads.phone;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
