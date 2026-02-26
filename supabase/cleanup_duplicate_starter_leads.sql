-- Cleanup script: remove duplicate starter leads for users.
-- Context:
-- Starter grant is 5 leads. If grant was accidentally triggered twice,
-- users can end up with duplicated lead rows.
--
-- Usage:
-- 1) Run the PREVIEW query first.
-- 2) If output looks correct, run the DELETE query.
--
-- Optional: set a specific target user_id in params to scope cleanup.
-- Example:
--   SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_user_id
-- If NULL, it scans all users.

-- ========================================
-- PREVIEW (read-only)
-- ========================================
WITH params AS (
  SELECT NULL::uuid AS target_user_id
),
candidate_rows AS (
  SELECT
    l.id,
    l.user_id,
    l.created_at,
    l.business_name,
    l.contact_name,
    l.email,
    l.phone,
    l.address,
    l.website,
    l.business_type,
    ROW_NUMBER() OVER (
      PARTITION BY
        l.user_id,
        lower(coalesce(trim(l.business_name), '')),
        lower(coalesce(trim(l.contact_name), '')),
        lower(coalesce(trim(l.email), '')),
        lower(coalesce(trim(l.phone), '')),
        lower(coalesce(trim(l.address), '')),
        lower(coalesce(trim(l.website), '')),
        lower(coalesce(trim(l.business_type), ''))
      ORDER BY l.created_at ASC, l.id ASC
    ) AS rn
  FROM public.leads l
  JOIN public.signup_grants sg ON sg.user_id = l.user_id
  LEFT JOIN params p ON TRUE
  WHERE (p.target_user_id IS NULL OR l.user_id = p.target_user_id)
    AND coalesce(l.team_id::text, '') = ''
)
SELECT
  user_id,
  count(*) FILTER (WHERE rn > 1) AS duplicate_rows_to_delete
FROM candidate_rows
GROUP BY user_id
HAVING count(*) FILTER (WHERE rn > 1) > 0
ORDER BY duplicate_rows_to_delete DESC, user_id;

-- ========================================
-- DELETE (write)
-- ========================================
WITH params AS (
  SELECT NULL::uuid AS target_user_id
),
ranked AS (
  SELECT
    l.id,
    l.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY
        l.user_id,
        lower(coalesce(trim(l.business_name), '')),
        lower(coalesce(trim(l.contact_name), '')),
        lower(coalesce(trim(l.email), '')),
        lower(coalesce(trim(l.phone), '')),
        lower(coalesce(trim(l.address), '')),
        lower(coalesce(trim(l.website), '')),
        lower(coalesce(trim(l.business_type), ''))
      ORDER BY l.created_at ASC, l.id ASC
    ) AS rn
  FROM public.leads l
  JOIN public.signup_grants sg ON sg.user_id = l.user_id
  LEFT JOIN params p ON TRUE
  WHERE (p.target_user_id IS NULL OR l.user_id = p.target_user_id)
    AND coalesce(l.team_id::text, '') = ''
),
to_delete AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
DELETE FROM public.leads l
USING to_delete d
WHERE l.id = d.id;
