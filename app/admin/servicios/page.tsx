'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Power, Scissors } from 'lucide-react';
import { useServices } from '@/lib/hooks/useServices';
import type { Service } from '@/lib/types';
import { formatDuration, formatPrice } from '@/lib/slots';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FieldError,
  Input,
  Label,
  Modal,
  Select,
  Spinner,
  Textarea,
  PageHeader,
  useConfirm,
  useToast,
} from '@/components/ui';

const FALLBACK_CATEGORY = 'Otros';
const NEW_CATEGORY_VALUE = '__new__';

interface FormState {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  active_minutes: string;
  deposit_amount: string;
  category: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  duration_minutes: '',
  active_minutes: '',
  deposit_amount: '200',
  category: '',
};

function toFormState(svc: Service): FormState {
  return {
    name: svc.name,
    description: svc.description ?? '',
    price: svc.price != null ? String(svc.price) : '',
    duration_minutes: String(svc.duration_minutes),
    active_minutes: String(svc.active_minutes),
    deposit_amount: String(svc.deposit_amount ?? 200),
    category: svc.category ?? '',
  };
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('es-MX')}`;
}

/** Barra visual: cuánto del servicio ocupa a Daniela vs. tiempo de "procesando" en el que podría atender a alguien más. */
function GapBar({ duration, active }: { duration: number; active: number }) {
  const gap = Math.max(0, duration - active);
  const activePct = duration > 0 ? Math.min(100, (active / duration) * 100) : 0;
  return (
    <div>
      <div className="flex h-1 w-full overflow-hidden bg-white/5">
        <div className="bg-stone" style={{ width: `${activePct}%` }} />
        {gap > 0 && <div className="bg-white/15" style={{ width: `${100 - activePct}%` }} />}
      </div>
      <div className="flex justify-between gap-3 text-[10px] text-muted mt-1">
        <span>{formatDuration(active)} contigo</span>
        {gap > 0 && <span>{formatDuration(gap)} procesando</span>}
      </div>
    </div>
  );
}

interface ServiceRowProps {
  service: Service;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}

function ServiceRow({ service, isFirst, isLast, busy, onMoveUp, onMoveDown, onEdit, onDeactivate }: ServiceRowProps) {
  const gap = Math.max(0, service.duration_minutes - service.active_minutes);
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1 pt-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst || busy}
            className="text-muted hover:text-cream disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Mover arriba"
            title="Mover arriba"
          >
            <ArrowUp size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast || busy}
            className="text-muted hover:text-cream disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Mover abajo"
            title="Mover abajo"
          >
            <ArrowDown size={13} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <span className="font-[family-name:var(--font-display)] font-light text-cream text-base">{service.name}</span>
            <span className="text-stone-light text-sm">{formatPrice(service.price)}</span>
            <span className="text-muted text-[11px]">anticipo {formatMoney(service.deposit_amount ?? 0)}</span>
          </div>
          {service.description && <p className="text-muted text-[12px] mb-2">{service.description}</p>}
          <div className="max-w-xs">
            <GapBar duration={service.duration_minutes} active={service.active_minutes} />
          </div>
          {gap > 0 && (
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted mt-1.5">
              Siguiente cita posible {formatDuration(service.active_minutes)} después del inicio
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {busy && <Spinner size={12} />}
          <button
            onClick={onEdit}
            disabled={busy}
            className="p-2 text-muted hover:text-stone transition-colors disabled:opacity-40"
            aria-label="Editar servicio"
            title="Editar"
          >
            <Pencil size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={onDeactivate}
            disabled={busy}
            className="p-2 text-muted hover:text-red-400 transition-colors disabled:opacity-40"
            aria-label="Desactivar servicio"
            title="Desactivar"
          >
            <Power size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function ServiciosPage() {
  const { services, isLoading, error, create, update, deactivate, reorder } = useServices();
  const toast = useToast();
  const confirm = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing');
  const [busyId, setBusyId] = useState<string | null>(null);

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [services]);

  const groups = useMemo(() => {
    const map = new Map<string, Service[]>();
    [...services]
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((s) => {
        const key = s.category?.trim() || FALLBACK_CATEGORY;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      });
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === FALLBACK_CATEGORY) return 1;
      if (b === FALLBACK_CATEGORY) return -1;
      return a.localeCompare(b, 'es');
    });
    return keys.map((key) => ({ category: key, items: map.get(key)! }));
  }, [services]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setCategoryMode('existing');
    setModalOpen(true);
  }

  function openEdit(svc: Service) {
    setEditing(svc);
    setForm(toFormState(svc));
    setFormError('');
    setCategoryMode(svc.category && !existingCategories.includes(svc.category) ? 'new' : 'existing');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setFormError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    const dur = parseInt(form.duration_minutes, 10);
    const act = parseInt(form.active_minutes, 10);
    const price = parseFloat(form.price);

    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (!price || price <= 0) {
      setFormError('Ingresa un precio válido');
      return;
    }
    if (!dur || dur <= 0) {
      setFormError('Ingresa una duración total válida');
      return;
    }
    if (!act || act <= 0) {
      setFormError('Ingresa el tiempo activo (contigo)');
      return;
    }
    if (act > dur) {
      setFormError('El tiempo activo no puede superar la duración total');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      duration_minutes: dur,
      active_minutes: act,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : 200,
      category: form.category.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Servicio actualizado');
      } else {
        await create(payload);
        toast.success('Servicio creado');
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el servicio');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(svc: Service) {
    const ok = await confirm({
      title: 'Desactivar servicio',
      description: `"${svc.name}" dejará de mostrarse en reservas y en este listado. Reactivarlo no está disponible desde este panel todavía.`,
      confirmLabel: 'Desactivar',
      danger: true,
    });
    if (!ok) return;
    setBusyId(svc.id);
    try {
      await deactivate(svc.id);
      toast.success('Servicio desactivado');
    } catch {
      toast.error('No se pudo desactivar el servicio');
    } finally {
      setBusyId(null);
    }
  }

  async function move(category: string, index: number, direction: -1 | 1) {
    const group = groups.find((g) => g.category === category);
    if (!group) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= group.items.length) return;

    const reordered = [...group.items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const movedId = group.items[index].id;

    setBusyId(movedId);
    try {
      await reorder(reordered.map((s) => s.id));
    } catch {
      toast.error('No se pudo reordenar');
    } finally {
      setBusyId(null);
    }
  }

  const durPreview = parseInt(form.duration_minutes, 10) || 0;
  const actPreview = parseInt(form.active_minutes, 10) || 0;

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Servicios"
        description="Precios, tiempos y agrupación por categoría. El tiempo contigo define cuándo puede iniciar la siguiente cita."
        actions={
          <Button onClick={openCreate} icon={<Plus size={14} strokeWidth={1.5} />}>
            Nuevo servicio
          </Button>
        }
      />

      <p className="text-[11px] text-muted mb-6 max-w-2xl">
        Solo se muestran servicios activos. Desactivar un servicio lo oculta de reservas y de esta lista; reactivarlo no
        está disponible todavía desde este panel.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size={20} />
        </div>
      )}

      {!isLoading && error && (
        <p className="text-[13px] text-red-400">No se pudieron cargar los servicios. Intenta recargar la página.</p>
      )}

      {!isLoading && !error && services.length === 0 && (
        <EmptyState
          icon={Scissors}
          title="Todavía no hay servicios"
          description="Crea el primero para que aparezca en la página de reservas."
          action={
            <Button onClick={openCreate} icon={<Plus size={14} strokeWidth={1.5} />}>
              Nuevo servicio
            </Button>
          }
        />
      )}

      {!isLoading && !error && services.length > 0 && (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.category}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-stone">{group.category}</h2>
                <div className="h-px flex-1 bg-white/8" />
                <Badge tone="neutral">{group.items.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((svc, i) => (
                  <ServiceRow
                    key={svc.id}
                    service={svc}
                    isFirst={i === 0}
                    isLast={i === group.items.length - 1}
                    busy={busyId === svc.id}
                    onMoveUp={() => move(group.category, i, -1)}
                    onMoveDown={() => move(group.category, i, 1)}
                    onEdit={() => openEdit(svc)}
                    onDeactivate={() => handleDeactivate(svc)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar servicio' : 'Nuevo servicio'}
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" form="service-form" size="sm" loading={saving}>
              {editing ? 'Actualizar' : 'Crear servicio'}
            </Button>
          </>
        }
      >
        <form id="service-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="svc-name">Nombre *</Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Mechas / Balayage"
            />
          </div>

          <div>
            <Label htmlFor="svc-description">
              Descripción <span className="normal-case tracking-normal text-white/30">— opcional</span>
            </Label>
            <Textarea
              id="svc-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Breve descripción para la clienta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="svc-price">Precio total (MXN) *</Label>
              <Input
                id="svc-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="1400"
              />
            </div>
            <div>
              <Label htmlFor="svc-deposit">Anticipo (MXN)</Label>
              <Input
                id="svc-deposit"
                type="number"
                min="0"
                value={form.deposit_amount}
                onChange={(e) => setForm((f) => ({ ...f, deposit_amount: e.target.value }))}
                placeholder="200"
              />
            </div>
            <div>
              <Label htmlFor="svc-duration">Duración total (min) *</Label>
              <Input
                id="svc-duration"
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                placeholder="240"
              />
            </div>
            <div>
              <Label htmlFor="svc-active">Tiempo contigo (min) *</Label>
              <Input
                id="svc-active"
                type="number"
                min="1"
                value={form.active_minutes}
                onChange={(e) => setForm((f) => ({ ...f, active_minutes: e.target.value }))}
                placeholder="120"
              />
            </div>
          </div>

          {durPreview > 0 && actPreview > 0 && (
            <div className="border border-white/8 p-3 bg-white/[0.02]">
              <GapBar duration={durPreview} active={actPreview} />
              {durPreview - actPreview > 0 && (
                <p className="text-[11px] text-muted mt-2">
                  Daniela puede recibir otra cita {formatDuration(actPreview)} después de iniciar esta.
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="svc-category">Categoría</Label>
            <Select
              id="svc-category"
              value={categoryMode === 'new' ? NEW_CATEGORY_VALUE : form.category}
              onChange={(e) => {
                const val = e.target.value;
                if (val === NEW_CATEGORY_VALUE) {
                  setCategoryMode('new');
                  setForm((f) => ({ ...f, category: '' }));
                } else {
                  setCategoryMode('existing');
                  setForm((f) => ({ ...f, category: val }));
                }
              }}
            >
              <option value="">Sin categoría</option>
              {existingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>+ Nueva categoría…</option>
            </Select>
            {categoryMode === 'new' && (
              <Input
                className="mt-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Nombre de la nueva categoría"
              />
            )}
            <p className="text-[11px] text-muted mt-1.5">
              La API de servicios todavía no guarda este campo al crear o editar — queda listo para cuando se habilite.
            </p>
          </div>

          <FieldError>{formError}</FieldError>
        </form>
      </Modal>
    </div>
  );
}
