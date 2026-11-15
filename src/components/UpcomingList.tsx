import { useMemo } from 'react';
import { addDays, addMonths, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent } from '../../shared/types';
import { COLORS } from '../lib/colors';
import { dateKey, eventTimeLabel, eventsOnDay, parseLocal } from '../lib/date';
import { cx } from '../lib/util';

interface Props {
  cursor: Date;
  events: CalendarEvent[];
  onEventClick: (ev: CalendarEvent) => void;
}

/** Agenda für den angezeigten und den folgenden Monat (im aktuellen Monat ab heute). */
export default function UpcomingList({ cursor, events, onEventClick }: Props) {
  const today = dateKey(new Date());
  const from = isSameMonth(cursor, new Date()) ? today : dateKey(startOfMonth(cursor));
  const to = dateKey(endOfMonth(addMonths(cursor, 1)));

  const groups = useMemo(() => {
    const out: { day: string; items: CalendarEvent[] }[] = [];
    for (let d = parseLocal(from); dateKey(d) <= to; d = addDays(d, 1)) {
      const key = dateKey(d);
      const items = eventsOnDay(events, key);
      if (items.length) out.push({ day: key, items });
    }
    return out;
  }, [events, from, to]);

  const heading = `${format(cursor, 'LLLL', { locale: de })} & ${format(addMonths(cursor, 1), 'LLLL', { locale: de })}`;

  return (
    <section className="px-4 py-5 pb-24">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Termine {heading}
      </h2>
      {groups.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-900">
          Noch nichts geplant. Tippe auf einen Tag, um einen Termin anzulegen.
        </p>
      ) : (
        <ol className="space-y-4">
          {groups.map((g) => (
            <li key={g.day}>
              <div className={cx('mb-1.5 px-1 text-sm font-semibold', g.day === today && 'text-rose-600 dark:text-rose-400')}>
                {g.day === today && 'Heute · '}
                {format(parseLocal(g.day), 'EEEE, d. MMMM', { locale: de })}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onEventClick(ev)}
                      className="flex w-full items-stretch gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100 active:scale-[0.99] dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <span className={cx('w-1 shrink-0 rounded-full', COLORS[ev.color].dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{ev.title}</span>
                        <span className="block text-xs tabular-nums text-slate-500 dark:text-slate-400">{eventTimeLabel(ev)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
