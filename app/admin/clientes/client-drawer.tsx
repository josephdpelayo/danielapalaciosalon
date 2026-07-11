'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Star, Pencil, CreditCard, Check, Plus, Minus, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Badge, statusToTone } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { AdminClient, Appointment } from '@/lib/types';

interface ClientDrawerProps {
  client: AdminClient | null;
  history: Appointment[];
  onClose: () => void;
  onSave: (fields: { name: string; email: string | null; notes: string | null }) => Promise<void>;
  onToggleStar: () => Promise<void>;
  onStamp: () => Promise<void>;
  onUnstamp: () => Promise<void>;
  onDelete: () => void;
  starring: boolean;
  stamping: boolean;
  deleting: boolean;
}

/** Único lugar donde vive la ficha de cliente — identidad, lealtad, historial y edición inline. */
export function ClientDrawer({
  client,
  history,
  onClose,
  onSave,
  onToggleStar,
  onStamp,
  onUnstamp,
  onDelete,
  starring,
  stamping,
  deleting,
}: ClientDrawerProps) {
  // El componente se remonta por completo cada vez que cambia el cliente seleccionado
  // (el caller le pasa key={selectedPhone}), así que este estado local puede inicializarse
  // directo desde props sin necesitar un efecto de sincronización.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client?.name ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [notes, setNotes] = useState(client?.trusted_notes ?? '');
  const [saving, setSaving] = useState(false);

  if (!client) return null;

  const waHref = `https://wa.me/${client.phone.replace(/\D/g, '')}`;
  const loyaltyVisits = Math.min(client.loyalty_visits ?? 0, 10);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), email: email.trim() || null, notes: notes.trim() || null });
      setEditing(false);
    } catch {
      // El toast de error ya lo muestra el caller (onSave) — aquí solo evitamos que quede sin capturar.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={!!client} onClose={onClose} title={editing ? 'Editar clienta' : client.name}>
      <div className="space-y-6">
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStar}
            disabled={starring}
            className="p-2 border border-white/10 hover:border-stone/60 transition-colors disabled:opacity-40"
            title={client.is_trusted ? 'Quitar de frecuentes' : 'Marcar como frecuente'}
          >
            {starring ? (
              <Spinner size={14} />
            ) : (
              <Star size={14} strokeWidth={1.5} className={client.is_trusted ? 'text-stone fill-stone' : 'text-muted'} />
            )}
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-white/10 hover:border-stone/60 transition-colors text-muted hover:text-cream"
            title="WhatsApp"
          >
            <MessageCircle size={14} strokeWidth={1.5} />
          </a>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-2 border border-white/10 hover:border-stone/60 transition-colors text-muted hover:text-cream"
              title="Editar"
            >
              <Pencil size={14} strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 border border-white/10 hover:border-red-400/50 transition-colors text-muted hover:text-red-400 disabled:opacity-40 ml-auto"
            title="Eliminar clienta"
          >
            {deleting ? <Spinner size={14} /> : <Trash2 size={14} strokeWidth={1.5} />}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={client.phone} disabled title="El teléfono no se puede editar: es la clave usada por citas, lealtad y clientes de confianza" />
              <p className="text-[10px] text-muted mt-1.5">
                No editable — es la clave que conecta citas, lealtad y clientes de confianza. Para corregirlo, elimina y vuelve a crear.
              </p>
            </div>
            <div>
              <Label>Correo (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {client.is_trusted && (
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSave} loading={saving} disabled={!name.trim()} icon={<Check size={12} />}>
                Guardar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="space-y-1">
              <p className="text-cream text-lg font-[family-name:var(--font-display)] font-light">{client.name}</p>
              <p className="text-[13px] text-stone-light">{client.phone}</p>
              {client.email && <p className="text-[13px] text-muted">{client.email}</p>}
              {client.is_trusted && client.trusted_notes && (
                <p className="text-[12px] text-muted italic pt-1">&ldquo;{client.trusted_notes}&rdquo;</p>
              )}
              <p className="text-[10px] text-muted pt-1">
                Cliente desde {new Date(client.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-white/8 p-3">
                <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1">Visitas</p>
                <p className="text-xl text-cream font-[family-name:var(--font-display)] font-light">{client.visit_count}</p>
              </div>
              <div className="border border-white/8 p-3">
                <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-1">Estado</p>
                <p className="text-xl text-cream font-[family-name:var(--font-display)] font-light">
                  {client.is_trusted ? 'Frecuente' : 'Regular'}
                </p>
              </div>
            </div>

            {/* Loyalty */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] uppercase tracking-[0.25em] text-muted">Tarjeta de lealtad ({client.loyalty_visits ?? 0}/10)</p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onUnstamp}
                    disabled={stamping || (client.loyalty_visits ?? 0) <= 0}
                    className="p-1 border border-white/10 hover:border-stone/60 transition-colors disabled:opacity-30 text-muted hover:text-cream"
                    title="Quitar sello"
                  >
                    <Minus size={12} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={onStamp}
                    disabled={stamping}
                    className="p-1 border border-white/10 hover:border-stone/60 transition-colors disabled:opacity-30 text-muted hover:text-cream"
                    title="Agregar sello"
                  >
                    {stamping ? <Spinner size={12} /> : <Plus size={12} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      i < loyaltyVisits
                        ? 'aspect-square border border-stone bg-stone/20 flex items-center justify-center'
                        : 'aspect-square border border-white/10 flex items-center justify-center'
                    }
                  >
                    {i < loyaltyVisits && <div className="w-2 h-2 rounded-full bg-stone" />}
                  </div>
                ))}
              </div>
              {client.loyalty_token && (
                <Link
                  href={`/tarjeta/${client.loyalty_token}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-stone-light hover:text-cream transition-colors mt-3"
                >
                  <CreditCard size={12} strokeWidth={1.5} />
                  Ver tarjeta pública
                </Link>
              )}
            </div>

            {/* Appointment history */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted mb-3">
                Historial de citas ({history.length})
              </p>
              {history.length === 0 ? (
                <p className="text-[12px] text-muted">Sin citas registradas.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {history.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 border border-white/8 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[13px] text-cream truncate">{a.dp_services?.name ?? 'Servicio'}</p>
                        <p className="text-[11px] text-muted">
                          {new Date(`${a.appointment_date}T00:00:00`).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          · {a.start_time.slice(0, 5)}
                        </p>
                      </div>
                      <Badge tone={statusToTone(a.status)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
