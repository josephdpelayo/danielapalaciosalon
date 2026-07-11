'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';

import { Modal, Button, Select, Label } from '@/components/ui';
import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/admin/api-client';
import { useServices } from '@/lib/hooks/useServices';
import { useStaff } from '@/lib/hooks/useStaff';
import { useSchedule } from '@/lib/hooks/useSchedule';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { useBlockedSlots } from '@/lib/hooks/useBlockedSlots';
import { useStaffAbsences } from '@/lib/hooks/useStaffAbsences';
import { buildDayTimeline, type AgendaStaffSchedule, type AgendaStaffAbsence } from '@/lib/agenda';
import { timeToMinutes, minutesToTime, formatTime, formatDuration } from '@/lib/slots';
import type { WaitlistEntry } from '@/lib/types';

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

interface PromoteModalProps {
  entry: WaitlistEntry;
  open: boolean;
  onClose: () => void;
  onPromoted: () => void;
  promote: (
    id: string,
    input: { appointment_date: string; start_time: string; end_time: string; staff_id?: string }
  ) => Promise<unknown>;
}

export function PromoteModal({ entry, open, onClose, onPromoted, promote }: PromoteModalProps) {
  const toast = useToast();
  const { services } = useServices();
  const { staff } = useStaff();
  const { schedule } = useSchedule();
  const { appointments } = useAppointments();
  const { blockedSlots } = useBlockedSlots();

  const [staffId, setStaffId] = useState<string>('');
  const [date, setDate] = useState<string>(entry.preferred_date || todayStr());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeStaff = useMemo(() => staff.filter((s) => s.is_active), [staff]);
  const { absences } = useStaffAbsences(staffId || null);

  const service = useMemo(() => services.find((s) => s.id === entry.service_id), [services, entry.service_id]);
  const durationMinutes = service?.duration_minutes ?? 30;

  const availableSlots = useMemo(() => {
    if (!date) return [];
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const daySchedule = schedule.find((s) => s.day_of_week === dayOfWeek) ?? null;

    let staffSchedule: AgendaStaffSchedule | null = null;
    if (staffId) {
      const staffMember = staff.find((s) => s.id === staffId);
      const staffDay = staffMember?.schedule.find((s) => s.day_of_week === dayOfWeek);
      staffSchedule = staffDay ? { ...staffDay, staff_id: staffId } : null;
    }

    const dayAppointments = appointments.filter((a) => a.appointment_date === date);
    const dayBlockedSlots = blockedSlots.filter((b) => b.block_date === date);
    const dayAbsences: AgendaStaffAbsence[] = staffId
      ? absences.filter((a) => a.absence_date === date).map((a) => ({ staff_id: staffId, absence_date: a.absence_date }))
      : [];

    const blocks = buildDayTimeline({
      daySchedule,
      staffSchedule,
      appointments: dayAppointments,
      blockedSlots: dayBlockedSlots,
      staffAbsences: dayAbsences,
      staffId: staffId || null,
    });

    const neededBlocks = Math.max(1, Math.ceil(durationMinutes / 30));
    const slots: { start: string; end: string }[] = [];

    for (let i = 0; i + neededBlocks <= blocks.length; i++) {
      const span = blocks.slice(i, i + neededBlocks);
      if (span.every((b) => b.status === 'free')) {
        const startMinutes = timeToMinutes(span[0].start);
        slots.push({ start: span[0].start, end: minutesToTime(startMinutes + durationMinutes) });
      }
    }

    return slots;
  }, [date, staffId, schedule, staff, appointments, blockedSlots, absences, durationMinutes]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await promote(entry.id, {
        appointment_date: date,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        staff_id: staffId || undefined,
      });
      toast.success('Cita creada y lista de espera actualizada.');
      onPromoted();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo promover la entrada.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Promover a cita">
      <div className="space-y-4">
        <div>
          <p className="text-[13px] text-cream">{entry.client_name}</p>
          <p className="text-[12px] text-muted mt-0.5">
            {entry.dp_services?.name ?? 'Servicio no especificado'} · {formatDuration(durationMinutes)}
          </p>
        </div>

        {activeStaff.length > 1 && (
          <div>
            <Label htmlFor="promote-staff">Staff</Label>
            <Select
              id="promote-staff"
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setSelectedSlot(null);
              }}
            >
              <option value="">Cualquiera</option>
              {activeStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="promote-date">Fecha</Label>
          <input
            id="promote-date"
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedSlot(null);
            }}
            className="w-full bg-transparent border border-white/10 focus:border-stone focus:outline-none px-3 py-2.5 text-base text-cream transition-colors"
          />
        </div>

        <div>
          <Label>Horarios disponibles</Label>
          {availableSlots.length === 0 ? (
            <p className="text-[12px] text-muted py-3">No hay horarios disponibles para esta fecha.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => {
                const active = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-2 py-2 text-[11px] border transition-colors ${
                      active
                        ? 'bg-cream text-background border-cream'
                        : 'border-white/10 text-stone-light hover:border-stone/60 hover:text-cream'
                    }`}
                  >
                    {formatTime(slot.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={!selectedSlot} loading={submitting}>
          Confirmar cita
        </Button>
      </div>
    </Modal>
  );
}
