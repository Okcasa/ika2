-- Track name edit history for cooldown enforcement (2 edits per 48 hours)
CREATE TABLE IF NOT EXISTS public.name_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS name_edits_user_id_idx ON public.name_edits(user_id);
CREATE INDEX IF NOT EXISTS name_edits_edited_at_idx ON public.name_edits(edited_at);

ALTER TABLE public.name_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own name edits" ON public.name_edits;
CREATE POLICY "Users manage their own name edits"
    ON public.name_edits
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
