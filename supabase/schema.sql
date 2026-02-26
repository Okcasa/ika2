-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'New',
    lead_status TEXT DEFAULT 'new',
    value TEXT DEFAULT '$0',
    scheduled_date TEXT DEFAULT '-',
    last_contact TEXT DEFAULT 'Never',
    color TEXT DEFAULT 'bg-stone-100 text-stone-600',
    history JSONB DEFAULT '[]'::jsonb,
    groups TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_settings table for custom groups and other preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    custom_groups TEXT[] DEFAULT '{"Priority", "Call Back Friday", "Difficult Time"}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_profiles table for display names
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    starter_grant_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create teams and membership
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    invite_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'editor',
    invite_code TEXT,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Users can request to join a team (shown in the floating button panel)
CREATE TABLE IF NOT EXISTS public.team_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (team_id, user_id)
);

-- Lead activity log with actor attribution
CREATE TABLE IF NOT EXISTS public.lead_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Marketplace inventory for uploaded leads
CREATE TABLE IF NOT EXISTS public.marketplace_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    business_name TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    business_type TEXT,
    status TEXT NOT NULL DEFAULT 'available', -- available | assigned | sold
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dispensed leads (per-user working set)
CREATE TABLE IF NOT EXISTS public.dispensed_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, lead_id)
);

-- Signup grants (prevents abuse across accounts)
CREATE TABLE IF NOT EXISTS public.signup_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ip_hash TEXT NOT NULL,
    lead_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id)
);

-- Tracks which completed Paddle transactions already dispensed leads
CREATE TABLE IF NOT EXISTS public.paddle_fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lead_count INTEGER NOT NULL DEFAULT 0,
    package_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Paddle customer/user mappings (used by payment fulfillment)
CREATE TABLE IF NOT EXISTS public.paddle_customers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_id TEXT,
    paddle_customer_id TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Paddle transactions synchronized from webhook events
CREATE TABLE IF NOT EXISTS public.paddle_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS signup_grants_ip_hash_idx ON public.signup_grants(ip_hash);
CREATE INDEX IF NOT EXISTS signup_grants_created_at_idx ON public.signup_grants(created_at);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_customers'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS paddle_customers_user_id_idx ON public.paddle_customers(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS paddle_customers_customer_id_idx ON public.paddle_customers(customer_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS paddle_customers_paddle_customer_id_idx ON public.paddle_customers(paddle_customer_id)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_transactions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS paddle_transactions_customer_id_idx ON public.paddle_transactions(customer_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS paddle_transactions_status_idx ON public.paddle_transactions(status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS paddle_transactions_updated_at_idx ON public.paddle_transactions(updated_at)';
  END IF;
END;
$$;

-- Leads: add team linkage and timestamps
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS meeting_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS corrected_business_name TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS corrected_phone_number TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS corrected_website TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS processing_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS leads_user_external_id_uq
  ON public.leads(user_id, external_id);

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_invite_code_check;
CREATE UNIQUE INDEX IF NOT EXISTS teams_invite_code_uq
  ON public.teams(invite_code) WHERE invite_code IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_invite_code_check'
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_invite_code_check
      CHECK (invite_code IS NULL OR invite_code ~ '^[0-9]{5}$');
  END IF;
END;
$$;

DO $$
DECLARE
  t RECORD;
  candidate TEXT;
BEGIN
  FOR t IN SELECT id FROM public.teams WHERE invite_code IS NULL LOOP
    LOOP
      candidate := lpad((floor(random() * 100000))::int::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE invite_code = candidate);
    END LOOP;
    UPDATE public.teams SET invite_code = candidate WHERE id = t.id;
  END LOOP;
END;
$$;

-- Team role migration: keep legacy `member` rows compatible but persist `editor` going forward.
UPDATE public.team_members SET role = 'editor' WHERE role = 'member';
UPDATE public.team_invites SET role = 'editor' WHERE role = 'member';
ALTER TABLE public.team_members ALTER COLUMN role SET DEFAULT 'editor';
ALTER TABLE public.team_invites ALTER COLUMN role SET DEFAULT 'editor';

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;
ALTER TABLE public.team_invites DROP CONSTRAINT IF EXISTS team_invites_code_check;
CREATE UNIQUE INDEX IF NOT EXISTS team_invites_invite_code_uq ON public.team_invites(invite_code) WHERE invite_code IS NOT NULL;

-- Enforce role values for members/invites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_members_role_check'
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_role_check
      CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invites_role_check'
  ) THEN
    ALTER TABLE public.team_invites
      ADD CONSTRAINT team_invites_role_check
      CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_invites_code_check'
  ) THEN
    ALTER TABLE public.team_invites
      ADD CONSTRAINT team_invites_code_check
      CHECK (invite_code IS NULL OR invite_code ~ '^[0-9]{5}$');
  END IF;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispensed_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paddle_fulfillments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_customers'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'ALTER TABLE public.paddle_customers ENABLE ROW LEVEL SECURITY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_transactions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'ALTER TABLE public.paddle_transactions ENABLE ROW LEVEL SECURITY';
  END IF;
END;
$$;

-- helper to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_uuid AND tm.user_id = auth.uid()
  );
$$;

-- Drop policies if they already exist (re-runnable schema)
DROP POLICY IF EXISTS "Users can manage their own leads" ON public.leads;
DROP POLICY IF EXISTS "Team members can access team leads" ON public.leads;
DROP POLICY IF EXISTS "Users can manage their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Owners manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Owners manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners manage invites" ON public.team_invites;
DROP POLICY IF EXISTS "Team members can view requests" ON public.team_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.team_requests;
DROP POLICY IF EXISTS "Owners manage requests" ON public.team_requests;
DROP POLICY IF EXISTS "Team members can read lead logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Owners can write lead logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Users can read their own lead logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Users can write their own lead logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Team members can delete lead logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Users can delete their own lead logs" ON public.lead_logs;
DROP POLICY IF EXISTS "Owners manage marketplace leads" ON public.marketplace_leads;
DROP POLICY IF EXISTS "Users manage dispensed leads" ON public.dispensed_leads;
DROP POLICY IF EXISTS "Users manage signup grants" ON public.signup_grants;
DROP POLICY IF EXISTS "Users manage paddle fulfillments" ON public.paddle_fulfillments;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_customers'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users manage paddle customers" ON public.paddle_customers';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_transactions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users read paddle transactions" ON public.paddle_transactions';
  END IF;
END;
$$;

-- Create RLS Policies
-- Leads: users can only see and modify their own leads
CREATE POLICY "Users can manage their own leads"
    ON public.leads
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Leads: allow team members if lead is assigned to a team
CREATE POLICY "Team members can access team leads"
    ON public.leads
    FOR ALL
    USING (team_id IS NOT NULL AND public.is_team_member(team_id))
    WITH CHECK (team_id IS NOT NULL AND public.is_team_member(team_id));

-- User Credits: users can only see and modify their own credits
CREATE POLICY "Users can manage their own credits"
    ON public.user_credits
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User Settings: users can only see and modify their own settings
CREATE POLICY "Users can manage their own settings"
    ON public.user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User Profiles: users can only see and modify their own profile
CREATE POLICY "Users can manage their own profile"
    ON public.user_profiles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Teams: owners manage
CREATE POLICY "Owners manage their teams"
    ON public.teams
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Team members: members can view, owners manage
CREATE POLICY "Members can view team membership"
    ON public.team_members
    FOR SELECT
    USING (public.is_team_member(team_id));

CREATE POLICY "Owners manage team members"
    ON public.team_members
    FOR ALL
    USING (auth.uid() = (SELECT owner_id FROM public.teams t WHERE t.id = team_id))
    WITH CHECK (auth.uid() = (SELECT owner_id FROM public.teams t WHERE t.id = team_id));

-- Team invites: owners manage
CREATE POLICY "Owners manage invites"
    ON public.team_invites
    FOR ALL
    USING (auth.uid() = (SELECT owner_id FROM public.teams t WHERE t.id = team_id))
    WITH CHECK (auth.uid() = (SELECT owner_id FROM public.teams t WHERE t.id = team_id));

-- Team requests: members can view, users can insert, owners can update
CREATE POLICY "Team members can view requests"
    ON public.team_requests
    FOR SELECT
    USING (public.is_team_member(team_id));

CREATE POLICY "Users can create their own requests"
    ON public.team_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners manage requests"
    ON public.team_requests
    FOR UPDATE
    USING (auth.uid() = (SELECT owner_id FROM public.teams t WHERE t.id = team_id))
    WITH CHECK (auth.uid() = (SELECT owner_id FROM public.teams t WHERE t.id = team_id));

-- Lead logs: team members can read/write
CREATE POLICY "Team members can read lead logs"
    ON public.lead_logs
    FOR SELECT
    USING (
      (SELECT team_id FROM public.leads l WHERE l.id = lead_id) IS NOT NULL
      AND public.is_team_member((SELECT team_id FROM public.leads l WHERE l.id = lead_id))
    );

CREATE POLICY "Owners can write lead logs"
    ON public.lead_logs
    FOR INSERT
    WITH CHECK (
      (SELECT team_id FROM public.leads l WHERE l.id = lead_id) IS NOT NULL
      AND public.is_team_member((SELECT team_id FROM public.leads l WHERE l.id = lead_id))
    );

-- Lead logs: personal leads (no team) can be read/written by owner
CREATE POLICY "Users can read their own lead logs"
    ON public.lead_logs
    FOR SELECT
    USING (
      (SELECT team_id FROM public.leads l WHERE l.id = lead_id) IS NULL
      AND auth.uid() = (SELECT user_id FROM public.leads l WHERE l.id = lead_id)
    );

CREATE POLICY "Users can write their own lead logs"
    ON public.lead_logs
    FOR INSERT
    WITH CHECK (
      (SELECT team_id FROM public.leads l WHERE l.id = lead_id) IS NULL
      AND auth.uid() = (SELECT user_id FROM public.leads l WHERE l.id = lead_id)
    );

-- Lead logs: allow deletion for team members / personal lead owners
CREATE POLICY "Team members can delete lead logs"
    ON public.lead_logs
    FOR DELETE
    USING (
      (SELECT team_id FROM public.leads l WHERE l.id = lead_id) IS NOT NULL
      AND public.is_team_member((SELECT team_id FROM public.leads l WHERE l.id = lead_id))
    );

CREATE POLICY "Users can delete their own lead logs"
    ON public.lead_logs
    FOR DELETE
    USING (
      (SELECT team_id FROM public.leads l WHERE l.id = lead_id) IS NULL
      AND auth.uid() = (SELECT user_id FROM public.leads l WHERE l.id = lead_id)
    );

-- Marketplace leads: owners manage their uploads
CREATE POLICY "Owners manage marketplace leads"
    ON public.marketplace_leads
    FOR ALL
    USING (auth.uid() = uploaded_by)
    WITH CHECK (auth.uid() = uploaded_by);

-- Dispensed leads: users manage their own
CREATE POLICY "Users manage dispensed leads"
    ON public.dispensed_leads
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Signup grants: users can view their own (writes handled server-side)
CREATE POLICY "Users manage signup grants"
    ON public.signup_grants
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users manage paddle fulfillments"
    ON public.paddle_fulfillments
    FOR SELECT
    USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_customers'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE '
      CREATE POLICY "Users manage paddle customers"
      ON public.paddle_customers
      FOR SELECT
      USING (auth.uid() = user_id)
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_transactions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE '
      CREATE POLICY "Users read paddle transactions"
      ON public.paddle_transactions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.paddle_customers pc
          WHERE pc.user_id = auth.uid()
            AND (
              pc.id = paddle_transactions.customer_id
              OR pc.customer_id = paddle_transactions.customer_id
              OR pc.paddle_customer_id = paddle_transactions.customer_id
            )
        )
      )
    ';
  END IF;
END;
$$;

-- Functions and Triggers to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_customers'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_paddle_customers_updated_at ON public.paddle_customers';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_transactions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_paddle_transactions_updated_at ON public.paddle_transactions';
  END IF;
END;
$$;

CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_customers'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE '
      CREATE TRIGGER update_paddle_customers_updated_at
      BEFORE UPDATE ON public.paddle_customers
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column()
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'paddle_transactions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE '
      CREATE TRIGGER update_paddle_transactions_updated_at
      BEFORE UPDATE ON public.paddle_transactions
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column()
    ';
  END IF;
END;
$$;
