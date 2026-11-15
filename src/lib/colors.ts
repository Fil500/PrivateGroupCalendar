import type { ColorKey } from '../../shared/types';

interface ColorStyle {
  /** kräftiger Punkt/Balken */
  dot: string;
  /** sanfte Pille (Monatsansicht, Buttons) */
  chip: string;
  /** Terminblock im Zeitraster (mit linkem Rand) */
  block: string;
}

// Klassen müssen als vollständige Strings im Code stehen, damit Tailwind sie findet.
export const COLORS: Record<ColorKey, ColorStyle> = {
  blue: {
    dot: 'bg-blue-500',
    chip: 'bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100',
    block: 'border-blue-500 bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-50',
  },
  sky: {
    dot: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100',
    block: 'border-sky-500 bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-50',
  },
  emerald: {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100',
    block: 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-50',
  },
  amber: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100',
    block: 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-50',
  },
  orange: {
    dot: 'bg-orange-500',
    chip: 'bg-orange-100 text-orange-900 dark:bg-orange-500/25 dark:text-orange-100',
    block: 'border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-500/25 dark:text-orange-50',
  },
  red: {
    dot: 'bg-red-500',
    chip: 'bg-red-100 text-red-900 dark:bg-red-500/25 dark:text-red-100',
    block: 'border-red-500 bg-red-100 text-red-900 dark:bg-red-500/25 dark:text-red-50',
  },
  rose: {
    dot: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100',
    block: 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-50',
  },
  violet: {
    dot: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-500/25 dark:text-violet-100',
    block: 'border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-500/25 dark:text-violet-50',
  },
  slate: {
    dot: 'bg-slate-500',
    chip: 'bg-slate-200 text-slate-900 dark:bg-slate-500/30 dark:text-slate-100',
    block: 'border-slate-500 bg-slate-200 text-slate-900 dark:bg-slate-500/30 dark:text-slate-50',
  },
};

export const COLOR_LABELS: Record<ColorKey, string> = {
  blue: 'Blau',
  sky: 'Hellblau',
  emerald: 'Grün',
  amber: 'Gelb',
  orange: 'Orange',
  red: 'Rot',
  rose: 'Rosa',
  violet: 'Lila',
  slate: 'Grau',
};
