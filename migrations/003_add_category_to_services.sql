-- Add category column to dp_services for grouping on the landing page
ALTER TABLE dp_services ADD COLUMN IF NOT EXISTS category text;

-- Set categories for the current services
UPDATE dp_services SET category = 'Basic'                   WHERE name IN ('Corte de cabello','Planchado','Planchado + lavado','Moldeado','Moldeado + lavado','Ondas','Ondas + lavado') AND active = true;
UPDATE dp_services SET category = 'Hair color'              WHERE name = 'Hair color' AND active = true;
UPDATE dp_services SET category = 'Tratamientos capilares'  WHERE name = 'Tratamientos capilares' AND active = true;
