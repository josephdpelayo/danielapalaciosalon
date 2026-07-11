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
  status: 'pending_payment' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_id: string | null;
  payment_status: string | null;
  deposit_amount: number | null;
  notes: string | null;
  internal_notes?: string | null;
  active_minutes?: number | null;
  reminder_sent_at?: string | null;
  created_at: string;
  dp_services?: Service;
}

export interface AdminClient {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  created_at: string;
  is_trusted: boolean;
  trusted_notes: string | null;
  visit_count: number;
  loyalty_visits: number;
  loyalty_token: string | null;
}

export interface TrustedClient {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  notes: string | null;
}

export interface StaffAbsence {
  id: string;
  absence_date: string;
}

export interface WaitlistEntry {
  id: string;
  service_id: string | null;
  preferred_date: string | null;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  notes: string | null;
  status: 'waiting' | 'notified' | 'booked' | 'cancelled';
  notified_at: string | null;
  created_at: string;
  dp_services?: { name: string };
}

export interface AdminStats {
  month_revenue: number;
  month_confirmed: number;
  total_confirmed: number;
  week_upcoming: number;
  top_service: string | null;
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
  phone?: string | null;
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
