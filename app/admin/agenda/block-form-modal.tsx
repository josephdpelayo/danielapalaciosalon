'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';

export interface CreateBlockInput {
  block_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface BlockFormModalProps {
  open: boolean;
  date: Date;
  onClose: () => void;
  onSubmit: (input: CreateBlockInput) => Promise<void>;
}

/** All-day or time-range blocked-slot creation for the day currently selected in Agenda. */
export function BlockFormModal({ open, date, onClose, onSubmit }: BlockFormModalProps) {
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('14:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const dateKey = format(date, 'yyyy-MM-dd');

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!allDay && (!start || !end || end <= start)) {
      setError('La hora de fin debe ser mayor que la de inicio.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        block_date: dateKey,
        all_day: allDay,
        start_time: allDay ? null : start,
        end_time: allDay ? null : end,
        reason: reason.trim() || null,
      });
      setReason('');
      setAllDay(true);
      onClose();
    } catch {
      // el toast de error ya lo muestra el caller (onSubmit)
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bloquear horario"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={saving}>
            Bloquear
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12px] text-stone-light capitalize">
          {format(date, "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <label className="flex items-center gap-2 text-[12px] text-cream cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="accent-stone"
          />
          Todo el día
        </label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        )}
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <div>
          <Label>Motivo (opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. cita médica, vacaciones..."
          />
        </div>
      </div>
    </Modal>
  );
}
