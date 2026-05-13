-- ══════════════════════════════════════════════════════════════
-- FIDSURANCE — Supabase Schema + RLS + Seed Data
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL)
-- ══════════════════════════════════════════════════════════════

-- ─── 1. TABLES ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  city TEXT,
  annual_income NUMERIC,
  monthly_budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  age INT,
  bmi NUMERIC,
  smoker BOOLEAN,
  hba1c NUMERIC,
  bp_systolic INT,
  has_diabetes BOOLEAN,
  has_hypertension BOOLEAN,
  chronic_count INT,
  risk_tier TEXT,
  risk_score NUMERIC,
  vitals_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  session_id UUID REFERENCES assessment_sessions(id),
  risk_tier TEXT NOT NULL,
  risk_score NUMERIC NOT NULL,
  top_plan_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, plan_id)
);

-- ─── 2. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_plans ENABLE ROW LEVEL SECURITY;

-- Profiles: users only see and modify their own row
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Assessment sessions
DROP POLICY IF EXISTS "sessions_own" ON assessment_sessions;
CREATE POLICY "sessions_own" ON assessment_sessions FOR ALL USING (auth.uid() = user_id);

-- Recommendations
DROP POLICY IF EXISTS "recs_own" ON recommendations;
CREATE POLICY "recs_own" ON recommendations FOR ALL USING (auth.uid() = user_id);

-- Saved plans
DROP POLICY IF EXISTS "saved_own" ON saved_plans;
CREATE POLICY "saved_own" ON saved_plans FOR ALL USING (auth.uid() = user_id);

-- ─── 3. AUTO-CREATE PROFILE ON SIGN-UP ───────────────────────
-- This trigger creates a blank profile row whenever a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ══════════════════════════════════════════════════════════════
-- Run this after the above is executed.
-- This is all done — Supabase is ready!
-- ══════════════════════════════════════════════════════════════
