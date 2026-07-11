'use client';

import { useMemo } from 'react';
import { format, getDay } from 'date-fns';
import { CalendarOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffColumn } from './staff-column';
import { buildTimeGutter, BLOCK_HEIGHT_PX, HEADER_HEIGHT_PX } from './timeline-helpers';
import type { Appointment, BlockedSlot, ScheduleConfig, StaffWithDetails } from '@/lib/types';

interface DayViewProps {
  date: Date;
  schedule: ScheduleConfig[];
  staff: StaffWithDetails[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  onSelectAppointment: (apt: Appointment) => void;
  onDeleteBlock: (block: BlockedSlot) => void;
}

interface Column {
  key: string;
  label: string;
  staffId: string | null;
  staffSchedule: ScheduleConfig | null;
}

/**
 * Single-day timeline, built from the REAL global schedule (useSchedule) + real per-staff
 * schedules (useStaff), never from lib/mock-data.ts — that hardcoded-schedule bug is what this
 * whole screen replaces. Renders one column per active staff member when there's more than one,
 * so double-booking conflicts across staff are visible side by side; otherwise a single column.
 */
export function DayView({
  date,
  schedule,
  staff,
  appointments,
  blockedSlots,
  onSelectAppointment,
  onDeleteBlock,
}: DayViewProps) {
  const dow = getDay(date);
  const dateKey = format(date, 'yyyy-MM-dd');
  const globalDaySchedule = schedule.find((s) => s.day_of_week === dow);
  const activeStaff = useMemo(() => staff.filter((s) => s.is_active), [staff]);

  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.appointment_date === dateKey),
    [appointments, dateKey]
  );
  const dayBlocks = useMemo(() => blockedSlots.filter((b) => b.block_date === dateKey), [blockedSlots, dateKey]);

  const columns = useMemo<Column[]>(() => {
    if (activeStaff.length >= 1) {
      return activeStaff.map((s) => ({
        key: s.id,
        label: s.name,
        staffId: s.id,
        staffSchedule: s.schedule.find((sc) => sc.day_of_week === dow) ?? null,
      }));
    }
    return [{ key: 'global', label: 'Agenda', staffId: null, staffSchedule: null }];
  }, [activeStaff, dow]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const effectiveList = columns
      .map((c) => c.staffSchedule ?? globalDaySchedule)
      .filter((s): s is ScheduleConfig => !!s && s.is_active);
    if (effectiveList.length === 0) return { rangeStart: undefined, rangeEnd: undefined };
    let start = effectiveList[0].start_time;
    let end = effectiveList[0].end_time;
    for (const s of effectiveList) {
      if (s.start_time < start) start = s.start_time;
      if (s.end_time > end) end = s.end_time;
    }
    return { rangeStart: start, rangeEnd: end };
  }, [columns, globalDaySchedule]);

  if (!rangeStart || !rangeEnd) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="Día cerrado"
        description="No hay horario activo configurado para este día. Ajústalo en Config si es un error."
      />
    );
  }

  const gutter = buildTimeGutter(rangeStart, rangeEnd);
  const multi = columns.length > 1;

  return (
    <div className="border border-white/8 overflow-x-auto">
      <div className="flex min-w-fit">
        {/* Shared time gutter — every column above renders the same rangeStart/rangeEnd, so
            row N here always lines up with row N in every staff column. */}
        <div className="w-14 flex-shrink-0 border-r border-white/8">
          {multi && <div style={{ height: HEADER_HEIGHT_PX }} className="border-b border-white/8" />}
          {gutter.map((t) => (
            <div
              key={t}
              style={{ height: BLOCK_HEIGHT_PX }}
              className="flex items-start justify-end pr-2 border-b border-white/[0.04]"
            >
              {t.endsWith(':00') && <span className="text-[9px] text-muted -translate-y-1.5">{t}</span>}
            </div>
          ))}
        </div>
        {columns.map((col) => (
          <StaffColumn
            key={col.key}
            label={col.label}
            multi={multi}
            staffId={col.staffId}
            staffSchedule={col.staffSchedule}
            daySchedule={globalDaySchedule}
            dateKey={dateKey}
            appointments={dayAppointments}
            blockedSlots={dayBlocks}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onSelectAppointment={onSelectAppointment}
            onDeleteBlock={onDeleteBlock}
          />
        ))}
      </div>
    </div>
  );
}
