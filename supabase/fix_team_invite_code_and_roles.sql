-- Idempotent patch: team invite roles + team 5-digit invite codes

-- 1) Normalize legacy member role to editor
UPDATE public.team_members SET role = 'editor' WHERE role = 'member';
UPDATE public.team_invites SET role = 'editor' WHERE role = 'member';

ALTER TABLE public.team_members ALTER COLUMN role SET DEFAULT 'editor';
ALTER TABLE public.team_invites ALTER COLUMN role SET DEFAULT 'editor';

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

ALTER TABLE public.team_invites
  ADD CONSTRAINT team_invites_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

-- 2) Ensure every team has a reusable 5-digit invite code
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_invite_code_check;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_invite_code_check
  CHECK (invite_code IS NULL OR invite_code ~ '^[0-9]{5}$');

CREATE UNIQUE INDEX IF NOT EXISTS teams_invite_code_uq
  ON public.teams(invite_code) WHERE invite_code IS NOT NULL;

-- Backfill missing codes with unique random values
DO $$
DECLARE
  t RECORD;
  candidate TEXT;
BEGIN
  FOR t IN SELECT id FROM public.teams WHERE invite_code IS NULL LOOP
    LOOP
      candidate := LPAD((FLOOR(RANDOM() * 100000))::int::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE invite_code = candidate);
    END LOOP;
    UPDATE public.teams SET invite_code = candidate WHERE id = t.id;
  END LOOP;
END;
$$;
