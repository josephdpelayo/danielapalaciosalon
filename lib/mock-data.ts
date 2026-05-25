import { Service, ScheduleConfig, StaffWithDetails } from './types';

// active_minutes = tiempo que Daniela trabaja activamente
// Si active_minutes < duration_minutes → puede recibir otra clienta mientras procesa
export const MOCK_SERVICES: Service[] = [
  // Basic
  { id: '1', name: 'Corte de cabello',       description: null,                   duration_minutes: 60,  active_minutes: 60,  price: 600,  deposit_amount: 200, active: true, sort_order: 1, category: 'Basic' },
  { id: '2', name: 'Planchado',              description: null,                   duration_minutes: 60,  active_minutes: 60,  price: 400,  deposit_amount: 200, active: true, sort_order: 2, category: 'Basic' },
  { id: '3', name: 'Planchado + lavado',     description: null,                   duration_minutes: 75,  active_minutes: 75,  price: 500,  deposit_amount: 200, active: true, sort_order: 3, category: 'Basic' },
  { id: '4', name: 'Moldeado',               description: null,                   duration_minutes: 60,  active_minutes: 60,  price: 500,  deposit_amount: 200, active: true, sort_order: 4, category: 'Basic' },
  { id: '5', name: 'Moldeado + lavado',      description: null,                   duration_minutes: 75,  active_minutes: 75,  price: 600,  deposit_amount: 200, active: true, sort_order: 5, category: 'Basic' },
  { id: '6', name: 'Ondas',                  description: null,                   duration_minutes: 60,  active_minutes: 60,  price: 500,  deposit_amount: 200, active: true, sort_order: 6, category: 'Basic' },
  { id: '7', name: 'Ondas + lavado',         description: null,                   duration_minutes: 75,  active_minutes: 75,  price: 600,  deposit_amount: 200, active: true, sort_order: 7, category: 'Basic' },
  // Hair color
  { id: '8', name: 'Hair color',             description: null,                   duration_minutes: 180, active_minutes: 90,  price: null, deposit_amount: 200, active: true, sort_order: 8, category: 'Hair color' },
  // Tratamientos capilares
  { id: '9', name: 'Tratamientos capilares', description: 'Sujeto a cotización',  duration_minutes: 120, active_minutes: 90,  price: 999,  deposit_amount: 200, active: true, sort_order: 9, category: 'Tratamientos capilares' },
];

const BASE_SCHEDULE: ScheduleConfig[] = [
  { id: '1', day_of_week: 1, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '2', day_of_week: 2, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '3', day_of_week: 3, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '4', day_of_week: 4, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '5', day_of_week: 5, start_time: '10:00', end_time: '19:00', is_active: true },
  { id: '6', day_of_week: 6, start_time: '10:00', end_time: '15:00', is_active: true },
  { id: '7', day_of_week: 0, start_time: '00:00', end_time: '00:00', is_active: false },
];

export const MOCK_SCHEDULE = BASE_SCHEDULE;

export const MOCK_STAFF: StaffWithDetails[] = [
  {
    id: 'staff-daniela',
    name: 'Daniela',
    is_active: true,
    schedule: BASE_SCHEDULE.map((d, i) => ({ ...d, id: `d-${i}` })),
    service_ids: ['1','2','3','4','5','6','7','8','9'],
  },
  {
    id: 'staff-valeria',
    name: 'Valeria',
    is_active: true,
    schedule: BASE_SCHEDULE.map((d, i) => ({ ...d, id: `v-${i}` })),
    service_ids: ['1','2','3','4','5','6','7'],
  },
];
