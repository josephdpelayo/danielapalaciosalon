// Pure display helpers local to the Agenda screens. Nothing here touches lib/agenda.ts's
// availability math — these just turn its output (DayTimelineBlock[]) into fewer, taller
// visual segments, and derive a small set of shared layout constants so the time gutter and
// every staff column line up pixel-for-pixel.

import { timeToMinutes, minutesToTime } from '@/lib/slots';
import type { DayTimelineBlock, AgendaBlockStatus } from '@/lib/agenda';
import type { BlockedSlot } from '@/lib/types';

/** Size of one timeline row — matches lib/agenda.ts's default blockMinutes. */
export const BLOCK_MINUTES = 30;
/** Pixel height of one BLOCK_MINUTES row. */
export const BLOCK_HEIGHT_PX = 30;
/** Pixel height of the (optional) per-column staff name header, shared with the gutter's spacer. */
export const HEADER_HEIGHT_PX = 40;

export interface TimelineSegment {
  status: AgendaBlockStatus;
  start: string;
  end: string;
  span: number;
  appointmentId: string | null;
  blockedSlot: BlockedSlot | null;
}

/**
 * Merges consecutive DayTimelineBlock rows that share the same status + identity (same
 * appointment, same blocked slot, or just adjacent free/closed/break/absent rows) into one
 * taller visual segment. Cuts DOM node count and reads as a real calendar block instead of a
 * stack of 30-min slivers.
 */
export function mergeBlocksToSegments(blocks: DayTimelineBlock[]): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  for (const b of blocks) {
    const identity = b.appointment?.id ?? b.blockedSlot?.id ?? null;
    const last = segments[segments.length - 1];
    const lastIdentity = last?.appointmentId ?? last?.blockedSlot?.id ?? null;
    if (last && last.status === b.status && lastIdentity === identity && last.end === b.start) {
      last.end = b.end;
      last.span += 1;
    } else {
      segments.push({
        status: b.status,
        start: b.start,
        end: b.end,
        span: 1,
        appointmentId: b.appointment?.id ?? null,
        blockedSlot: b.blockedSlot,
      });
    }
  }
  return segments;
}

/** "HH:MM" labels every BLOCK_MINUTES across [rangeStart, rangeEnd) — feeds the shared gutter. */
export function buildTimeGutter(rangeStart: string, rangeEnd: string): string[] {
  const start = timeToMinutes(rangeStart);
  const end = timeToMinutes(rangeEnd);
  const labels: string[] = [];
  for (let cur = start; cur < end; cur += BLOCK_MINUTES) labels.push(minutesToTime(cur));
  return labels;
}

/**
 * Booking-density color for the month heatmap and week/day summaries — reuses the same
 * emerald/amber/orange/red steps already established by components/ui/badge.tsx's status
 * tones, so the calendar reads consistently with the rest of the admin instead of inventing a
 * new palette.
 */
export function densityColor(count: number): string {
  if (count <= 0) return '#34d399'; // emerald-400 — libre
  if (count <= 2) return '#fbbf24'; // amber-400 — poco
  if (count <= 4) return '#fb923c'; // orange-400 — medio
  return '#f87171'; // red-400 — lleno
}

export function densityLabel(count: number): string {
  if (count <= 0) return 'Libre';
  if (count <= 2) return 'Poco';
  if (count <= 4) return 'Medio';
  return 'Lleno';
}
