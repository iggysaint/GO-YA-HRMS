-- Add missing legacy_id columns for tables that were missed in initial schema
-- This is a follow-up migration to Phase 1

ALTER TABLE daily_attendance_summary ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE chat_channel_members ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE support_notes ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
ALTER TABLE ai_chat_logs ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
