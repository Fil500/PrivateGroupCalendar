import { useMemo, useState, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CalendarEvent, EventInput, Member, Template } from '../../shared/types';
import { api } from '../api';
import type { ImportPlan, Importer } from '../importers/types';
import { COLORS } from '../lib/colors';
import { dayOf, parseLocal } from '../lib/date';
import { cx, errorMessage } from '../lib/util';
import { ChevronRightIcon } from './icons';
import { Group, SectionTitle, Sheet, SheetBody, SheetHeader, textButton } from './Sheet';

interface Preview extends ImportPlan {
  /** früher importierte Termine aus diesem Zeitraum: werden ersetzt */
  previous: CalendarEvent[];
  /** Einträge, die schon im Kalender stehen */
  existing: Set<string>;
}

interface Props {
  importers: Importer[];
  templates: Template[];
  members: Member[];
  /** `from` = erster Tag des importierten Zeitraums (dorthin springt der Kalender) */
  onSubmit: (inputs: EventInput[], previous: CalendarEvent[], from: string) => Promise<void>;
  onClose: () => void;
}

/** Datei einlesen, Vorschau zeigen und erst nach Bestätigung eintragen. */
export default function ImportSheet({ importers, templates, members, onSubmit, onClose }: Props) {
  const [importer, setImporter] = useState<Importer | null>(importers.length === 1 ? importers[0] : null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !importer) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const plan = await importer.read(file, { templates, members });
      const current = await api.listEvents(plan.from, plan.to);
      const fromImport = (ev: CalendarEvent) => !!plan.replacePrefix && !!ev.seriesId?.startsWith(plan.replacePrefix);
      const previous = current.filter(fromImport);
      const others = current.filter((ev) => !fromImport(ev));
      const existing = new Set(
        plan.entries
          .filter((en) => others.some((ev) => ev.title === (en.input?.title ?? en.code) && dayOf(ev.start) === en.date))
          .map((en) => en.key),
      );

      setPreview({ ...plan, previous, existing });
      setSelected(new Set(plan.entries.filter((en) => en.input && !existing.has(en.key)).map((en) => en.key)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const known = useMemo(() => preview?.entries.filter((en) => en.input) ?? [], [preview]);
  const unknown = useMemo(() => preview?.entries.filter((en) => !en.input) ?? [], [preview]);
  const inputs = known.filter((en) => selected.has(en.key)).flatMap((en) => (en.input ? [en.input] : []));

  const submit = async () => {
    if (!preview || inputs.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(inputs, preview.previous, preview.from);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const back = () => {
    setImporter(null);
    setPreview(null);
    setError(null);
  };

  const fileButton =
    'block cursor-pointer rounded-xl bg-slate-100 py-3.5 text-center text-[15px] font-semibold text-rose-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700';
  const hint = 'rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100';

  return (
    <Sheet label="Importieren" onClose={onClose}>
      <SheetHeader
        title={importer && importers.length === 1 ? importer.label : 'Importieren'}
        left={
          importer && importers.length > 1 ? (
            <button type="button" onClick={back} className={textButton}>
              Zurück
            </button>
          ) : (
            <button type="button" onClick={onClose} className={textButton}>
              Abbrechen
            </button>
          )
        }
      />
      <SheetBody>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">
            {error}
          </p>
        )}

        {!importer && (
          <section>
            <SectionTitle>Was möchtest du importieren?</SectionTitle>
            <Group>
              {importers.map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  onClick={() => setImporter(imp)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <span className="min-w-0 flex-1 text-[15px] font-medium">{imp.label}</span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </Group>
          </section>
        )}

        {importer && (
          <>
            {!preview && <p className="px-1 text-sm text-slate-500 dark:text-slate-400">{importer.description}</p>}

            <label className={cx(fileButton, busy && 'pointer-events-none opacity-50')}>
              {busy ? 'Wird gelesen…' : preview ? 'Andere Datei wählen' : importer.fileLabel}
              <input type="file" accept={importer.accept} className="sr-only" disabled={busy} onChange={(e) => void pickFile(e)} />
            </label>
          </>
        )}

        {preview && (
          <>
            <section>
              <SectionTitle>{preview.title}</SectionTitle>
              {known.length === 0 ? (
                <p className="px-1 text-sm text-slate-500 dark:text-slate-400">{preview.emptyMessage}</p>
              ) : (
                <Group>
                  {known.map((en) => (
                    <label key={en.key} className="flex min-h-[3rem] cursor-pointer items-center gap-3 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(en.key)}
                        onChange={() => toggle(en.key)}
                        className="h-5 w-5 shrink-0 accent-rose-500"
                      />
                      <span className="w-20 shrink-0 text-sm tabular-nums">{format(parseLocal(en.date), 'EEE d. MMM', { locale: de })}</span>
                      <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', COLORS[en.color].dot)} />
                      <span className="min-w-0 max-w-[45%] shrink-0 truncate text-[15px] font-semibold">{en.code}</span>
                      <span className="min-w-0 flex-1 truncate text-right text-sm tabular-nums text-slate-500 dark:text-slate-400">
                        {preview.existing.has(en.key) ? 'schon eingetragen' : en.label}
                      </span>
                    </label>
                  ))}
                </Group>
              )}
            </section>

            {unknown.length > 0 && (
              <p className={hint}>
                Nicht eingetragen, weil nicht erkannt:{' '}
                {unknown.map((en) => `${format(parseLocal(en.date), 'd.M.')} ${en.code}`).join(', ')}
              </p>
            )}

            {preview.previous.length > 0 && (
              <p className={hint}>
                Ersetzt {preview.previous.length === 1 ? 'den bereits importierten Eintrag' : `${preview.previous.length} bereits importierte Einträge`} aus
                diesem Zeitraum, auch wenn du von Hand etwas daran geändert hast.
              </p>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={inputs.length === 0 || busy}
              className="w-full rounded-xl bg-rose-500 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.99] disabled:opacity-40"
            >
              {inputs.length === 0 ? 'Nichts ausgewählt' : `${inputs.length} ${inputs.length === 1 ? 'Eintrag' : 'Einträge'} eintragen`}
            </button>
          </>
        )}
      </SheetBody>
    </Sheet>
  );
}
