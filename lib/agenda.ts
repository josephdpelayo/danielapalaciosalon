// Pure functions to build an admin agenda day timeline from REAL schedule/appointment
// data — replaces the old MOCK_SCHEDULE-driven `buildTimeline()` that used to live in
// app/admin/page.tsx. No React here on purpose: this file is imported by both the
// admin agenda screens and (indirectly, via lib/slots.ts) the public booking flow, so
// it must never depend on `lib/mock-data.ts` or any client-only code.
//
// The one rule that matters most: two appointments only truly conflict while their
// *active* windows overlap (start_time .. start_time + active_minutes), not their full
// duration (start_time .. end_time). lib/slots.ts's generateTimeSlots already encodes
// this for the public booking flow — this file reuses timeToMinutes/minutesToTime from
// there and replicates the exact same overlap check, so the admin agenda and the public
// booking availability can never disagree about whether a moment is "free".

import { timeToMinutes, minutesToTime } from './slots';
import { BlockedSlot } from './types';

/** dp_schedule row shape — the salon's global schedule for one day of week. */
export interface AgendaSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  break_start?: string | null;
  break_end?: string | null;
}

/** dp_staff_schedule row shape — one staff member's schedule for one day of week. */
export interface AgendaStaffSchedule extends AgendaSchedule {
  staff_id: string;
}

/** dp_appointments row shape, trimmed to the fields the timeline needs. */
export interface AgendaAppointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  active_minutes?: number | null;
  staff_id?: string | null;
}

/** dp_staff_absences row shape, trimmed to the fields the timeline needs. */
export interface AgendaStaffAbsence {
  staff_id: string;
  absence_date: string;
}

export type AgendaBlockStatus =
  | 'closed'       // outside operating hours for this day (or the day is off entirely)
  | 'break'        // inside the lunch/break window
  | 'absent'       // the staff member is marked absent this day
  | 'blocked'      // covered by a manual dp_blocked_slots entry
  | 'appointment'  // an existing appointment needs the staff's active attention here
  | 'processing'   // an existing appointment is still open but past its active window
                    // (client present/processing, staff is actually free)
  | 'free';         // nothing scheduled, bookable

export interface DayTimelineBlock {
  start: string;                        // "HH:MM"
  end: string;                          // "HH:MM"
  status: AgendaBlockStatus;
  available: boolean;                   // could a NEW appointment start here without conflict
  appointment: AgendaAppointment | null;
  appointmentIsStart: boolean;          // true on the first block belonging to `appointment`
  blockedSlot: BlockedSlot | null;
  blockedSlotIsStart: boolean;          // true on the first block belonging to `blockedSlot`
}

export interface BuildDayTimelineParams {
  /** The salon's global dp_schedule row for the day being rendered. */
  daySchedule: AgendaSchedule | null | undefined;
  /**
   * A specific staff member's dp_staff_schedule row for the day, if this timeline is
   * scoped to one staff column. When provided it takes precedence over `daySchedule`
   * for determining working hours/break — mirrors how the public booking flow prefers
   * a staff-specific schedule over the global one when staff are configured.
   */
  staffSchedule?: AgendaStaffSchedule | null;
  /** That day's dp_appointments rows (any staff, any status). */
  appointments?: AgendaAppointment[];
  /** That day's dp_blocked_slots rows. */
  blockedSlots?: BlockedSlot[];
  /** dp_staff_absences rows for that day (any staff). */
  staffAbsences?: AgendaStaffAbsence[];
  /**
   * When set, scopes the timeline to one staff member: appointments assigned to a
   * *different* staff are ignored, and an absence entry for this staff marks the whole
   * day as unavailable.
   */
  staffId?: string | null;
  /** Size of each timeline block in minutes. Defaults to 30, matching generateTimeSlots. */
  blockMinutes?: number;
  /**
   * Optional wider window ("HH:MM") to render blocks over — useful for aligning several
   * staff columns (with different working hours) on one shared time axis. Cells outside
   * the effective working hours are returned with status 'closed'. Defaults to the
   * effective schedule's own start/end.
   */
  rangeStart?: string;
  rangeEnd?: string;
}

const DEFAULT_BLOCK_MINUTES = 30;

export function buildDayTimeline({
  daySchedule,
  staffSchedule = null,
  appointments = [],
  blockedSlots = [],
  staffAbsences = [],
  staffId = null,
  blockMinutes = DEFAULT_BLOCK_MINUTES,
  rangeStart,
  rangeEnd,
}: BuildDayTimelineParams): DayTimelineBlock[] {
  // A staff-specific schedule, if given, is the effective source of truth for a
  // per-staff column; otherwise fall back to the salon's global schedule for the day.
  const effective = staffSchedule ?? daySchedule;
  const effectiveActive = !!effective && effective.is_active;

  const dayStart = effectiveActive ? timeToMinutes(effective!.start_time) : null;
  const dayEnd   = effectiveActive ? timeToMinutes(effective!.end_time)   : null;

  const gridStart = rangeStart ? timeToMinutes(rangeStart) : dayStart;
  const gridEnd   = rangeEnd   ? timeToMinutes(rangeEnd)   : dayEnd;

  // Nothing to render: the day is off and no explicit range was requested.
  if (gridStart === null || gridEnd === null || gridEnd <= gridStart) return [];

  const isAbsent = !!staffId && staffAbsences.some((a) => a.staff_id === staffId);

  const relevantAppointments = appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    if (staffId && a.staff_id && a.staff_id !== staffId) return false;
    return true;
  });

  const blocks: DayTimelineBlock[] = [];
  let prevApptId: string | null = null;
  let prevBlockId: string | null = null;

  for (let cur = gridStart; cur < gridEnd; cur += blockMinutes) {
    const blockStart = cur;
    const blockEnd   = cur + blockMinutes;

    // Outside the effective working hours for this day (only possible when an explicit
    // rangeStart/rangeEnd widens the grid beyond this schedule).
    if (!effectiveActive || dayStart === null || dayEnd === null || blockStart < dayStart || blockEnd > dayEnd) {
      prevApptId = null;
      prevBlockId = null;
      blocks.push({
        start: minutesToTime(blockStart),
        end:   minutesToTime(blockEnd),
        status: 'closed',
        available: false,
        appointment: null,
        appointmentIsStart: false,
        blockedSlot: null,
        blockedSlotIsStart: false,
      });
      continue;
    }

    // Manual blocked slots (dp_blocked_slots) — same overlap rule generateTimeSlots uses.
    const blockedSlot = blockedSlots.find((b) => {
      if (b.all_day) return true;
      if (!b.start_time || !b.end_time) return false;
      const bStart = timeToMinutes(b.start_time);
      const bEnd   = timeToMinutes(b.end_time);
      return blockStart < bEnd && blockEnd > bStart;
    }) ?? null;

    // Existing appointment overlapping this block by its FULL duration — used only to
    // know which appointment (if any) to attach/display for this cell.
    const appointment = relevantAppointments.find((a) => {
      const aStart = timeToMinutes(a.start_time);
      const aEnd   = timeToMinutes(a.end_time);
      return blockStart < aEnd && blockEnd > aStart;
    }) ?? null;

    // "Active window" conflict — the exact rule lib/slots.ts's generateTimeSlots uses for
    // the public booking flow: an appointment only truly occupies the staff member while
    // its active_minutes haven't elapsed. After that, the staff is free even though the
    // appointment (processing time) hasn't ended yet.
    const activeConflict = relevantAppointments.some((a) => {
      const aStart  = timeToMinutes(a.start_time);
      const aActive = aStart + (a.active_minutes ?? timeToMinutes(a.end_time) - aStart);
      return blockStart < aActive && blockEnd > aStart;
    });

    const inBreak = !!(effective!.break_start && effective!.break_end) &&
      blockStart < timeToMinutes(effective!.break_end as string) &&
      blockEnd   > timeToMinutes(effective!.break_start as string);

    const isBlocked = !!blockedSlot;
    const available = !isAbsent && !isBlocked && !inBreak && !activeConflict;

    let status: AgendaBlockStatus;
    if (isAbsent)      status = 'absent';
    else if (isBlocked) status = 'blocked';
    else if (inBreak)   status = 'break';
    else if (appointment && activeConflict) status = 'appointment';
    else if (appointment)                   status = 'processing';
    else                                     status = 'free';

    const appointmentIsStart = !!appointment && appointment.id !== prevApptId;
    const blockedSlotIsStart = !!blockedSlot && blockedSlot.id !== prevBlockId;
    prevApptId  = appointment?.id ?? null;
    prevBlockId = blockedSlot?.id ?? null;

    blocks.push({
      start: minutesToTime(blockStart),
      end:   minutesToTime(blockEnd),
      status,
      available,
      appointment,
      appointmentIsStart,
      blockedSlot,
      blockedSlotIsStart,
    });
  }

  return blocks;
}
