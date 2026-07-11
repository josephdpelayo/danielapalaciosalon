'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Star, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Input, Select } from '@/components/ui/input';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast-provider';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useClients } from '@/lib/hooks/useClients';
import { useTrustedClients } from '@/lib/hooks/useTrustedClients';
import { useAppointments } from '@/lib/hooks/useAppointments';
import type { AdminClient } from '@/lib/types';
import { ClientDrawer } from './client-drawer';

type ClientFilter = 'todos' | 'frecuentes' | 'nuevos';
type ClientSort = 'visitas' | 'ultima' | 'az' | 'za';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export default function ClientesPage() {
  const {
    clients,
    total,
    page,
    pageSize,
    setPage,
    search,
    setSearch,
    isLoading,
    error,
    refresh,
    update,
    remove,
    stampLoyalty,
    unstampLoyalty,
  } = useClients();
  const { trustedClients, create: createTrusted, update: updateTrusted, remove: removeTrusted } = useTrustedClients();
  const { appointments } = useAppointments();
  const toast = useToast();
  const confirm = useConfirm();

  const [searchInput, setSearchInput] = useState(search);
  const [filter, setFilter] = useState<ClientFilter>('todos');
  const [sort, setSort] = useState<ClientSort>('visitas');
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [starringPhone, setStarringPhone] = useState<string | null>(null);
  const [stampingPhone, setStampingPhone] = useState<string | null>(null);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);

  // Debounce free-text search before hitting the server-side ?search= param.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const lastVisitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of appointments) {
      const norm = normalizePhone(a.client_phone);
      const prev = m.get(norm);
      if (!prev || a.appointment_date > prev) m.set(norm, a.appointment_date);
    }
    return m;
  }, [appointments]);

  const trustedIdByPhone = useMemo(
    () => new Map(trustedClients.map((t) => [t.phone_normalized, t.id])),
    [trustedClients]
  );

  const rows = useMemo(() => {
    let list = clients;
    if (filter === 'frecuentes') list = list.filter((c) => c.is_trusted);
    else if (filter === 'nuevos') list = list.filter((c) => !c.is_trusted);

    list = [...list];
    if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'visitas') list.sort((a, b) => b.visit_count - a.visit_count);
    else if (sort === 'ultima')
      list.sort((a, b) => (lastVisitMap.get(b.phone_normalized) ?? '').localeCompare(lastVisitMap.get(a.phone_normalized) ?? ''));
    return list;
  }, [clients, filter, sort, lastVisitMap]);

  const selectedClient: AdminClient | null = useMemo(
    () => (selectedPhone ? clients.find((c) => c.phone_normalized === selectedPhone) ?? null : null),
    [selectedPhone, clients]
  );

  const selectedHistory = useMemo(() => {
    if (!selectedPhone) return [];
    return appointments
      .filter((a) => normalizePhone(a.client_phone) === selectedPhone)
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
  }, [selectedPhone, appointments]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleStar = async (c: AdminClient) => {
    setStarringPhone(c.phone_normalized);
    try {
      const trustedId = trustedIdByPhone.get(c.phone_normalized);
      if (trustedId) {
        await removeTrusted(trustedId);
        toast.success(`${c.name} ya no es cliente frecuente`);
      } else {
        await createTrusted({ name: c.name, phone: c.phone, email: c.email });
        toast.success(`${c.name} marcada como frecuente`);
      }
      await refresh();
    } catch {
      toast.error('No se pudo actualizar. Intenta de nuevo.');
    } finally {
      setStarringPhone(null);
    }
  };

  const handleSave = async (c: AdminClient, fields: { name: string; email: string | null; notes: string | null }) => {
    try {
      await update(c.phone_normalized, { name: fields.name, email: fields.email });
      // Trusted-client record (name/email/notes) lives in a separate table — keep it in sync
      // when this client is already marked as frequent. Phone is unchanged (not editable here).
      const trustedId = trustedIdByPhone.get(c.phone_normalized);
      if (trustedId) {
        await updateTrusted(trustedId, { name: fields.name, phone: c.phone, email: fields.email, notes: fields.notes });
      }
      await refresh();
      toast.success('Cliente actualizada');
    } catch {
      toast.error('No se pudo guardar los cambios.');
      throw new Error('save failed');
    }
  };

  const handleStamp = async (c: AdminClient) => {
    setStampingPhone(c.phone_normalized);
    try {
      await stampLoyalty(c.phone_normalized);
      toast.success('Sello agregado');
    } catch {
      toast.error('No se pudo agregar el sello.');
    } finally {
      setStampingPhone(null);
    }
  };

  const handleUnstamp = async (c: AdminClient) => {
    setStampingPhone(c.phone_normalized);
    try {
      await unstampLoyalty(c.phone_normalized);
      toast.success('Sello removido');
    } catch {
      toast.error('No se pudo quitar el sello.');
    } finally {
      setStampingPhone(null);
    }
  };

  const handleDelete = async (c: AdminClient) => {
    const ok = await confirm({
      title: `¿Eliminar a ${c.name}?`,
      description: 'Se borrarán sus citas y todos sus datos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    setDeletingPhone(c.phone_normalized);
    try {
      await remove(c.phone_normalized);
      toast.success(`${c.name} eliminada`);
      if (selectedPhone === c.phone_normalized) setSelectedPhone(null);
    } catch {
      toast.error('No se pudo eliminar. Intenta de nuevo.');
    } finally {
      setDeletingPhone(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Directorio"
        title="Clientes"
        description={total > 0 ? `${total} ${total === 1 ? 'clienta registrada' : 'clientas registradas'}` : undefined}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="!pl-9"
          />
        </div>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'todos', label: 'Todos' },
            { value: 'frecuentes', label: 'Frecuentes' },
            { value: 'nuevos', label: 'Nuevos' },
          ]}
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value as ClientSort)} className="md:w-48">
          <option value="visitas">Más visitas</option>
          <option value="ultima">Última visita</option>
          <option value="az">Nombre A-Z</option>
          <option value="za">Nombre Z-A</option>
        </Select>
      </div>

      {error && <p className="text-[12px] text-red-400 mb-4">Error al cargar clientes. Intenta recargar la página.</p>}

      {isLoading ? (
        <div className="border border-white/8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4">
              <SkeletonRow />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin clientas"
          description={search ? 'No hay resultados para tu búsqueda.' : 'Aún no hay clientas registradas.'}
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Clienta</Th>
              <Th>Teléfono</Th>
              <Th>Visitas</Th>
              <Th>Lealtad</Th>
              <Th className="text-right">Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((c) => (
              <Tr key={c.id} className="cursor-pointer" onClick={() => setSelectedPhone(c.phone_normalized)}>
                <Td>
                  <p className="text-cream">{c.name}</p>
                  {c.email && <p className="text-[11px] text-muted">{c.email}</p>}
                </Td>
                <Td className="whitespace-nowrap">{c.phone}</Td>
                <Td>{c.visit_count}</Td>
                <Td className="whitespace-nowrap">{c.loyalty_visits ?? 0}/10</Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleStar(c)}
                      disabled={starringPhone === c.phone_normalized}
                      className="p-1.5 hover:bg-white/5 transition-colors disabled:opacity-40"
                      title={c.is_trusted ? 'Quitar de frecuentes' : 'Marcar como frecuente'}
                    >
                      {starringPhone === c.phone_normalized ? (
                        <Spinner size={13} />
                      ) : (
                        <Star size={13} strokeWidth={1.5} className={c.is_trusted ? 'text-stone fill-stone' : 'text-muted'} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deletingPhone === c.phone_normalized}
                      className="p-1.5 hover:bg-white/5 transition-colors disabled:opacity-40 text-muted hover:text-red-400"
                      title="Eliminar"
                    >
                      {deletingPhone === c.phone_normalized ? <Spinner size={13} /> : <Trash2 size={13} strokeWidth={1.5} />}
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {!isLoading && total > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[11px] text-muted">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1} icon={<ChevronLeft size={12} />}>
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              icon={<ChevronRight size={12} />}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ClientDrawer
        key={selectedPhone ?? 'none'}
        client={selectedClient}
        history={selectedHistory}
        onClose={() => setSelectedPhone(null)}
        onSave={(fields) => handleSave(selectedClient!, fields)}
        onToggleStar={() => toggleStar(selectedClient!)}
        onStamp={() => handleStamp(selectedClient!)}
        onUnstamp={() => handleUnstamp(selectedClient!)}
        onDelete={() => handleDelete(selectedClient!)}
        starring={starringPhone === selectedClient?.phone_normalized}
        stamping={stampingPhone === selectedClient?.phone_normalized}
        deleting={deletingPhone === selectedClient?.phone_normalized}
      />
    </div>
  );
}
