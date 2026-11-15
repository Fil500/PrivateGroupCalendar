import type { Member, Template } from '../../shared/types';
import type { ViewMode } from '../App';
import { GROUP_LABEL } from '../config';
import { COLORS } from '../lib/colors';
import { cx } from '../lib/util';
import { BoltIcon, ChevronLeftIcon, ChevronRightIcon, SlidersIcon } from './icons';

interface Props {
  title: string;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  templates: Template[];
  onTemplate: (t: Template) => void;
  onManageTemplates: () => void;
  members: Member[];
  hiddenMembers: Set<string>;
  onToggleMember: (id: string) => void;
  loading: boolean;
  localMode: boolean;
}

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'month', label: 'Monat' },
  { id: 'week', label: 'Woche' },
  { id: 'day', label: 'Tag' },
];

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800';

export default function Header(p: Props) {
  return (
    <header className="z-20 shrink-0 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex items-center gap-1 px-4 pb-2 pt-3">
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight md:text-2xl">{p.title}</h1>
        {p.localMode && (
          <span
            className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 sm:inline"
            title="Kein Backend erreichbar – Daten werden nur in diesem Browser gespeichert."
          >
            Demo (lokal)
          </span>
        )}
        {p.loading && <span className="mx-1 h-2 w-2 animate-pulse rounded-full bg-rose-400" aria-label="Lädt" />}
        <button
          type="button"
          onClick={p.onToday}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          Heute
        </button>
        <button type="button" onClick={p.onPrev} className={iconButton} aria-label="Zurück">
          <ChevronLeftIcon />
        </button>
        <button type="button" onClick={p.onNext} className={iconButton} aria-label="Weiter">
          <ChevronRightIcon />
        </button>
        <button type="button" onClick={p.onManageTemplates} className={iconButton} aria-label={`${GROUP_LABEL} & Vorlagen verwalten`}>
          <SlidersIcon />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-3 md:flex-row md:items-center md:gap-4">
        <div role="tablist" className="grid shrink-0 grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 md:w-72">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={p.view === v.id}
              onClick={() => p.onViewChange(v.id)}
              className={cx(
                'rounded-lg py-1.5 text-sm font-medium transition',
                p.view === v.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {p.templates.length > 0 && (
          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <BoltIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Schnell</span>
            </span>
            {p.templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => p.onTemplate(t)}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95',
                  COLORS[t.color].chip,
                )}
              >
                <span className={cx('h-2 w-2 rounded-full', COLORS[t.color].dot)} />
                {t.name}
                <span className="font-normal tabular-nums opacity-70">{t.startTime}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {p.members.length > 0 && (
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-3" role="group" aria-label="Personen ein- und ausblenden">
          {p.members.map((m) => {
            const visible = !p.hiddenMembers.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => p.onToggleMember(m.id)}
                aria-pressed={visible}
                title={visible ? `${m.name} ausblenden` : `${m.name} einblenden`}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95',
                  visible
                    ? 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    : 'border-dashed border-slate-300 text-slate-400 line-through dark:border-slate-700 dark:text-slate-500',
                )}
              >
                <span className={cx('h-2.5 w-2.5 rounded-full', visible ? COLORS[m.color].dot : 'bg-slate-300 dark:bg-slate-600')} />
                {m.name}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
