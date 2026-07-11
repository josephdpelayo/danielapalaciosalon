'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/slots';
import { buildDayTimeline, type AgendaStaffAbsence } from '@/lib/agenda';
import { useStaffAbsences } from '@/lib/hooks/useStaffAbsences';
import { mergeBlocksToSegments, BLOCK_HEIGHT_PX, HEADER_HEIGHT_PX } from './timeline-helpers';
import type { Appointment, BlockedSlot, ScheduleConfig } from '@/lib/types';

interface StaffColumnProps {
  label: string;
  multi: boolean;
  staffId: string | null;
  staffSchedule: ScheduleConfig | null;
  daySchedule: ScheduleConfig | undefined;
  dateKey: string;
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  rangeStart: string;
  rangeEnd: string;
  onSelectAppointment: (apt: Appointment) => void;
  onDeleteBlock: (block: BlockedSlot) => void;
}

/** One day's timeline for one staff member (or the single global column when staff aren't split). */
export function StaffColumn({
  label,
  multi,
  staffId,
  staffSchedule,
  daySchedule,
  dateKey,
  appointments,
  blockedSlots,
  rangeStart,
  rangeEnd,
  onSelectAppointment,
  onDeleteBlock,
}: StaffColumnProps) {
  // Scoped to just this staff member — a separate component instance per column keeps this a
  // legal, unconditional top-level hook call even though the number of columns varies.
  const { absences } = useStaffAbsences(staffId);

  const dayAbsences = useMemo<AgendaStaffAbsence[]>(() => {
    if (!staffId) return [];
    return absences
      .filter((a) => a.absence_date === dateKey)
      .map((a) => ({ staff_id: staffId, absence_date: a.absence_date }));
  }, [absences, dateKey, staffId]);

  const staffScheduleWithId = useMemo(
    () => (staffId && staffSchedule ? { ...staffSchedule, staff_id: staffId } : null),
    [staffId, staffSchedule]
  );

  const blocks = useMemo(
    () =>
      buildDayTimeline({
        daySchedule,
        staffSchedule: staffScheduleWithId,
        appointments,
        blockedSlots,
        staffAbsences: dayAbsences,
        staffId,
        rangeStart,
        rangeEnd,
      }),
    [daySchedule, staffScheduleWithId, appointments, blockedSlots, dayAbsences, staffId, rangeStart, rangeEnd]
  );

  const segments = useMemo(() => mergeBlocksToSegments(blocks), [blocks]);
  const apptById = useMemo(() => new Map(appointments.map((a) => [a.id, a])), [appointments]);

  return (
    <div className="flex-1 min-w-[190px] flex flex-col border-r border-white/8 last:border-r-0">
      {multi && (
        <div
          style={{ height: HEADER_HEIGHT_PX }}
          className="flex items-center justify-center px-3 border-b border-white/8 bg-white/[0.02]"
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-cream truncate">{label}</p>
        </div>
      )}
      <div className="flex flex-col">
        {segments.map((seg, i) => {
          const height = seg.span * BLOCK_HEIGHT_PX;

          if (seg.status === 'appointment' || seg.status === 'processing') {
            const apt = seg.appointmentId ? apptById.get(seg.appointmentId) : null;
            if (!apt) return <div key={i} style={{ height }} />;
            return (
              <button
                key={i}
                onClick={() => onSelectAppointment(apt)}
                style={{ height }}
                className={cn(
                  'text-left px-2 py-1 border-b border-white/[0.06] overflow-hidden transition-colors hover:brightness-125',
                  seg.status === 'processing' && 'opacity-60',
                  toneBg(apt.status)
                )}
              >
                <p className="text-[10px] text-cream font-semibold truncate">{apt.client_name}</p>
                {height > 34 && (
                  <p className="text-[9px] text-cream/70 truncate">{apt.dp_services?.name ?? 'Servicio'}</p>
                )}
                <p className="text-[9px] text-cream/50">{formatTime(seg.start)}</p>
              </button>
            );
          }

          if (seg.status === 'blocked') {
            return (
              <div
                key={i}
                style={{ height }}
                className="group px-2 py-1 border-b border-white/[0.06] bg-white/[0.07] flex items-start justify-between gap-1"
              >
                <p className="text-[9px] text-muted truncate">{seg.blockedSlot?.reason || 'Bloqueado'}</p>
                {seg.blockedSlot && (
                  <button
                    onClick={() => onDeleteBlock(seg.blockedSlot as BlockedSlot)}
                    className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Quitar bloqueo"
                  >
                    <X size={10} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          }

          return (
            <div
              key={i}
              style={{ height }}
              className={cn('border-b border-white/[0.04]', statusBg[seg.status] ?? '')}
              title={statusLabel[seg.status]}
            />
          );
        })}
      </div>
    </div>
  );
}

const statusBg: Partial<Record<string, string>> = {
  closed: 'bg-transparent',
  break: 'bg-white/[0.03]',
  absent: 'bg-red-400/[0.05]',
  free: 'bg-transparent',
};

const statusLabel: Partial<Record<string, string>> = {
  closed: 'Fuera de horario',
  break: 'Descanso',
  absent: 'Ausente',
  free: 'Libre',
};

function toneBg(status: Appointment['status']): string {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-400/15';
    case 'pending':
      return 'bg-amber-400/15';
    case 'pending_payment':
      return 'bg-orange-400/15';
    case 'completed':
      return 'bg-violet-400/15';
    default:
      return 'bg-white/10';
  }
}
