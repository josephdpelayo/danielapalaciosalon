-- ─────────────────────────────────────────────────────────────
-- Daniela Palacio — Tarjeta de cliente frecuente (loyalty)
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Columnas de fidelidad en dp_clients
ALTER TABLE dp_clients
  ADD COLUMN IF NOT EXISTS loyalty_token   uuid    DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS loyalty_visits  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_pass_id  text,
  ADD COLUMN IF NOT EXISTS loyalty_pass_url text;

-- Rellenar tokens para clientes existentes sin token
UPDATE dp_clients SET loyalty_token = gen_random_uuid() WHERE loyalty_token IS NULL;

-- 2. Historial de visitas registradas
CREATE TABLE IF NOT EXISTS dp_loyalty_visits (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone_norm text       NOT NULL,
  appointment_id   uuid        REFERENCES dp_appointments(id) ON DELETE SET NULL,
  notes            text,
  stamped_by       text        NOT NULL DEFAULT 'auto',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Sin RLS (protegido por admin secret en la API)
ALTER TABLE dp_loyalty_visits DISABLE ROW LEVEL SECURITY;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_loyalty_visits_phone ON dp_loyalty_visits(client_phone_norm);
CREATE INDEX IF NOT EXISTS idx_clients_loyalty_token ON dp_clients(loyalty_token);
