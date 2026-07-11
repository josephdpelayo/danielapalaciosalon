'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Pencil, X as XIcon } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Badge, statusToTone } from '@/components/ui/badge';
import { formatTime, timeToMinutes, minutesToTime } from '@/lib/slots';
import type { Appointment, StaffWithDetails } from '@/lib/types';

export interface EditAppointmentFields {
  appointment_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface AppointmentDrawerProps {
  appointment: Appointment | null;
  staff: StaffWithDetails[];
  onClose: () => void;
  onConfirm: (apt: Appointment) => void;
  onComplete: (apt: Appointment) => void;
  onCancel: (apt: Appointment) => void;
  onSave: (apt: Appointment, fields: EditAppointmentFields) => Promise<void>;
  busy: boolean;
}

/** Full appointment detail + confirm/complete/cancel/edit — shared by every Agenda view (Day/Week). */
export function AppointmentDrawer({
  appointment,
  staff,
  onClose,
  onConfirm,
  onComplete,
  onCancel,
  onSave,
  busy,
}: AppointmentDrawerProps) {
  return (
    <Drawer open={!!appointment} onClose={onClose} title={appointment?.client_name}>
      {appointment && (
        // Keyed by id so switching to a different appointment is a fresh mount — the edit
        // form's local state is initialized straight from props with no effect-based
        // resync needed (avoids the "setState synchronously in an effect" anti-pattern).
        <AppointmentDrawerBody
          key={appointment.id}
          appointment={appointment}
          staff={staff}
          onConfirm={onConfirm}
          onComplete={onComplete}
          onCancel={onCancel}
          onSave={onSave}
          busy={busy}
        />
      )}
    </Drawer>
  );
}

interface AppointmentDrawerBodyProps {
  appointment: Appointment;
  staff: StaffWithDetails[];
  onConfirm: (apt: Appointment) => void;
  onComplete: (apt: Appointment) => void;
  onCancel: (apt: Appointment) => void;
  onSave: (apt: Appointment, fields: EditAppointmentFields) => Promise<void>;
  busy: boolean;
}

function AppointmentDrawerBody({
  appointment,
  staff,
  onConfirm,
  onComplete,
  onCancel,
  onSave,
  busy,
}: AppointmentDrawerBodyProps) {
  const [editing, setEditing] = useState(false);
  const [dateVal, setDateVal] = useState(appointment.appointment_date);
  const [startVal, setStartVal] = useState(appointment.start_time.slice(0, 5));
  const [notesVal, setNotesVal] = useState(appointment.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [rangeError, setRangeError] = useState('');

  const staffName = appointment.staff_id ? staff.find((s) => s.id === appointment.staff_id)?.name : null;
  const canConfirm = appointment.status === 'pending' || appointment.status === 'pending_payment';
  const canComplete = appointment.status === 'confirmed';
  const canCancel = appointment.status !== 'cancelled' && appointment.status !== 'completed';

  const handleSave = async () => {
    const durationMinutes = timeToMinutes(appointment.end_time) - timeToMinutes(appointment.start_time);
    const newStartMinutes = timeToMinutes(startVal);
    const newEndMinutes = newStartMinutes + durationMinutes;
    if (newEndMinutes >= 24 * 60) {
      setRangeError('La hora de fin supera la medianoche. Ajusta la hora de inicio.');
      return;
    }
    setRangeError('');
    setSaving(true);
    try {
      await onSave(appointment, {
        appointment_date: dateVal,
        start_time: startVal,
        end_time: minutesToTime(newEndMinutes),
        notes: notesVal.trim() || null,
      });
      setEditing(false);
    } catch {
      // el toast de error ya lo muestra el caller (onSave)
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={statusToTone(appointment.status)} />
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-muted hover:text-cream transition-colors p-1"
            title="Editar"
          >
            <Pencil size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
          </div>
          <div>
            <Label>Hora de inicio</Label>
            <Input type="time" value={startVal} onChange={(e) => setStartVal(e.target.value)} />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)} />
          </div>
          {rangeError && <p className="text-[11px] text-red-400">{rangeError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} loading={saving} icon={<Check size={12} />}>
              Guardar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-[13px] text-stone-light">{appointment.client_phone}</p>
            {appointment.client_email && <p className="text-[13px] text-muted">{appointment.client_email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-white/8 p-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1">Fecha</p>
              <p className="text-cream text-[13px]">
                {new Date(`${appointment.appointment_date}T00:00:00`).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="border border-white/8 p-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1">Hora</p>
              <p className="text-cream text-[13px]">
                {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
              </p>
            </div>
            <div className="border border-white/8 p-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1">Servicio</p>
              <p className="text-cream text-[13px] truncate">{appointment.dp_services?.name ?? '—'}</p>
            </div>
            <div className="border border-white/8 p-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1">Staff</p>
              <p className="text-cream text-[13px] truncate">{staffName ?? 'Sin asignar'}</p>
            </div>
          </div>

          {appointment.notes && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1.5">Notas</p>
              <p className="text-[13px] text-cream/90 whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/8">
            {canConfirm && (
              <Button size="sm" onClick={() => onConfirm(appointment)} loading={busy} icon={<Check size={12} />}>
                Confirmar
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                onClick={() => onComplete(appointment)}
                loading={busy}
                icon={<CheckCircle2 size={12} />}
              >
                Completar
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancel(appointment)}
                loading={busy}
                icon={<XIcon size={12} />}
              >
                Cancelar
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
