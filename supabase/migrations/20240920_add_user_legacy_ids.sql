-- Add missing legacy_id columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
