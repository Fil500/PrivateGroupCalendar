import { useMemo, useState } from 'react';
import { addDays, addMonths, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import type { EventInput, Template } from '../../shared/types';
import { WEEKDAYS, WEEK_OPTS, dateKey, parseLocal } from '../lib/date';
import { templateToInput } from '../lib/templates';
import { cx, errorMessage, uid } from '../lib/util';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Group, Row, SectionTitle, Sheet, SheetBody, SheetHeader, fieldInput, textButton } from './Sheet';
import TemplateButton from './TemplateButton';

interface Props {
  templates: Template[];
  initialTemplateId?: string;
  initialDates: string[];
  onSubmit: (inputs: EventInput[], message: string) => Promise<void>;
  onClose: () => void;
}

const REPEAT_OPTIONS = [
  { weeks: 1, label: 'Einmalig' },
  { weeks: 4, label: '4 Wochen' },
  { weeks: 8, label: '8 Wochen' },
  { weeks: 12, label: '12 Wochen' },
];

/** Vorlage auf beliebig viele Tage anwenden – optional wöchentlich wiederholt. */
export default function QuickAddSheet({ templates, initialTemplateId, initialDates, onSubmit, onClose }: Props) {
  const initial = templates.find((t) => t.id === initialTemplateId) ?? templates[0];
  const [templateId, setTemplateId] = useState(initial?.id ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '09:00');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialDates));
  const [month, setMonth] = useState(() => startOfMonth(initialDates[0] ? parseLocal(initialDates[0]) : new Date()));
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);

  const pickTemplate = (t: Template) => {
    setTemplateId(t.id);
    setStartTime(t.startTime);
    setEndTime(t.endTime);
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const dates = useMemo(() => {
    const out = new Set<string>();
    for (const d of selected) {
      for (let w = 0; w < repeatWeeks; w++) out.add(dateKey(addDays(parseLocal(d), w * 7)));
    }
    return [...out].sort();
  }, [selected, repeatWeeks]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(month, WEEK_OPTS);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const submit = async () => {
    if (!template || dates.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const seriesId = dates.length > 1 ? uid() : null;
      const inputs = dates.map((d) => templateToInput(template, d, { startTime, endTime, seriesId }));
      await onSubmit(inputs, dates.length === 1 ? `${template.name} eingetragen` : `${dates.length}× ${template.name} eingetragen`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Sheet label="Schnell eintragen" onClose={onClose}>
      <SheetHeader
        title="Schnell eintragen"
        left={
          <button type="button" onClick={onClose} className={textButton}>
            Abbrechen
          </button>
        }
      />
      <SheetBody>
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">{error}</p>
        )}

        <section>
          <SectionTitle>Vorlage</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <TemplateButton key={t.id} template={t} selected={t.id === templateId} onClick={() => pickTemplate(t)} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Uhrzeit (nur für diese Einträge)</SectionTitle>
          <Group>
            <Row label="Beginn">
              <input type="time" value={startTime} onChange={(e) => e.target.value && setStartTime(e.target.value)} className={fieldInput} />
            </Row>
            <Row label="Ende">
              <span className="flex items-center gap-2">
                {endTime < startTime && <span className="text-xs text-slate-500">Folgetag</span>}
                <input type="time" value={endTime} onChange={(e) => e.target.value && setEndTime(e.target.value)} className={fieldInput} />
              </span>
            </Row>
          </Group>
        </section>

        <section>
          <SectionTitle>Tage antippen</SectionTitle>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeftIcon />
              </button>
              <span className="text-[15px] font-semibold">{format(month, 'LLLL yyyy', { locale: de })}</span>
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700"
                aria-label="Nächster Monat"
              >
                <ChevronRightIcon />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((d) => {
                const key = dateKey(d);
                const isSelected = selected.has(key);
                const isRepeat = !isSelected && dates.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={isSelected}
                    className={cx(
                      'mx-auto flex aspect-square w-full max-w-[2.75rem] items-center justify-center rounded-full text-sm tabular-nums transition active:scale-90',
                      isSelected
                        ? 'bg-rose-500 font-semibold text-white'
                        : isRepeat
                          ? 'bg-rose-200 text-rose-800 dark:bg-rose-500/30 dark:text-rose-100'
                          : 'hover:bg-white dark:hover:bg-slate-700',
                      !isSelected && !isRepeat && !isSameMonth(d, month) && 'text-slate-400 dark:text-slate-600',
                      !isSelected && isToday(d) && 'font-bold text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>Wöchentlich wiederholen</SectionTitle>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {REPEAT_OPTIONS.map((o) => (
              <button
                key={o.weeks}
                type="button"
                onClick={() => setRepeatWeeks(o.weeks)}
                className={cx(
                  'rounded-lg py-2 text-xs font-medium transition sm:text-sm',
                  repeatWeeks === o.weeks ? 'bg-white shadow-sm dark:bg-slate-600' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-2">
          {dates.length > 0 && (
            <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
              {dates
                .slice(0, 8)
                .map((d) => format(parseLocal(d), 'EEE d.M.', { locale: de }))
                .join(' · ')}
              {dates.length > 8 && ` · +${dates.length - 8} weitere`}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!template || dates.length === 0 || busy}
            className="w-full rounded-xl bg-rose-500 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.99] disabled:opacity-40"
          >
            {dates.length === 0
              ? 'Tage auswählen'
              : `${dates.length} ${dates.length === 1 ? 'Termin' : 'Termine'} eintragen`}
          </button>
        </div>
      </SheetBody>
    </Sheet>
  );
}
