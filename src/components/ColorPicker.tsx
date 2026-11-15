import { COLOR_KEYS, type ColorKey } from '../../shared/types';
import { COLORS, COLOR_LABELS } from '../lib/colors';
import { cx } from '../lib/util';

export default function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (c: ColorKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5 px-4 py-3">
      {COLOR_KEYS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={COLOR_LABELS[c]}
          aria-pressed={value === c}
          className={cx(
            'h-8 w-8 rounded-full transition active:scale-90',
            COLORS[c].dot,
            value === c && 'ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-100 dark:ring-white dark:ring-offset-slate-800',
          )}
        />
      ))}
    </div>
  );
}
