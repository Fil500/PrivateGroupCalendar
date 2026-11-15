import { DATE_RE } from '../../../shared/types';
import {
  ValidationError,
  bindEvent,
  handle,
  json,
  parseEventInput,
  readJson,
  rowToEvent,
  type Env,
  type EventRow,
} from '../../../server/db';

const MAX_BATCH = 400;

/** GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD  (to = exklusiv) */
export const onRequestGet: PagesFunction<Env> = ({ request, env }) =>
  handle(async () => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? '';
    const to = url.searchParams.get('to') ?? '';
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      throw new ValidationError('Parameter from und to (YYYY-MM-DD) sind erforderlich');
    }

    const { results } = await env.DB.prepare(
      `SELECT * FROM events
       WHERE start_at < ?2 AND (end_at > ?1 OR start_at >= ?1)
       ORDER BY start_at, end_at`,
    )
      .bind(`${from}T00:00`, `${to}T00:00`)
      .all<EventRow>();

    return json(results.map(rowToEvent));
  });

/** POST /api/events  – Body: ein Termin oder ein Array von Terminen (Schnell-Eintrag) */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handle(async () => {
    const body = await readJson(request);
    const list = Array.isArray(body) ? body : [body];
    if (list.length === 0 || list.length > MAX_BATCH) {
      throw new ValidationError(`1 bis ${MAX_BATCH} Termine pro Anfrage`);
    }

    const created = list.map((item) => ({ id: crypto.randomUUID(), ...parseEventInput(item) }));
    const insert = env.DB.prepare(
      `INSERT INTO events (title, start_at, end_at, all_day, color, notes, template_id, series_id, member_id, id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    await env.DB.batch(created.map(({ id, ...input }) => bindEvent(insert, id, input)));

    return json(created, 201);
  });
