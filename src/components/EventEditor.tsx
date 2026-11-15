import { useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent, ColorKey, EventInput, Member, Template } from '../../shared/types';
import type { DeleteScope } from '../api';
import { COLORS } from '../lib/colors';
import { buildRange, dayOf, eventTimeLabel, hhmm, parseLocal, timeOf, toMinutes } from '../lib/date';
import { cx, errorMessage } from '../lib/util';
import ColorPicker from './ColorPicker';
import MemberPicker from './MemberPicker';
import { Group, Row, SectionTitle, Sheet, SheetBody, SheetHeader, Switch, fieldInput, textButton } from './Sheet';
import TemplateButton from './TemplateButton';

export type EditorState = { kind: 'create'; draft: EventInput } | { kind: 'edit'; event: CalendarEvent };

interface Props {
  state: EditorState;
  templates: Template[];
  members: Member[];
  /** weitere Termine am Tag des Eintrags */
  dayEvents: CalendarEvent[];
  onSave: (input: EventInput) => Promise<void>;
  onDelete: (ev: CalendarEvent, scope: DeleteScope) => Promise<void>;
  /** Ein-Klick: Vorlage sofort für den Tag eintragen */
  onTemplate: (t: Template, day: string) => Promise<void>;
  onOpenEvent: (ev: CalendarEvent) => void;
  onMultiDay: (day: string) => void;
  onClose: () => void;
}

export default function EventEditor(props: Props) {
  const { state, templates, members, dayEvents, onSave, onDelete, onTemplate, onOpenEvent, onMultiDay, onClose } = props;
  const editing = state.kind === 'edit' ? state.event : null;
  const src: EventInput = state.kind === 'edit' ? state.event : state.draft;

  const [title, setTitle] = useState(src.title);
  const [allDay, setAllDay] = useState(src.allDay);
  const [date, setDate] = useState(dayOf(src.start));
  const [endDate, setEndDate] = useState(dayOf(src.end));
  const [startTime, setStartTime] = useState(src.allDay ? '09:00' : timeOf(src.start));
  const [endTime, setEndTime] = useState(src.allDay ? '10:00' : timeOf(src.end));
  const [color, setColor] = useState<ColorKey>(src.color);
  const [memberId, setMemberId] = useState<string | null>(src.memberId);
  const [notes, setNotes] = useState(src.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auf Touch-Geräten nicht automatisch fokussieren – sonst verdeckt die Tastatur die Vorlagen.
  const autoFocus = useMemo(() => window.matchMedia('(pointer: fine)').matches, []);
  const dayLabel = date ? format(parseLocal(date), 'EEE, d. MMM', { locale: de }) : '';
  const overnight = !allDay && endTime < startTime;

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const changeDate = (v: string) => {
    if (!v) return;
    setDate(v);
    if (endDate < v) setEndDate(v);
  };

  // Wie bei iOS: beim Verschieben des Beginns bleibt die Dauer erhalten.
  const changeStart = (v: string) => {
    if (!v) return;
    const duration = (toMinutes(endTime) - toMinutes(startTime) + 1440) % 1440;
    setStartTime(v);
    setEndTime(hhmm((toMinutes(v) + duration) % 1440));
  };

  // Die Personenfarbe ist nur die Vorgabe und lässt sich danach noch ändern.
  const changeMember = (id: string | null) => {
    setMemberId(id);
    const member = members.find((m) => m.id === id);
    if (member) setColor(member.color);
  };

  const toggleAllDay = (v: boolean) => {
    setAllDay(v);
    if (v) setEndDate(date);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const range = allDay
      ? { start: `${date}T00:00`, end: `${endDate < date ? date : endDate}T23:59` }
      : buildRange(date, startTime, endTime);
    void run(() =>
      onSave({
        title: title.trim(),
        ...range,
        allDay,
        color,
        notes: notes.trim() || null,
        templateId: src.templateId,
        seriesId: src.seriesId,
        memberId,
      }),
    );
  };

  return (
    <Sheet label={editing ? 'Termin bearbeiten' : 'Neuer Termin'} onClose={onClose}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <SheetHeader
          title={editing ? 'Termin bearbeiten' : 'Neuer Termin'}
          left={
            <button type="button" onClick={onClose} className={textButton}>
              Abbrechen
            </button>
          }
          right={
            <button type="submit" disabled={!title.trim() || busy} className={cx(textButton, 'font-semibold')}>
              {editing ? 'Fertig' : 'Hinzufügen'}
            </button>
          }
        />

        <SheetBody>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">{error}</p>
          )}

          {!editing && templates.length > 0 && (
            <section>
              <SectionTitle
                action={
                  <button type="button" onClick={() => onMultiDay(date)} className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Mehrere Tage…
                  </button>
                }
              >
                Ein-Klick · {dayLabel}
              </SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <TemplateButton key={t.id} template={t} disabled={busy} onClick={() => void run(() => onTemplate(t, date))} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            {!editing && templates.length > 0 && <SectionTitle>Eigener Termin</SectionTitle>}
            <Group>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel"
                autoFocus={autoFocus}
                maxLength={200}
                enterKeyHint="done"
                className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400"
              />
            </Group>

            {members.length > 0 && (
              <div>
                <SectionTitle>Für wen?</SectionTitle>
                <Group>
                  <MemberPicker members={members} value={memberId} onChange={changeMember} />
                </Group>
              </div>
            )}

            <Group>
              <Row label="Ganztägig">
                <Switch checked={allDay} onChange={toggleAllDay} label="Ganztägig" />
              </Row>
              <Row label={allDay ? 'Von' : 'Datum'}>
                <input type="date" required value={date} onChange={(e) => changeDate(e.target.value)} className={fieldInput} />
              </Row>
              {allDay ? (
                <Row label="Bis">
                  <input type="date" value={endDate} min={date} onChange={(e) => e.target.value && setEndDate(e.target.value)} className={fieldInput} />
                </Row>
              ) : (
                <>
                  <Row label="Beginn">
                    <input type="time" required value={startTime} onChange={(e) => changeStart(e.target.value)} className={fieldInput} />
                  </Row>
                  <Row label="Ende">
                    <span className="flex items-center gap-2">
                      {overnight && <span className="text-xs text-slate-500">Folgetag</span>}
                      <input type="time" required value={endTime} onChange={(e) => e.target.value && setEndTime(e.target.value)} className={fieldInput} />
                    </span>
                  </Row>
                </>
              )}
            </Group>

            <Group>
              <ColorPicker value={color} onChange={setColor} />
            </Group>

            <Group>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notizen"
                rows={3}
                maxLength={2000}
                className="block w-full resize-none bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400"
              />
            </Group>
          </section>

          {editing && (
            <Group>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => onDelete(editing, 'single'))}
                className="w-full px-4 py-3 text-center text-[15px] font-medium text-red-600 disabled:opacity-50"
              >
                Termin löschen
              </button>
              {editing.seriesId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => onDelete(editing, 'series'))}
                  className="w-full px-4 py-3 text-center text-[15px] font-medium text-red-600 disabled:opacity-50"
                >
                  Alle Termine dieser Serie löschen
                </button>
              )}
            </Group>
          )}

          {dayEvents.length > 0 && (
            <section>
              <SectionTitle>Außerdem am {dayLabel}</SectionTitle>
              <Group>
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onOpenEvent(ev)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                  >
                    <span className={cx('h-8 w-1 shrink-0 rounded-full', COLORS[ev.color].dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{ev.title}</span>
                      <span className="block text-xs tabular-nums text-slate-500 dark:text-slate-400">{eventTimeLabel(ev)}</span>
                    </span>
                  </button>
                ))}
              </Group>
            </section>
          )}
        </SheetBody>
      </form>
    </Sheet>
  );
}
