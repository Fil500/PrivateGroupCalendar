import type { EventInput, Template } from '../../shared/types';
import { buildRange } from './date';

/** Startdaten im lokalen Demo-Modus: keine Vorlagen, sie werden in der App angelegt. */
export const DEFAULT_TEMPLATES: Template[] = [];

export const sortTemplates = (list: Template[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

export function templateToInput(
  t: Template,
  day: string,
  opts: { startTime?: string; endTime?: string; seriesId?: string | null } = {},
): EventInput {
  const { start, end } = buildRange(day, opts.startTime ?? t.startTime, opts.endTime ?? t.endTime);
  return {
    title: t.name,
    start,
    end,
    allDay: false,
    color: t.color,
    notes: null,
    templateId: t.id,
    seriesId: opts.seriesId ?? null,
    memberId: t.memberId,
  };
}
