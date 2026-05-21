import { Service, ScheduleConfig } from './types';

// active_minutes = tiempo que Daniela trabaja activamente
// Si active_minutes < duration_minutes → puede recibir otra clienta mientras procesa
export const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Corte de cabello',     description: 'Corte personalizado según tu tipo de cabello y estilo',     duration_minutes: 60,  active_minutes: 60,  price: 350,  deposit_amount: 200, active: true, sort_order: 1 },
  { id: '2', name: 'Color completo',       description: 'Coloración completa con productos de alta calidad',          duration_minutes: 180, active_minutes: 90,  price: 900,  deposit_amount: 200, active: true, sort_order: 2 },
  { id: '3', name: 'Mechas / Balayage',   description: 'Técnica de iluminación natural o barrida de color',          duration_minutes: 240, active_minutes: 120, price: 1400, deposit_amount: 200, active: true, sort_order: 3 },
  { id: '4', name: 'Retoque de raíz',     description: 'Retoque de color en raíz',                                   duration_minutes: 90,  active_minutes: 60,  price: 500,  deposit_amount: 200, active: true, sort_order: 4 },
  { id: '5', name: 'Tratamiento Antifrizz',description: 'Brazilian blowout para alisar y nutrir el cabello',         duration_minutes: 180, active_minutes: 90,  price: 1200, deposit_amount: 200, active: true, sort_order: 5 },
  { id: '6', name: 'Tinte + Corte',       description: 'Color completo más corte de cabello',                        duration_minutes: 240, active_minutes: 150, price: 1150, deposit_amount: 200, active: true, sort_order: 6 },
  { id: '7', name: 'Peinado',             description: 'Peinado para eventos o uso diario',                           duration_minutes: 60,  active_minutes: 60,  price: 350,  deposit_amount: 200, active: true, sort_order: 7 },
];

export const MOCK_SCHEDULE: ScheduleConfig[] = [
  { id: '1', day_of_week: 1, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '2', day_of_week: 2, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '3', day_of_week: 3, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '4', day_of_week: 4, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '5', day_of_week: 5, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '6', day_of_week: 6, start_time: '10:00', end_time: '15:00', is_active: true },
  { id: '7', day_of_week: 0, start_time: '00:00', end_time: '00:00', is_active: false },
];
