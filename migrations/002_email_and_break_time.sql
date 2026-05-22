-- Add email column to dp_trusted_clients
ALTER TABLE dp_trusted_clients
  ADD COLUMN IF NOT EXISTS email text;

-- Add break time columns to dp_schedule
ALTER TABLE dp_schedule
  ADD COLUMN IF NOT EXISTS break_start text,
  ADD COLUMN IF NOT EXISTS break_end   text;
