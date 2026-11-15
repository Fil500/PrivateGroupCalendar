import { useMemo } from 'react';
import { addDays, differenceInCalendarDays, endOfMonth, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent } from '../../shared/types';
import { COLORS } from '../lib/colors';
import { WEEKDAYS, WEEK_OPTS, dateKey, eventsOnDay, timeOf } from '../lib/date';
import { cx } from '../lib/util';

interface Props {
  cursor: Date;
  events: CalendarEvent[];
  onDayClick: (day: string) => void;
  onEventClick: (ev: CalendarEvent) => void;
}

export default function MonthView({ cursor, events, onDayClick, onEventClick }: Props) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, WEEK_OPTS);
    const weeks = Math.ceil((differenceInCalendarDays(endOfMonth(cursor), gridStart) + 1) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  return (
    <div>
      <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-slate-200 bg-white/95 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
        {days.map((d) => {
          const key = dateKey(d);
          const items = eventsOnDay(events, key);
          const inMonth = isSameMonth(d, cursor);
          const today = isToday(d);
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${format(d, 'EEEE, d. MMMM', { locale: de })}, ${items.length} Termine – neuen Termin anlegen`}
              onClick={() => onDayClick(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick(key);
                }
              }}
              className={cx(
                'flex min-h-[4.75rem] min-w-0 cursor-pointer flex-col gap-0.5 border-b border-r border-slate-200 p-0.5 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-rose-50 dark:border-slate-800 dark:hover:bg-slate-900 md:min-h-[7.5rem] md:p-1',
                !inMonth && 'bg-slate-50/70 dark:bg-slate-900/40',
              )}
            >
              <span
                className={cx(
                  'mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] md:mx-0 md:h-7 md:w-7 md:text-sm',
                  today && 'bg-rose-500 font-semibold text-white',
                  !today && !inMonth && 'text-slate-400 dark:text-slate-600',
                )}
              >
                {format(d, 'd')}
              </span>

              {items.slice(0, 4).map((ev, i) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                  className={cx(
                    'block w-full truncate rounded px-1 text-left text-[10px] font-medium leading-4 md:text-xs md:leading-5',
                    COLORS[ev.color].chip,
                    i === 3 && 'hidden md:block',
                    !inMonth && 'opacity-60',
                  )}
                >
                  {!ev.allDay && <span className="mr-1 hidden tabular-nums opacity-75 md:inline">{timeOf(ev.start)}</span>}
                  {ev.title}
                </button>
              ))}
              {items.length > 3 && (
                <span className="px-1 text-[10px] font-medium text-slate-500 md:hidden">+{items.length - 3}</span>
              )}
              {items.length > 4 && (
                <span className="hidden px-1 text-xs font-medium text-slate-500 md:block">+{items.length - 4} weitere</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
