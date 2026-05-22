-- ═══════════════════════════════════════════════════════════
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Columnas faltantes en dp_appointments
ALTER TABLE dp_appointments
  ADD COLUMN IF NOT EXISTS active_minutes   integer,
  ADD COLUMN IF NOT EXISTS internal_notes   text,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- 2. Índices de performance
CREATE INDEX IF NOT EXISTS idx_dp_appointments_date
  ON dp_appointments (appointment_date);

CREATE INDEX IF NOT EXISTS idx_dp_appointments_status
  ON dp_appointments (status);

CREATE INDEX IF NOT EXISTS idx_dp_blocked_slots_date
  ON dp_blocked_slots (block_date);

CREATE INDEX IF NOT EXISTS idx_dp_trusted_clients_phone
  ON dp_trusted_clients (phone_normalized);

-- 3. Prevenir doble reserva a nivel DB (slots confirmados o pendientes recientes)
--    Dos citas no pueden tener el mismo (appointment_date, start_time) a menos
--    que estén canceladas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dp_appointments_no_double_booking
  ON dp_appointments (appointment_date, start_time)
  WHERE status NOT IN ('cancelled');

-- 4. Expirar citas pending_payment automáticamente cada 5 minutos
--    Requiere pg_cron habilitado (Supabase Dashboard → Database → Extensions → pg_cron)
--
-- SELECT cron.schedule(
--   'expire-pending-payments',
--   '*/5 * * * *',
--   $$
--     UPDATE dp_appointments
--     SET status = 'cancelled'
--     WHERE status = 'pending_payment'
--       AND created_at < NOW() - INTERVAL '35 minutes';
--   $$
-- );

-- 5. RLS — proteger datos de clientes
--    La app usa service_role en el servidor, anon key solo para lectura pública.
--    Habilitar RLS en dp_appointments impide acceso directo con anon key.
--
-- ALTER TABLE dp_appointments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "solo service role" ON dp_appointments
--   USING (auth.role() = 'service_role');
