-- ─────────────────────────────────────────────────────────────
-- Daniela Palacio Hair Room — Staff migration
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Staff members
CREATE TABLE IF NOT EXISTS dp_staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Per-staff weekly schedule (same shape as dp_schedule)
CREATE TABLE IF NOT EXISTS dp_staff_schedule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL REFERENCES dp_staff(id) ON DELETE CASCADE,
  day_of_week int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_active   boolean NOT NULL DEFAULT true,
  start_time  text NOT NULL DEFAULT '10:00',
  end_time    text NOT NULL DEFAULT '19:00',
  break_start text,
  break_end   text,
  UNIQUE(staff_id, day_of_week)
);

-- 3. Services each staff member can perform
CREATE TABLE IF NOT EXISTS dp_staff_services (
  staff_id   uuid NOT NULL REFERENCES dp_staff(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES dp_services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- 4. Track which staff member was assigned to each appointment
ALTER TABLE dp_appointments
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES dp_staff(id);

-- ─────────────────────────────────────────────────────────────
-- Initial data: insert Daniela and Valeria
-- (After running this, go to Admin → Staff to assign services
--  and adjust schedules)
-- ─────────────────────────────────────────────────────────────

INSERT INTO dp_staff (name, is_active) VALUES
  ('Daniela', true),
  ('Valeria', true)
ON CONFLICT DO NOTHING;
