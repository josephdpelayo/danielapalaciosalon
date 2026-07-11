'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { useSchedule } from '@/lib/hooks/useSchedule';
import { useStaff } from '@/lib/hooks/useStaff';
import { useBlockedSlots } from '@/lib/hooks/useBlockedSlots';
import { DayNav } from './day-nav';
import { DayView } from './day-view';
import { WeekView } from './week-view';
import { MonthView } from './month-view';
import { AppointmentDrawer, type EditAppointmentFields } from './appointment-drawer';
import { BlockFormModal, type CreateBlockInput } from './block-form-modal';
import type { Appointment, BlockedSlot } from '@/lib/types';

type AgendaView = 'day' | 'week' | 'month';

/**
 * Agenda — replaces the old AgendaTab that lived inside the app/admin/page.tsx monolith.
 * The old version computed availability from a hardcoded MOCK_SCHEDULE; this one always
 * derives it from real data (useSchedule + useStaff + useAppointments + useBlockedSlots +
 * useStaffAbsences) through lib/agenda.ts's buildDayTimeline(), called once per staff column.
 */
export default function AgendaPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const { appointments, isLoading: loadingAppts, updateStatus, editDetails } = useAppointments();
  const { schedule, isLoading: loadingSchedule } = useSchedule();
  const { staff, isLoading: loadingStaff } = useStaff();
  const {
    blockedSlots,
    isLoading: loadingBlocks,
    create: createBlock,
    remove: removeBlock,
  } = useBlockedSlots();

  const [view, setView] = useState<AgendaView>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [busyAppointment, setBusyAppointment] = useState(false);
  const [blockFormOpen, setBlockFormOpen] = useState(false);

  const isLoading = loadingAppts || loadingSchedule || loadingStaff || loadingBlocks;

  const goToDay = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleConfirm = async (apt: Appointment) => {
    setBusyAppointment(true);
    try {
      await updateStatus(apt.id, 'confirmed');
      toast.success('Cita confirmada.');
      setSelectedAppointment((prev) => (prev && prev.id === apt.id ? { ...prev, status: 'confirmed' } : prev));
    } catch {
      toast.error('No se pudo confirmar la cita.');
    } finally {
      setBusyAppointment(false);
    }
  };

  const handleComplete = async (apt: Appointment) => {
    setBusyAppointment(true);
    try {
      await updateStatus(apt.id, 'completed');
      toast.success('Cita marcada como completada.');
      setSelectedAppointment((prev) => (prev && prev.id === apt.id ? { ...prev, status: 'completed' } : prev));
    } catch {
      toast.error('No se pudo completar la cita.');
    } finally {
      setBusyAppointment(false);
    }
  };

  const handleCancel = async (apt: Appointment) => {
    const ok = await confirm({
      title: 'Cancelar cita',
      description: `¿Cancelar la cita de ${apt.client_name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Cancelar cita',
      danger: true,
    });
    if (!ok) return;
    setBusyAppointment(true);
    try {
      await updateStatus(apt.id, 'cancelled');
      toast.success('Cita cancelada.');
      setSelectedAppointment(null);
    } catch {
      toast.error('No se pudo cancelar la cita.');
    } finally {
      setBusyAppointment(false);
    }
  };

  const handleSaveAppointment = async (apt: Appointment, fields: EditAppointmentFields) => {
    try {
      await editDetails({ id: apt.id, ...fields });
      toast.success('Cita actualizada.');
      setSelectedAppointment((prev) => (prev && prev.id === apt.id ? { ...prev, ...fields } : prev));
    } catch {
      toast.error('No se pudieron guardar los cambios.');
      throw new Error('save-failed');
    }
  };

  const handleCreateBlock = async (input: CreateBlockInput) => {
    try {
      await createBlock(input);
      toast.success('Horario bloqueado.');
    } catch {
      toast.error('No se pudo bloquear el horario.');
      throw new Error('block-failed');
    }
  };

  const handleDeleteBlock = async (block: BlockedSlot) => {
    const ok = await confirm({
      title: 'Quitar bloqueo',
      description: block.reason ? `"${block.reason}"` : '¿Quitar este bloqueo de horario?',
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (!ok) return;
    try {
      await removeBlock(block.id);
      toast.success('Bloqueo eliminado.');
    } catch {
      toast.error('No se pudo eliminar el bloqueo.');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Calendario"
        title="Agenda"
        actions={
          <>
            <Tabs
              value={view}
              onChange={setView}
              items={[
                { value: 'day', label: 'Día' },
                { value: 'week', label: 'Semana' },
                { value: 'month', label: 'Mes' },
              ]}
            />
            <Button
              size="sm"
              variant="secondary"
              icon={<CalendarPlus size={13} strokeWidth={1.5} />}
              onClick={() => setBlockFormOpen(true)}
            >
              Bloquear horario
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          {view === 'day' && (
            <>
              <DayNav date={selectedDate} onChange={setSelectedDate} />
              <DayView
                date={selectedDate}
                schedule={schedule}
                staff={staff}
                appointments={appointments}
                blockedSlots={blockedSlots}
                onSelectAppointment={setSelectedAppointment}
                onDeleteBlock={handleDeleteBlock}
              />
            </>
          )}
          {view === 'week' && (
            <WeekView
              date={selectedDate}
              schedule={schedule}
              appointments={appointments}
              blockedSlots={blockedSlots}
              onSelectDay={goToDay}
              onSelectAppointment={setSelectedAppointment}
              onWeekChange={setSelectedDate}
            />
          )}
          {view === 'month' && (
            <MonthView
              schedule={schedule}
              appointments={appointments}
              blockedSlots={blockedSlots}
              selected={selectedDate}
              onSelect={goToDay}
            />
          )}
        </>
      )}

      <AppointmentDrawer
        appointment={selectedAppointment}
        staff={staff}
        onClose={() => setSelectedAppointment(null)}
        onConfirm={handleConfirm}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onSave={handleSaveAppointment}
        busy={busyAppointment}
      />

      <BlockFormModal
        open={blockFormOpen}
        date={selectedDate}
        onClose={() => setBlockFormOpen(false)}
        onSubmit={handleCreateBlock}
      />
    </div>
  );
}
