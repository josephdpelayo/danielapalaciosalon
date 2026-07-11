'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button, EmptyState, Input, Label, PageHeader, Spinner, useToast } from '@/components/ui';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { useServices } from '@/lib/hooks/useServices';
import { useStaff } from '@/lib/hooks/useStaff';
import { StaffCard } from './staff-card';

export default function StaffPage() {
  const { staff, isLoading, create, update, updateSchedule, updateServices, remove } = useStaff();
  const { services } = useServices();
  const { appointments } = useAppointments();
  const toast = useToast();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);
    try {
      const created = await create({ name: newName.trim(), phone: newPhone.trim() || null });
      toast.success(`${created.name} agregada.`);
      setNewName('');
      setNewPhone('');
      setExpandedId(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al agregar estilista');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Equipo" title="Staff" description="Estilistas, horarios y disponibilidad" />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner size={20} />
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin staff configurado"
          description="Agrega a tu primera estilista para comenzar a recibir citas."
        />
      ) : (
        <div className="space-y-3 mb-6">
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              services={services}
              appointments={appointments}
              expanded={expandedId === member.id}
              onToggle={() => setExpandedId((cur) => (cur === member.id ? null : member.id))}
              onUpdate={update}
              onUpdateSchedule={updateSchedule}
              onUpdateServices={updateServices}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      <div className="bg-surface border border-white/8 p-4 md:p-5">
        <p className="text-[9px] uppercase tracking-[0.3em] text-muted mb-3">Agregar estilista</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Label>Nombre</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nombre"
            />
          </div>
          <div className="flex-1">
            <Label>Teléfono (WhatsApp)</Label>
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ej. 6691234567"
            />
          </div>
          <Button onClick={handleAdd} loading={adding} disabled={!newName.trim()} icon={<Plus size={12} />}>
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
