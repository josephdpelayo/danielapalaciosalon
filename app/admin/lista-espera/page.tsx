'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ListTodo, CalendarPlus, BellRing, X } from 'lucide-react';

import {
  PageHeader,
  Tabs,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  statusToTone,
  Button,
  EmptyState,
  Spinner,
  useToast,
} from '@/components/ui';
import { useWaitlist } from '@/lib/hooks/useWaitlist';
import { ApiError } from '@/lib/admin/api-client';
import type { WaitlistEntry } from '@/lib/types';
import { PromoteModal } from './promote-modal';

const STATUS_TABS: { value: WaitlistEntry['status']; label: string }[] = [
  { value: 'waiting', label: 'En espera' },
  { value: 'notified', label: 'Notificados' },
  { value: 'booked', label: 'Agendados' },
  { value: 'cancelled', label: 'Cancelados' },
];

function formatPreferredDate(value: string | null): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), "d 'de' MMM", { locale: es });
  } catch {
    return value;
  }
}

function formatCreatedAt(value: string): string {
  try {
    return format(parseISO(value), "d MMM · HH:mm", { locale: es });
  } catch {
    return value;
  }
}

export default function ListaEsperaPage() {
  const { entries, status, setStatusFilter, isLoading, setStatus, promote, refresh } = useWaitlist('waiting');
  const toast = useToast();
  const [promoteEntry, setPromoteEntry] = useState<WaitlistEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSetStatus = async (entry: WaitlistEntry, next: WaitlistEntry['status']) => {
    setBusyId(entry.id);
    try {
      await setStatus(entry.id, next);
      toast.success(next === 'notified' ? 'Marcado como notificado.' : 'Entrada cancelada.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar la entrada.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Reservas"
        title="Lista de espera"
        description="Clientes esperando un lugar. Promuévelos a una cita real cuando se libere un horario."
      />

      <div className="mb-6">
        <Tabs value={status} onChange={(v) => setStatusFilter(v)} items={STATUS_TABS} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={20} />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No hay entradas en esta categoría"
          description="Las solicitudes de lista de espera del sitio público aparecerán aquí."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Cliente</Th>
              <Th>Servicio</Th>
              <Th>Fecha preferida</Th>
              <Th>Notas</Th>
              <Th>Creado</Th>
              <Th>Estado</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {entries.map((entry) => (
              <Tr key={entry.id}>
                <Td>
                  <p className="text-cream">{entry.client_name}</p>
                  <p className="text-[11px] text-muted mt-0.5">{entry.client_phone}</p>
                </Td>
                <Td>{entry.dp_services?.name ?? '—'}</Td>
                <Td>{formatPreferredDate(entry.preferred_date)}</Td>
                <Td className="max-w-[220px] truncate" title={entry.notes ?? undefined}>
                  {entry.notes || '—'}
                </Td>
                <Td>{formatCreatedAt(entry.created_at)}</Td>
                <Td>
                  <Badge tone={statusToTone(entry.status)} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {(entry.status === 'waiting' || entry.status === 'notified') && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<CalendarPlus size={13} strokeWidth={1.5} />}
                          onClick={() => setPromoteEntry(entry)}
                        >
                          Promover
                        </Button>
                        {entry.status === 'waiting' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<BellRing size={13} strokeWidth={1.5} />}
                            loading={busyId === entry.id}
                            onClick={() => handleSetStatus(entry, 'notified')}
                          >
                            Notificado
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          icon={<X size={13} strokeWidth={1.5} />}
                          loading={busyId === entry.id}
                          onClick={() => handleSetStatus(entry, 'cancelled')}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {promoteEntry && (
        <PromoteModal
          entry={promoteEntry}
          open={!!promoteEntry}
          onClose={() => setPromoteEntry(null)}
          onPromoted={refresh}
          promote={promote}
        />
      )}
    </div>
  );
}
