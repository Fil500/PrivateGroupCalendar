import { addDays, format } from 'date-fns';
import type { CalendarEvent } from '../../shared/types';

export const WEEK_OPTS = { weekStartsOn: 1 } as const;
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');
export const fmtIso = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
export const dayOf = (iso: string) => iso.slice(0, 10);
export const timeOf = (iso: string) => iso.slice(11, 16);
export const toMinutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
export const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/**
 * Parst 'YYYY-MM-DD' oder 'YYYY-MM-DDTHH:MM' als lokale Zeit.
 * (Bewusst manuell: ältere Safari-Versionen interpretieren ISO-Strings ohne Offset als UTC.)
 */
export function parseLocal(iso: string): Date {
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
  const [h, mi] = (iso.slice(11, 16) || '00:00').split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

export const nextDayKey = (day: string) => dateKey(addDays(parseLocal(day), 1));

export function addMinutesIso(iso: string, minutes: number): string {
  const d = parseLocal(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return fmtIso(d);
}

/** Baut Start/Ende für einen Tag. Endzeit vor Startzeit = Termin endet am Folgetag (Nachtschicht). */
export function buildRange(day: string, startTime: string, endTime: string) {
  const start = `${day}T${startTime}`;
  const end = endTime < startTime ? `${nextDayKey(day)}T${endTime}` : `${day}T${endTime}`;
  return { start, end };
}

export function occursOn(ev: CalendarEvent, day: string): boolean {
  const dayStart = `${day}T00:00`;
  const dayEnd = `${nextDayKey(day)}T00:00`;
  return ev.start < dayEnd && (ev.end > dayStart || ev.start >= dayStart);
}

export const eventsOnDay = (events: CalendarEvent[], day: string) => events.filter((ev) => occursOn(ev, day));

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (a, b) =>
      dayOf(a.start).localeCompare(dayOf(b.start)) ||
      Number(b.allDay) - Number(a.allDay) ||
      a.start.localeCompare(b.start) ||
      a.end.localeCompare(b.end),
  );
}

export const eventTimeLabel = (ev: Pick<CalendarEvent, 'allDay' | 'start' | 'end'>) =>
  ev.allDay ? 'Ganztägig' : `${timeOf(ev.start)} – ${timeOf(ev.end)}`;
