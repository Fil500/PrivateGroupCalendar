import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { format, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent } from '../../shared/types';
import { COLORS } from '../lib/colors';
import { dateKey, eventsOnDay, pad, timeOf } from '../lib/date';
import { layoutDay } from '../lib/layout';
import { cx } from '../lib/util';

const HOUR = 52; // Pixel pro Stunde
const SCROLL_TO_HOUR = 6;

interface Props {
  days: Date[];
  events: CalendarEvent[];
  onSlotClick: (day: string, minutes: number) => void;
  onEventClick: (ev: CalendarEvent) => void;
  onDayClick?: (day: string) => void;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Zeitraster für Wochen- (7 Tage) und Tagesansicht (1 Tag). */
export default function TimeGrid({ days, events, onSlotClick, onEventClick, onDayClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNow();
  const single = days.length === 1;

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR - 8;
  }, []);

  const columns = useMemo(
    () =>
      days.map((d) => {
        const key = dateKey(d);
        return { date: d, key, allDay: eventsOnDay(events, key).filter((e) => e.allDay), placed: layoutDay(events, key) };
      }),
    [days, events],
  );
  const hasAllDay = columns.some((c) => c.allDay.length > 0);

  const handleColumnClick = (e: MouseEvent<HTMLDivElement>, day: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const halfHours = Math.floor(((e.clientY - rect.top) / HOUR) * 2);
    onSlotClick(day, Math.min(Math.max(halfHours, 0), 47) * 30);
  };

  const gutter = 'w-12 shrink-0 md:w-14';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tageskopf */}
      <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800">
        <div className={gutter} />
        {columns.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onDayClick?.(c.key)}
            className={cx('min-w-0 flex-1 py-2', single ? 'cursor-default text-left' : 'text-center')}
          >
            <div className="text-[11px] font-medium uppercase text-slate-500">
              {format(c.date, single ? 'EEEE' : 'EEE', { locale: de })}
            </div>
            <div
              className={cx(
                'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold',
                !single && 'mx-auto',
                isToday(c.date) && 'bg-rose-500 text-white',
              )}
            >
              {format(c.date, 'd')}
            </div>
          </button>
        ))}
      </div>

      {/* Ganztägige Termine */}
      {hasAllDay && (
        <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className={cx(gutter, 'py-1 pr-1.5 text-right text-[10px] leading-5 text-slate-400')}>ganztg.</div>
          {columns.map((c) => (
            <div key={c.key} className="min-w-0 flex-1 space-y-0.5 border-l border-slate-200 p-0.5 dark:border-slate-800">
              {c.allDay.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className={cx('block w-full truncate rounded px-1 text-left text-[11px] font-medium leading-5', COLORS[ev.color].chip)}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Stundenraster */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-20">
        <div className="relative flex" style={{ height: 24 * HOUR }}>
          <div className={cx(gutter, 'relative')}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <div
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-slate-400"
                style={{ top: h * HOUR }}
              >
                {pad(h)}:00
              </div>
            ))}
          </div>

          <div className="relative flex flex-1">
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ top: h * HOUR }} className="absolute inset-x-0">
                  <div className="border-t border-slate-200 dark:border-slate-800" />
                  <div
                    style={{ marginTop: HOUR / 2 - 1 }}
                    className="border-t border-dashed border-slate-100 dark:border-slate-900"
                  />
                </div>
              ))}
            </div>

            {columns.map((c) => {
              const showNow = isToday(c.date);
              return (
                <div
                  key={c.key}
                  className="relative min-w-0 flex-1 cursor-pointer border-l border-slate-200 dark:border-slate-800"
                  onClick={(e) => handleColumnClick(e, c.key)}
                >
                  {c.placed.map(({ ev, startMin, endMin, col, cols }) => {
                    const height = Math.max(((endMin - startMin) / 60) * HOUR, 20);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev);
                        }}
                        style={{
                          top: (startMin / 60) * HOUR + 1,
                          height: height - 2,
                          left: `calc(${(col / cols) * 100}% + 1px)`,
                          width: `calc(${100 / cols}% - 3px)`,
                        }}
                        className={cx(
                          'absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm transition hover:brightness-95 md:text-xs',
                          COLORS[ev.color].block,
                        )}
                      >
                        <div className="truncate font-semibold">{ev.title}</div>
                        {height >= 36 && (
                          <div className="truncate tabular-nums opacity-80">
                            {timeOf(ev.start)} – {timeOf(ev.end)}
                          </div>
                        )}
                        {single && height >= 60 && ev.notes && <div className="mt-0.5 line-clamp-2 opacity-70">{ev.notes}</div>}
                      </button>
                    );
                  })}

                  {showNow && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-rose-500"
                      style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }}
                    >
                      <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
