-- ─────────────────────────────────────────────────────────────
-- Daniela Palacio — Ausencias de staff + Lista de espera
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Días de ausencia por trabajadora
CREATE TABLE IF NOT EXISTS dp_staff_absences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid NOT NULL REFERENCES dp_staff(id) ON DELETE CASCADE,
  absence_date date NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(staff_id, absence_date)
);

-- 2. Lista de espera
CREATE TABLE IF NOT EXISTS dp_waitlist (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     uuid REFERENCES dp_services(id) ON DELETE SET NULL,
  preferred_date date,
  client_name    text NOT NULL,
  client_phone   text NOT NULL,
  client_email   text,
  notes          text,
  status         text NOT NULL DEFAULT 'waiting',
  notified_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- Deshabilitar RLS en tablas internas (protegidas por admin secret en la API)
ALTER TABLE dp_staff_absences DISABLE ROW LEVEL SECURITY;
ALTER TABLE dp_waitlist DISABLE ROW LEVEL SECURITY;
