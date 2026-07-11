'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Trash2, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, Button, Input, Label, Spinner, statusToTone, useConfirm, useToast } from '@/components/ui';
import { useStaffAbsences } from '@/lib/hooks/useStaffAbsences';
import { formatTime } from '@/lib/slots';
import type { Appointment, ScheduleConfig, Service, StaffWithDetails } from '@/lib/types';
import { DAYS_ORDER, WeeklyScheduleEditor, type WeeklyScheduleDay } from '../_shared/weekly-schedule-editor';

function waHref(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const number = digits.length >= 12 ? digits : `52${digits.slice(-10)}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function buildFullSchedule(schedule: ScheduleConfig[]): WeeklyScheduleDay[] {
  return DAYS_ORDER.map((dow) => {
    const existing = schedule.find((d) => d.day_of_week === dow);
    return existing
      ? {
          day_of_week: dow,
          is_active: existing.is_active,
          start_time: existing.start_time,
          end_time: existing.end_time,
          break_start: existing.break_start ?? null,
          break_end: existing.break_end ?? null,
        }
      : { day_of_week: dow, is_active: false, start_time: '10:00', end_time: '19:00', break_start: null, break_end: null };
  });
}

interface StaffCardProps {
  member: StaffWithDetails;
  services: Service[];
  appointments: Appointment[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, fields: { name?: string; is_active?: boolean; phone?: string | null }) => Promise<void>;
  onUpdateSchedule: (id: string, schedule: Omit<ScheduleConfig, 'id'>[]) => Promise<void>;
  onUpdateServices: (id: string, serviceIds: string[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function StaffCard({
  member,
  services,
  appointments,
  expanded,
  onToggle,
  onUpdate,
  onUpdateSchedule,
  onUpdateServices,
  onRemove,
}: StaffCardProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [localName, setLocalName] = useState(member.name);
  const [localPhone, setLocalPhone] = useState(member.phone ?? '');
  const [localSvcs, setLocalSvcs] = useState<string[]>(member.service_ids);
  const [localSched, setLocalSched] = useState<WeeklyScheduleDay[]>(() => buildFullSchedule(member.schedule));

  const [profileDirty, setProfileDirty] = useState(false);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [servicesDirty, setServicesDirty] = useState(false);
  const dirty = profileDirty || scheduleDirty || servicesDirty;

  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Re-sync local edit buffers when `member` gets a new reference (fresh data after
  // save/refresh) — adjusted during render per React's guidance instead of in an effect,
  // so switching staff or landing new server data doesn't cause an extra render pass.
  const [syncedMember, setSyncedMember] = useState(member);
  if (syncedMember !== member) {
    setSyncedMember(member);
    setLocalName(member.name);
    setLocalPhone(member.phone ?? '');
    setLocalSvcs(member.service_ids);
    setLocalSched(buildFullSchedule(member.schedule));
    setProfileDirty(false);
    setScheduleDirty(false);
    setServicesDirty(false);
  }

  const updateDay = (dow: number, updates: Partial<WeeklyScheduleDay>) => {
    setLocalSched((prev) => prev.map((d) => (d.day_of_week === dow ? { ...d, ...updates } : d)));
    setScheduleDirty(true);
  };

  const toggleSvc = (id: string) => {
    setLocalSvcs((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setServicesDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (profileDirty) tasks.push(onUpdate(member.id, { name: localName.trim(), phone: localPhone.trim() || null }));
      if (scheduleDirty) tasks.push(onUpdateSchedule(member.id, localSched));
      if (servicesDirty) tasks.push(onUpdateServices(member.id, localSvcs));
      await Promise.all(tasks);
      toast.success('Cambios guardados.');
      setProfileDirty(false);
      setScheduleDirty(false);
      setServicesDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const next = !member.is_active;
    if (!next) {
      const ok = await confirm({
        title: `¿Desactivar a ${member.name}?`,
        description: 'Dejará de aparecer en el sistema de reservas. Las citas futuras ya asignadas no se reasignan automáticamente.',
        confirmLabel: 'Desactivar',
        danger: true,
      });
      if (!ok) return;
    }
    setToggling(true);
    try {
      await onUpdate(member.id, { is_active: next });
      toast.success(next ? `${member.name} activada.` : `${member.name} desactivada.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `¿Eliminar a ${member.name}?`,
      description: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await onRemove(member.id);
      toast.success(`${member.name} eliminada.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
      setDeleting(false);
    }
  };

  const upcomingAppts = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments
      .filter((a) => a.staff_id === member.id && a.status !== 'cancelled' && a.appointment_date >= today)
      .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time))
      .slice(0, 5);
  }, [appointments, member.id]);

  const activeDays = member.schedule.filter((d) => d.is_active).length;

  return (
    <div className="bg-surface border border-white/8">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-[11px] text-stone font-semibold">{member.name[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-cream truncate">{member.name}</p>
            <p className="text-[10px] text-muted mt-0.5 truncate">
              {member.service_ids.length} servicios · {activeDays} días activos
              {member.phone && (
                <>
                  {' · '}
                  <a
                    href={waHref(member.phone, `Hola ${member.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-stone-light hover:text-cream hover:underline"
                  >
                    {member.phone}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={cn('w-1.5 h-1.5 rounded-full', member.is_active ? 'bg-emerald-400' : 'bg-white/20')} />
          {expanded ? (
            <ChevronUp size={14} strokeWidth={1.5} className="text-muted" />
          ) : (
            <ChevronDown size={14} strokeWidth={1.5} className="text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 p-4 md:p-5 space-y-6">
          {/* Nombre / teléfono */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={localName}
                onChange={(e) => {
                  setLocalName(e.target.value);
                  setProfileDirty(true);
                }}
              />
            </div>
            <div>
              <Label>Teléfono (WhatsApp)</Label>
              <Input
                value={localPhone}
                onChange={(e) => {
                  setLocalPhone(e.target.value);
                  setProfileDirty(true);
                }}
                placeholder="Ej. 6691234567"
              />
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cream">Activa</p>
              <p className="text-[11px] text-muted mt-0.5">Aparece en el sistema de reservas</p>
            </div>
            <div className="flex items-center gap-2">
              {toggling && <Spinner size={13} />}
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className={cn(
                  'w-9 h-5 rounded-full relative transition-colors shrink-0 disabled:opacity-40',
                  member.is_active ? 'bg-stone' : 'bg-white/10'
                )}
                aria-label={member.is_active ? 'Desactivar' : 'Activar'}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-cream transition-all',
                    member.is_active ? 'left-4' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Servicios */}
          <div>
            <Label>Servicios que puede realizar</Label>
            {services.length === 0 ? (
              <p className="text-[12px] text-muted py-2">No hay servicios configurados.</p>
            ) : (
              <div className="space-y-0.5">
                {services.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSvcs.includes(svc.id)}
                      onChange={() => toggleSvc(svc.id)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'w-4 h-4 border flex items-center justify-center shrink-0 transition-colors',
                        localSvcs.includes(svc.id)
                          ? 'bg-cream border-cream'
                          : 'border-white/15 group-hover:border-stone/50'
                      )}
                    >
                      {localSvcs.includes(svc.id) && <Check size={10} strokeWidth={3} className="text-background" />}
                    </span>
                    <span className="text-sm text-cream">{svc.name}</span>
                    {svc.category && <span className="text-[10px] text-muted">{svc.category}</span>}
                    {!svc.active && <span className="text-[9px] uppercase tracking-[0.1em] text-muted/70">Inactivo</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Horario */}
          <div>
            <Label>Horario semanal</Label>
            <WeeklyScheduleEditor days={localSched} onChange={updateDay} allowBreaks />
          </div>

          {dirty && (
            <Button onClick={handleSave} loading={saving} size="sm" icon={<Check size={12} />}>
              Guardar cambios
            </Button>
          )}

          {/* Ausencias */}
          <StaffAbsences staffId={expanded ? member.id : null} />

          {/* Próximas citas */}
          <div>
            <Label>Próximas citas</Label>
            {upcomingAppts.length === 0 ? (
              <p className="text-[12px] text-muted py-2">Sin citas próximas asignadas.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 border border-white/8 bg-surface-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-cream font-medium truncate">{apt.client_name}</p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {format(parseISO(apt.appointment_date + 'T12:00:00'), 'd MMM', { locale: es })} ·{' '}
                        {formatTime(apt.start_time)} · {apt.dp_services?.name ?? '—'}
                      </p>
                    </div>
                    <Badge tone={statusToTone(apt.status)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="pt-2 border-t border-white/8">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-[10px] tracking-[0.15em] uppercase disabled:opacity-40"
            >
              {deleting ? <Spinner size={11} /> : <Trash2 size={11} strokeWidth={1.5} />}
              Eliminar estilista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ausencias por rango — solo se monta (y consulta) cuando la card está expandida. */
function StaffAbsences({ staffId }: { staffId: string | null }) {
  const toast = useToast();
  const { absences, addRange, remove } = useStaffAbsences(staffId);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rangeMode, setRangeMode] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!date) return;
    setAdding(true);
    try {
      const isRange = rangeMode && !!endDate;
      const result = await addRange(date, isRange ? endDate : undefined);
      if (isRange) {
        if (result.conflicts.length > 0) {
          const list = result.conflicts
            .map((c) => format(parseISO(c.date + 'T12:00:00'), 'd MMM', { locale: es }))
            .join(', ');
          toast.info(
            `${result.created} día(s) marcados. ${result.conflicts.length} día(s) tenían citas y no se marcaron: ${list}`
          );
        } else {
          toast.success(`${result.created} día(s) marcados como ausencia.`);
        }
      } else {
        toast.success('Día marcado como ausencia.');
      }
      setDate('');
      setEndDate('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al marcar ausencia');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (absenceDate: string) => {
    try {
      await remove(absenceDate);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar ausencia');
    }
  };

  return (
    <div>
      <Label>Días de ausencia</Label>
      {absences.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {absences.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5 border border-white/10 px-2 py-1 text-xs text-cream">
              {format(parseISO(a.absence_date + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
              <button
                onClick={() => handleRemove(a.absence_date)}
                className="text-muted hover:text-red-400 transition-colors"
                aria-label="Eliminar ausencia"
              >
                <X size={11} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted py-2">Sin ausencias programadas.</p>
      )}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={rangeMode}
            onChange={(e) => {
              setRangeMode(e.target.checked);
              setEndDate('');
            }}
            className="accent-stone"
          />
          Rango de fechas
        </label>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent border border-white/10 text-cream px-2 py-1.5 text-sm focus:outline-none focus:border-stone/60"
          />
          {rangeMode && (
            <>
              <span className="text-muted text-xs">Hasta</span>
              <input
                type="date"
                value={endDate}
                min={date || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border border-white/10 text-cream px-2 py-1.5 text-sm focus:outline-none focus:border-stone/60"
              />
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            loading={adding}
            disabled={!date || (rangeMode && !endDate)}
            icon={<Plus size={11} />}
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
