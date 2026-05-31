export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  active_minutes: number;       // tiempo que Daniela trabaja activamente; después puede overlappear
  price: number | null;
  deposit_amount: number;
  active: boolean;
  sort_order: number;
  category?: string;
}

export interface ScheduleConfig {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  break_start?: string | null;
  break_end?: string | null;
}

export interface BlockedSlot {
  id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  all_day: boolean;
}

export interface Appointment {
  id: string;
  service_id: string;
  staff_id?: string | null;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending_payment' | 'pending' | 'confirmed' | 'cancelled';
  payment_id: string | null;
  payment_status: string | null;
  deposit_amount: number | null;
  notes: string | null;
  created_at: string;
  dp_services?: Service;
}

export interface ScheduleDay {
  day_of_week: number;   // 0=Sun … 6=Sat
  active: boolean;
  start_time: string;    // "HH:MM"
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface Staff {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface StaffWithDetails extends Staff {
  schedule: ScheduleConfig[];
  service_ids: string[];
}

export interface BookingStep {
  service: Service | null;
  date: Date | null;
  slot: TimeSlot | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
}
