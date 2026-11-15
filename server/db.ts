// Gemeinsame Helfer für die Pages Functions (liegt bewusst außerhalb von /functions,
// damit daraus keine eigene Route entsteht).
import {
  COLOR_KEYS,
  DATETIME_RE,
  TIME_RE,
  type CalendarEvent,
  type ColorKey,
  type EventInput,
  type Member,
  type MemberInput,
  type Template,
  type TemplateInput,
} from '../shared/types';

export interface Env {
  DB: D1Database;
}

export class ValidationError extends Error {}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const notFound = () => json({ error: 'Nicht gefunden' }, 404);

/** Fängt Validierungs- und DB-Fehler ab und liefert immer JSON. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    console.error(err);
    return json({ error: 'Serverfehler' }, 500);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError('Ungültiges JSON');
  }
}

// ---------- Events ----------

export interface EventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: number;
  color: string;
  notes: string | null;
  template_id: string | null;
  series_id: string | null;
  member_id: string | null;
}

const asColor = (v: unknown): ColorKey => (COLOR_KEYS.includes(v as ColorKey) ? (v as ColorKey) : 'blue');
const optString = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function rowToEvent(r: EventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    start: r.start_at,
    end: r.end_at,
    allDay: r.all_day === 1,
    color: asColor(r.color),
    notes: r.notes,
    templateId: r.template_id,
    seriesId: r.series_id,
    memberId: r.member_id,
  };
}

export function parseEventInput(body: unknown): EventInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Ungültige Termindaten');
  const b = body as Record<string, unknown>;

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > 200) throw new ValidationError('Titel fehlt oder ist zu lang');
  if (typeof b.start !== 'string' || !DATETIME_RE.test(b.start)) throw new ValidationError('Ungültiger Beginn');
  if (typeof b.end !== 'string' || !DATETIME_RE.test(b.end)) throw new ValidationError('Ungültiges Ende');
  if (b.end < b.start) throw new ValidationError('Das Ende liegt vor dem Beginn');

  return {
    title,
    start: b.start,
    end: b.end,
    allDay: b.allDay === true,
    color: asColor(b.color),
    notes: optString(b.notes, 2000),
    templateId: optString(b.templateId, 100),
    seriesId: optString(b.seriesId, 100),
    memberId: optString(b.memberId, 100),
  };
}

export function bindEvent(stmt: D1PreparedStatement, id: string, e: EventInput): D1PreparedStatement {
  return stmt.bind(e.title, e.start, e.end, e.allDay ? 1 : 0, e.color, e.notes, e.templateId, e.seriesId, e.memberId, id);
}

// ---------- Templates ----------

export interface TemplateRow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  sort_order: number;
  member_id: string | null;
}

export function rowToTemplate(r: TemplateRow): Template {
  return {
    id: r.id,
    name: r.name,
    startTime: r.start_time,
    endTime: r.end_time,
    color: asColor(r.color),
    sortOrder: r.sort_order,
    memberId: r.member_id,
  };
}

export function parseTemplateInput(body: unknown): TemplateInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Ungültige Vorlagendaten');
  const b = body as Record<string, unknown>;

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name || name.length > 80) throw new ValidationError('Name fehlt oder ist zu lang');
  if (typeof b.startTime !== 'string' || !TIME_RE.test(b.startTime)) throw new ValidationError('Ungültige Startzeit');
  if (typeof b.endTime !== 'string' || !TIME_RE.test(b.endTime)) throw new ValidationError('Ungültige Endzeit');

  return {
    name,
    startTime: b.startTime,
    endTime: b.endTime,
    color: asColor(b.color),
    sortOrder: Number.isInteger(b.sortOrder) ? (b.sortOrder as number) : 0,
    memberId: optString(b.memberId, 100),
  };
}

// ---------- Members ----------

export interface MemberRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export function rowToMember(r: MemberRow): Member {
  return { id: r.id, name: r.name, color: asColor(r.color), sortOrder: r.sort_order };
}

export function parseMemberInput(body: unknown): MemberInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Ungültige Personendaten');
  const b = body as Record<string, unknown>;

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name || name.length > 40) throw new ValidationError('Name fehlt oder ist zu lang');

  return {
    name,
    color: asColor(b.color),
    sortOrder: Number.isInteger(b.sortOrder) ? (b.sortOrder as number) : 0,
  };
}
