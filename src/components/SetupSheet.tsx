import { useState, type FormEvent } from 'react';
import type { ColorKey, Member } from '../../shared/types';
import { api } from '../api';
import { GROUP_LABEL } from '../config';
import { COLORS } from '../lib/colors';
import { cx, errorMessage } from '../lib/util';
import { PlusIcon } from './icons';
import { Group, SectionTitle, Sheet, SheetBody, SheetHeader, textButton } from './Sheet';

/** Reihenfolge der Farben für neue Personen: nebeneinander gut unterscheidbar */
const SETUP_COLORS: ColorKey[] = ['blue', 'rose', 'emerald', 'amber', 'violet', 'orange', 'sky', 'red', 'slate'];

interface Props {
  onDone: (members: Member[]) => void;
  /** Einrichtung überspringen (erscheint beim nächsten Start wieder, solange niemand angelegt ist) */
  onSkip: () => void;
}

/** Erster Start: Mitglieder der Gruppe anlegen. Vorlagen und Farben lassen sich danach jederzeit ändern. */
export default function SetupSheet({ onDone, onSkip }: Props) {
  const [names, setNames] = useState<{ name: string; color: ColorKey }[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    // Jede Person bekommt eine noch freie Farbe.
    const used = new Set(names.map((n) => n.color));
    const color = SETUP_COLORS.find((c) => !used.has(c)) ?? SETUP_COLORS[names.length % SETUP_COLORS.length];
    setNames((prev) => [...prev, { name: trimmed, color }]);
    setName('');
  };

  const finish = async () => {
    if (names.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created: Member[] = [];
      for (const [i, n] of names.entries()) created.push(await api.createMember({ ...n, sortOrder: i + 1 }));
      onDone(created);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Sheet label="Einrichtung" onClose={onSkip}>
      <SheetHeader
        title="Willkommen"
        left={
          <button type="button" onClick={onSkip} className={textButton}>
            Später
          </button>
        }
        right={
          <button type="button" onClick={() => void finish()} disabled={names.length === 0 || busy} className={cx(textButton, 'font-semibold')}>
            Fertig
          </button>
        }
      />
      <SheetBody>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">
            {error}
          </p>
        )}

        <p className="px-1 text-[15px] text-slate-600 dark:text-slate-300">
          Wer gehört zur {GROUP_LABEL}? Jede Person bekommt eine eigene Farbe, und Termine lassen sich ihr zuordnen. Namen, Farben und
          Vorlagen kannst du später jederzeit ändern.
        </p>

        <section>
          <SectionTitle>{GROUP_LABEL}</SectionTitle>
          <Group>
            {names.map((n, i) => (
              <div key={`${n.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <span className={cx('h-3 w-3 shrink-0 rounded-full', COLORS[n.color].dot)} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{n.name}</span>
                <button
                  type="button"
                  onClick={() => setNames((prev) => prev.filter((_, j) => j !== i))}
                  className="text-sm text-slate-500 hover:text-red-600"
                  aria-label={`${n.name} entfernen`}
                >
                  Entfernen
                </button>
              </div>
            ))}
            <form onSubmit={add} className="flex items-center gap-2 px-4 py-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={names.length === 0 ? 'Name, z. B. dein eigener' : 'Weitere Person'}
                maxLength={40}
                enterKeyHint="done"
                aria-label="Name"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[15px] font-medium text-rose-600 disabled:opacity-40 dark:text-rose-400"
              >
                <PlusIcon className="h-4 w-4" />
                Hinzufügen
              </button>
            </form>
          </Group>
        </section>

        <button
          type="button"
          onClick={() => void finish()}
          disabled={names.length === 0 || busy}
          className="w-full rounded-xl bg-rose-500 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.99] disabled:opacity-40"
        >
          {names.length === 0 ? 'Mindestens eine Person hinzufügen' : `Los geht’s mit ${names.length} ${names.length === 1 ? 'Person' : 'Personen'}`}
        </button>
      </SheetBody>
    </Sheet>
  );
}
