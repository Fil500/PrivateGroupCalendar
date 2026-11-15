import type { Template } from '../../shared/types';
import { COLORS } from '../lib/colors';
import { cx } from '../lib/util';

interface Props {
  template: Template;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export default function TemplateButton({ template: t, onClick, selected, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cx(
        'flex min-h-[3.25rem] items-center gap-2.5 rounded-xl px-3 py-2 text-left transition active:scale-[0.97] disabled:opacity-50',
        COLORS[t.color].chip,
        selected && 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      )}
    >
      <span className={cx('h-7 w-1.5 shrink-0 rounded-full', COLORS[t.color].dot)} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{t.name}</span>
        <span className="block text-xs tabular-nums opacity-75">
          {t.startTime} – {t.endTime}
        </span>
      </span>
    </button>
  );
}
