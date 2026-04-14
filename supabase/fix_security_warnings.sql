-- ============================================================================
-- Supabase Database Security Fixes
-- ============================================================================
-- This file addresses the following security warnings:
-- 1. function_search_path_mutable (2 functions)
-- 2. foreign_table_in_api (4 foreign tables)
-- 3. auth_leaked_password_protection (1 setting - requires dashboard action)
-- ============================================================================

-- ============================================================================
-- FIX 1: function_search_path_mutable
-- ============================================================================
-- The functions use mutable search_path which can be exploited.
-- We need to set a secure search_path for each function.

-- Fix for is_team_member function
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_uuid AND tm.user_id = auth.uid()
  );
$$;

-- Fix for update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER SET search_path = 'public' AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- FIX 2: foreign_table_in_api (Paddle tables)
-- ============================================================================
-- NOTE: Foreign tables CANNOT have RLS enabled - this is a PostgreSQL limitation.
-- The 4 Paddle foreign tables (paddle_products, paddle_prices, paddle_customers, 
-- paddle_transactions) must be excluded from the API via Supabase Dashboard.
--
-- To fix these warnings:
-- 1. Go to Supabase Dashboard → Settings → API
-- 2. Find "Exposed tables" or "Foreign table access"
-- 3. Uncheck/remove these tables from API exposure
--
-- Alternatively, you can use the Supabase CLI to update config:
-- supabase meta table update --table public.paddle_products --exclude-from-api
-- ============================================================================
-- (Cannot be fixed via SQL - requires dashboard configuration)

-- ============================================================================
-- FIX 3: auth_leaked_password_protection
-- ============================================================================
-- This setting must be enabled in Supabase Dashboard:
-- 1. Go to: Authentication -> Settings -> Email -> Password protection
-- 2. Enable "Leaked password protection"
-- 3. Set the protection level to "Standard" or "Strict"
--
-- There is no SQL way to enable this - it must be done in the Supabase UI.
-- The setting is under: Supabase Dashboard > Authentication > Settings > Email
--
-- Alternative: You can use the Supabase CLI to update this:
-- supabase auth settings update --leaked-password-protection enabled
-- or
-- supabase secrets set SUPABASE_AUTH_PASSWORD_LEAKED_PROTECTION=enabled
--
-- Note: As of Supabase CLI 2.x, you can configure this in supabase/config.toml:
-- [auth.password_leaked_protection]
-- enabled = true
-- level = "standard" # or "strict"
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify the fixes:

-- Check function search_path settings:
-- SELECT proname, pronamespace::regnamespace, prosrc FROM pg_proc 
-- WHERE proname IN ('is_team_member', 'update_updated_at_column');

-- Check RLS status on foreign tables:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname IN ('auth', 'storage') 
-- AND tablename IN ('tables', 'objects', 'users', 'sessions');

-- Check policies on foreign tables:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname IN ('auth', 'storage');