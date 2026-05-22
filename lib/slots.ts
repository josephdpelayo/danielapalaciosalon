import { TimeSlot, ScheduleConfig, BlockedSlot } from './types';

interface ExistingAppointment {
  start_time: string;
  end_time: string;
  status: string;
  active_minutes?: number; // tiempo activo de ese turno ya agendado
}

export function generateTimeSlots(
  schedule: ScheduleConfig,
  durationMinutes: number,
  activeMinutes: number,           // tiempo activo del NUEVO servicio
  appointments: ExistingAppointment[],
  blockedSlots: BlockedSlot[]
): TimeSlot[] {
  if (!schedule.is_active) return [];

  const dayStart = timeToMinutes(schedule.start_time);
  const dayEnd   = timeToMinutes(schedule.end_time);

  const slots: TimeSlot[] = [];
  let current = dayStart;

  while (current + durationMinutes <= dayEnd) {
    const slotStart  = current;
    const slotEnd    = current + durationMinutes;
    const slotActive = current + activeMinutes; // hasta cuándo necesita a Daniela

    // Bloqueos manuales
    const isBlocked = blockedSlots.some((b) => {
      if (b.all_day) return true;
      if (!b.start_time || !b.end_time) return false;
      const bStart = timeToMinutes(b.start_time);
      const bEnd   = timeToMinutes(b.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });

    // Conflicto con citas existentes:
    // Solo hay conflicto si los períodos ACTIVOS se solapan.
    // Si la cita existente ya pasó su tiempo activo, Daniela está libre.
    const hasConflict = appointments.some((a) => {
      if (a.status === 'cancelled') return false;
      const aStart  = timeToMinutes(a.start_time);
      const aActive = aStart + (a.active_minutes ?? timeToMinutes(a.end_time) - aStart);
      // El nuevo turno necesita a Daniela de slotStart a slotActive.
      // La cita existente la necesita de aStart a aActive.
      return slotStart < aActive && slotActive > aStart;
    });

    const inBreak = schedule.break_start && schedule.break_end
      ? slotStart < timeToMinutes(schedule.break_end) && slotEnd > timeToMinutes(schedule.break_start)
      : false;

    slots.push({
      start: minutesToTime(slotStart),
      end:   minutesToTime(slotEnd),
      available: !isBlocked && !hasConflict && !inBreak,
    });

    current += 30; // incrementos de 30 min
  }

  return slots;
}

// ── Helpers ──────────────────────────────────────────────────────

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatPrice(price: number | null): string {
  if (!price) return 'Consultar';
  return `$${price.toLocaleString('es-MX')}`;
}
