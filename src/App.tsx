import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, addWeeks, endOfMonth, format, getISOWeek, startOfMonth, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent, EventInput, Member, Template } from '../shared/types';
import { api, useLocalMode, type DeleteScope } from './api';
import { IMPORTERS } from './importers';
import { WEEK_OPTS, addMinutesIso, dateKey, dayOf, eventsOnDay, pad, parseLocal, sortEvents } from './lib/date';
import { templateToInput } from './lib/templates';
import { errorMessage, useSwipe } from './lib/util';
import EventEditor, { type EditorState } from './components/EventEditor';
import Header from './components/Header';
import MonthView from './components/MonthView';
import QuickAddSheet from './components/QuickAddSheet';
import ImportSheet from './components/ImportSheet';
import SetupSheet from './components/SetupSheet';
import TemplateManager from './components/TemplateManager';
import TimeGrid from './components/TimeGrid';
import Toast, { type ToastState } from './components/Toast';
import UpcomingList from './components/UpcomingList';
import { PlusIcon } from './components/icons';

export type ViewMode = 'month' | 'week' | 'day';

const VIEW_KEY = 'fc.view';
const HIDDEN_KEY = 'fc.hiddenMembers';

function readHidden(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]');
    if (Array.isArray(v)) return new Set(v.filter((x): x is string => typeof x === 'string'));
  } catch {
    /* ignorieren */
  }
  return new Set();
}

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'month' || v === 'week' || v === 'day') return v;
  } catch {
    /* ignorieren */
  }
  return 'month';
}

/** Startzeit für einen neuen Termin: angeklickte Uhrzeit, sonst nächste volle Stunde (heute) bzw. 09:00. */
function defaultStart(day: string, minutes?: number): string {
  if (minutes !== undefined) return `${day}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const now = new Date();
  if (day === dateKey(now)) return `${day}T${pad(Math.min(now.getHours() + 1, 23))}:00`;
  return `${day}T09:00`;
}

export default function App() {
  const [view, setViewState] = useState<ViewMode>(readView);
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(false);
  const [hiddenMembers, setHiddenMembers] = useState<Set<string>>(readHidden);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ templateId?: string; dates: string[] } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const localMode = useLocalMode();

  const setView = (v: ViewMode) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignorieren */
    }
  };

  // Ein Datenbereich deckt alle Ansichten ab: Monatsraster + kompletter Folgemonat.
  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(cursor), WEEK_OPTS);
    const to = addDays(startOfWeek(endOfMonth(addMonths(cursor, 1)), WEEK_OPTS), 7);
    return { from: dateKey(from), to: dateKey(to) };
  }, [cursor]);

  const requestId = useRef(0);
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const list = await api.listEvents(range.from, range.to);
      if (id === requestId.current) {
        setEvents(list);
        setError(null);
      }
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Änderungen anderer Mitglieder holen, sobald die App wieder sichtbar wird.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  useEffect(() => {
    api.listTemplates().then(setTemplates, (e) => setError(errorMessage(e)));
    api.listMembers().then(
      (list) => {
        setMembers(list);
        setMembersLoaded(true);
      },
      (e) => setError(errorMessage(e)),
    );
  }, []);

  const toggleMember = (id: string) =>
    setHiddenMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      } catch {
        /* ignorieren */
      }
      return next;
    });

  // Ausgeblendete Personen fallen weg.
  const visibleEvents = useMemo(
    () => events.filter((e) => !e.memberId || !hiddenMembers.has(e.memberId)),
    [events, hiddenMembers],
  );

  const showToast = (message: string, undo?: () => Promise<void>) => setToast({ id: Date.now(), message, undo });
  const addLocal = (list: CalendarEvent[]) => setEvents((prev) => sortEvents([...prev, ...list]));
  const removeLocal = (ids: string[]) => setEvents((prev) => prev.filter((e) => !ids.includes(e.id)));

  const createEvents = async (inputs: EventInput[], message: string) => {
    const created = await api.createEvents(inputs);
    addLocal(created);
    showToast(message, async () => {
      const seriesId = created[0]?.seriesId;
      const ids =
        created.length > 1 && seriesId
          ? await api.deleteEvent(created[0].id, 'series')
          : (await Promise.all(created.map((c) => api.deleteEvent(c.id)))).flat();
      removeLocal(ids);
    });
  };

  const saveEvent = async (input: EventInput) => {
    if (editor?.kind === 'edit') {
      const updated = await api.updateEvent(editor.event.id, input);
      setEvents((prev) => sortEvents(prev.map((e) => (e.id === updated.id ? updated : e))));
      showToast('Termin gespeichert');
    } else {
      await createEvents([input], 'Termin hinzugefügt');
    }
    setEditor(null);
  };

  const deleteEvent = async (ev: CalendarEvent, scope: DeleteScope) => {
    const ids = await api.deleteEvent(ev.id, scope);
    removeLocal(ids);
    setEditor(null);
    if (ids.length === 1) {
      const { id: _removedId, ...input } = ev;
      showToast('Termin gelöscht', async () => addLocal(await api.createEvents([input])));
    } else {
      showToast(`${ids.length} Termine gelöscht`);
    }
  };

  const applyTemplate = async (t: Template, day: string) => {
    await createEvents([templateToInput(t, day)], `${t.name} · ${format(parseLocal(day), 'EEE d. MMM', { locale: de })}`);
    setEditor(null);
  };

  // Erst die neuen Termine anlegen, dann die alten löschen: Bei einem Fehler geht so nichts verloren.
  const importEvents = async (inputs: EventInput[], previous: CalendarEvent[], from: string) => {
    const created = await api.createEvents(inputs);
    const deleteCreated = () => api.deleteEvent(created[0].id, 'series');
    const restore = previous.map(({ id: _removedId, ...input }) => input);
    try {
      const oldSeries = new Map(previous.map((ev) => [ev.seriesId, ev.id]));
      await Promise.all([...oldSeries.values()].map((id) => api.deleteEvent(id, 'series')));
    } catch (e) {
      await deleteCreated().catch(() => undefined);
      void reload();
      throw e;
    }
    setShowImport(false);
    setCursor(parseLocal(from));
    void reload();
    showToast(`${created.length} ${created.length === 1 ? 'Eintrag' : 'Einträge'} importiert`, async () => {
      await deleteCreated();
      if (restore.length > 0) await api.createEvents(restore);
      await reload();
    });
  };

  const handleUndo = async () => {
    const undo = toast?.undo;
    setToast(null);
    if (!undo) return;
    try {
      await undo();
    } catch (e) {
      showToast(`Rückgängig fehlgeschlagen: ${errorMessage(e)}`);
    }
  };

  const openCreate = (day: string, minutes?: number) => {
    const start = defaultStart(day, minutes);
    setEditor({
      kind: 'create',
      draft: { title: '', start, end: addMinutesIso(start, 60), allDay: false, color: 'blue', notes: null, templateId: null, seriesId: null, memberId: null },
    });
  };
  const openEdit = (ev: CalendarEvent) => setEditor({ kind: 'edit', event: ev });

  const step = (dir: 1 | -1) =>
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : view === 'week' ? addWeeks(c, dir) : addDays(c, dir)));
  const swipe = useSwipe(
    () => step(1),
    () => step(-1),
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, WEEK_OPTS);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const title =
    view === 'month'
      ? format(cursor, 'LLLL yyyy', { locale: de })
      : view === 'week'
        ? `${format(weekDays[0], 'LLL yyyy', { locale: de })} · KW ${getISOWeek(cursor)}`
        : format(cursor, 'EEEE, d. MMMM', { locale: de });

  const cursorKey = dateKey(cursor);
  const editorKey = editor ? (editor.kind === 'edit' ? editor.event.id : `new-${editor.draft.start}`) : '';
  const editorDayEvents = editor
    ? eventsOnDay(visibleEvents, dayOf(editor.kind === 'edit' ? editor.event.start : editor.draft.start)).filter(
        (e) => editor.kind !== 'edit' || e.id !== editor.event.id,
      )
    : [];

  return (
    <div className="flex h-dvh flex-col">
      <Header
        title={title}
        view={view}
        onViewChange={setView}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setCursor(new Date())}
        templates={templates}
        onTemplate={(t) => setQuickAdd({ templateId: t.id, dates: [cursorKey] })}
        onManageTemplates={() => setShowTemplates(true)}
        members={members}
        hiddenMembers={hiddenMembers}
        onToggleMember={toggleMember}
        loading={loading}
        localMode={localMode}
      />

      {error && (
        <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => void reload()} className="shrink-0 font-semibold underline">
            Erneut versuchen
          </button>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col" {...swipe}>
        {view === 'month' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <MonthView cursor={cursor} events={visibleEvents} onDayClick={(d) => openCreate(d)} onEventClick={openEdit} />
              <div className="lg:hidden">
                <UpcomingList cursor={cursor} events={visibleEvents} onEventClick={openEdit} />
              </div>
            </div>
            <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200 dark:border-slate-800 lg:block">
              <UpcomingList cursor={cursor} events={visibleEvents} onEventClick={openEdit} />
            </aside>
          </div>
        ) : (
          <TimeGrid
            key={view}
            days={view === 'week' ? weekDays : [cursor]}
            events={visibleEvents}
            onSlotClick={openCreate}
            onEventClick={openEdit}
            onDayClick={(d) => {
              setCursor(parseLocal(d));
              setView('day');
            }}
          />
        )}
      </main>

      <button
        type="button"
        onClick={() => openCreate(cursorKey)}
        aria-label="Neuer Termin"
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 active:scale-95"
      >
        <PlusIcon className="h-7 w-7" />
      </button>

      {editor && (
        <EventEditor
          key={editorKey}
          state={editor}
          templates={templates}
          members={members}
          dayEvents={editorDayEvents}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onTemplate={applyTemplate}
          onOpenEvent={openEdit}
          onMultiDay={(day) => {
            setEditor(null);
            setQuickAdd({ dates: [day] });
          }}
          onClose={() => setEditor(null)}
        />
      )}

      {quickAdd && (
        <QuickAddSheet
          templates={templates}
          initialTemplateId={quickAdd.templateId}
          initialDates={quickAdd.dates}
          onSubmit={async (inputs, message) => {
            await createEvents(inputs, message);
            setQuickAdd(null);
          }}
          onClose={() => setQuickAdd(null)}
        />
      )}

      {showTemplates && (
        <TemplateManager
          templates={templates}
          members={members}
          onChange={setTemplates}
          onMembersChange={setMembers}
          onReloadEvents={() => void reload()}
          onImport={
            IMPORTERS.length > 0
              ? () => {
                  setShowTemplates(false);
                  setShowImport(true);
                }
              : undefined
          }
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showImport && (
        <ImportSheet
          importers={IMPORTERS}
          templates={templates}
          members={members}
          onSubmit={importEvents}
          onClose={() => setShowImport(false)}
        />
      )}

      {membersLoaded && members.length === 0 && !setupSkipped && (
        <SetupSheet
          onDone={(created) => {
            setMembers(created);
            showToast('Eingerichtet. Vorlagen legst du über das Regler-Symbol an.');
          }}
          onSkip={() => setSetupSkipped(true)}
        />
      )}

      {toast && <Toast key={toast.id} toast={toast} onUndo={() => void handleUndo()} onDismiss={() => setToast(null)} />}
    </div>
  );
}
