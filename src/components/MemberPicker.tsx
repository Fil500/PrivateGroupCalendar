import type { Member } from '../../shared/types';
import { COLORS } from '../lib/colors';
import { cx } from '../lib/util';

interface Props {
  members: Member[];
  value: string | null;
  onChange: (memberId: string | null) => void;
}

/** Auswahl, wem ein Termin gehört (oder niemand Bestimmtem). */
export default function MemberPicker({ members, value, onChange }: Props) {
  const chip = (active: boolean) =>
    cx(
      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95',
      active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    );

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {members.map((m) => (
        <button key={m.id} type="button" onClick={() => onChange(m.id)} aria-pressed={value === m.id} className={chip(value === m.id)}>
          <span className={cx('h-2.5 w-2.5 rounded-full', COLORS[m.color].dot)} />
          {m.name}
        </button>
      ))}
      <button type="button" onClick={() => onChange(null)} aria-pressed={value === null} className={chip(value === null)}>
        Alle / Niemand
      </button>
    </div>
  );
}
