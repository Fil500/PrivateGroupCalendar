import type { CalendarEvent } from '../../shared/types';
import { nextDayKey, toMinutes, timeOf } from './date';

export interface PlacedEvent {
  ev: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

/** Mindesthöhe für die Überlappungsberechnung (sehr kurze Termine bekommen trotzdem Platz). */
const MIN_SPAN = 20;

/**
 * Verteilt die zeitgebundenen Termine eines Tages auf Spalten, damit sich
 * überschneidende Termine nebeneinander statt übereinander erscheinen.
 */
export function layoutDay(events: CalendarEvent[], day: string): PlacedEvent[] {
  const dayStart = `${day}T00:00`;
  const dayEnd = `${nextDayKey(day)}T00:00`;

  const items: PlacedEvent[] = events
    .filter((ev) => !ev.allDay && ev.start < dayEnd && (ev.end > dayStart || ev.start >= dayStart))
    .map((ev) => ({
      ev,
      startMin: ev.start < dayStart ? 0 : toMinutes(timeOf(ev.start)),
      endMin: ev.end >= dayEnd ? 1440 : toMinutes(timeOf(ev.end)),
      col: 0,
      cols: 1,
    }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const colEnds: number[] = [];
    for (const it of cluster) {
      let col = colEnds.findIndex((end) => end <= it.startMin);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(0);
      }
      colEnds[col] = Math.max(it.endMin, it.startMin + MIN_SPAN);
      it.col = col;
    }
    for (const it of cluster) it.cols = colEnds.length;
    result.push(...cluster);
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length && it.startMin >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin, it.startMin + MIN_SPAN);
  }
  flush();
  return result;
}
